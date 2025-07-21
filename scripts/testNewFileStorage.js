const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
});

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

// Test file tree structure
const testFileTree = {
  name: 'root',
  type: 'folder',
  children: [
    {
      name: 'src',
      type: 'folder',
      children: [
        {
          name: 'index.js',
          type: 'file',
          content: "console.log('Hello World!');",
          language: 'javascript',
        },
        {
          name: 'utils',
          type: 'folder',
          children: [
            {
              name: 'helper.js',
              type: 'file',
              content: "function helper() { return 'helper function'; }",
              language: 'javascript',
            },
          ],
        },
      ],
    },
    {
      name: 'package.json',
      type: 'file',
      content: '{"name": "test-project", "version": "1.0.0"}',
      language: 'json',
    },
    {
      name: 'README.md',
      type: 'file',
      content: '# Test Project\n\nThis is a test project.',
      language: 'markdown',
    },
  ],
};

// Extract files from tree
const extractFilesFromTree = (node, currentPath = '') => {
  const files = [];

  if (node.type === 'file') {
    files.push({
      path: currentPath + node.name,
      content: node.content,
    });
  } else if (node.type === 'folder' && node.children) {
    node.children.forEach((child) => {
      const childPath = currentPath + node.name + '/';
      files.push(...extractFilesFromTree(child, childPath));
    });
  }

  return files;
};

// Get content type based on file extension
const getContentType = (filePath) => {
  const ext = filePath.split('.').pop().toLowerCase();
  const contentTypes = {
    js: 'application/javascript',
    jsx: 'application/javascript',
    ts: 'application/typescript',
    tsx: 'application/typescript',
    py: 'text/x-python',
    java: 'text/x-java-source',
    cpp: 'text/x-c++src',
    c: 'text/x-csrc',
    html: 'text/html',
    css: 'text/css',
    json: 'application/json',
    md: 'text/markdown',
    txt: 'text/plain',
    xml: 'application/xml',
    yml: 'text/yaml',
    yaml: 'text/yaml',
  };

  return contentTypes[ext] || 'text/plain';
};

// Test uploading individual files
const testUploadIndividualFiles = async (roomId, fileTree) => {
  console.log(`\n📤 Testing upload of individual files for room ${roomId}...`);

  // Extract all files from the tree
  const files = extractFilesFromTree(fileTree);
  console.log(`📄 Found ${files.length} files to upload`);

  // Upload each file individually to S3
  const uploadPromises = files.map(async (file) => {
    const s3Key = `rooms/${roomId}/${file.path}`;
    console.log(`📤 Uploading: ${s3Key}`);

    const params = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: file.content,
      ContentType: getContentType(file.path),
    };

    return s3.upload(params).promise();
  });

  // Wait for all uploads to complete
  const results = await Promise.all(uploadPromises);
  console.log(`✅ Successfully uploaded ${results.length} files to S3`);

  return results;
};

// Test downloading entire folder
const testDownloadFolder = async (roomId) => {
  console.log(`\n📥 Testing download of entire folder for room ${roomId}...`);

  // List all objects in the room folder
  const listParams = {
    Bucket: BUCKET_NAME,
    Prefix: `rooms/${roomId}/`,
  };

  const listResult = await s3.listObjectsV2(listParams).promise();

  if (!listResult.Contents || listResult.Contents.length === 0) {
    console.log(`❌ No files found for room ${roomId}`);
    return null;
  }

  console.log(`📄 Found ${listResult.Contents.length} files in S3`);

  // Download each file
  const downloadPromises = listResult.Contents.map(async (object) => {
    const key = object.Key;

    // Skip the folder itself
    if (key.endsWith('/')) return null;

    console.log(`📥 Downloading: ${key}`);

    const getParams = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    const fileData = await s3.getObject(getParams).promise();

    // Extract relative path from S3 key
    const relativePath = key.replace(`rooms/${roomId}/`, '');

    return {
      path: relativePath,
      content: fileData.Body.toString('utf-8'),
    };
  });

  const files = (await Promise.all(downloadPromises)).filter((f) => f !== null);
  console.log(`📄 Downloaded ${files.length} files from S3`);

  return files;
};

// Test creating ZIP from downloaded files
const testCreateZIP = async (files, roomId) => {
  console.log(`\n📦 Testing ZIP creation for room ${roomId}...`);

  const JSZip = require('jszip');
  const zip = new JSZip();

  // Add files to ZIP
  files.forEach((file) => {
    console.log(`📝 Adding to ZIP: ${file.path}`);
    zip.file(file.path, file.content);
  });

  // Generate ZIP buffer
  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 6,
    },
  });

  console.log(`✅ ZIP created, size: ${zipBuffer.length} bytes`);
  return zipBuffer;
};

// Main test function
const runTest = async () => {
  try {
    console.log('🧪 Testing new file storage system...');

    const roomId = uuidv4();
    console.log(`📝 Generated test room ID: ${roomId}`);

    // Test 1: Upload individual files
    await testUploadIndividualFiles(roomId, testFileTree);

    // Test 2: Download entire folder
    const downloadedFiles = await testDownloadFolder(roomId);

    if (downloadedFiles) {
      // Test 3: Create ZIP from downloaded files
      const zipBuffer = await testCreateZIP(downloadedFiles, roomId);

      // Test 4: Verify file contents
      console.log('\n🔍 Verifying file contents...');
      const originalFiles = extractFilesFromTree(testFileTree);

      originalFiles.forEach((originalFile) => {
        const downloadedFile = downloadedFiles.find((f) => f.path === originalFile.path);
        if (downloadedFile) {
          const match = originalFile.content === downloadedFile.content;
          console.log(
            `${match ? '✅' : '❌'} ${originalFile.path}: ${match ? 'MATCH' : 'MISMATCH'}`
          );
        } else {
          console.log(`❌ ${originalFile.path}: NOT FOUND`);
        }
      });

      console.log('\n🎉 All tests completed successfully!');
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Run the test
if (require.main === module) {
  runTest();
}

module.exports = {
  testUploadIndividualFiles,
  testDownloadFolder,
  testCreateZIP,
  runTest,
};
