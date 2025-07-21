const AWS = require('aws-sdk');
const JSZip = require('jszip');

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

/**
 * Recursively extracts all files from the file tree structure
 * @param {Object} node - File tree node
 * @param {String} currentPath - Current path in the tree
 * @returns {Array} Array of {path, content} objects
 */
const extractFilesFromTree = (node, currentPath = '') => {
  const files = [];

  if (node.type === 'file') {
    files.push({
      path: currentPath + node.name,
      content: node.content || '',
    });
  } else if (node.type === 'folder' && node.children) {
    // Skip the root folder name, but include other folder names
    const folderName = node.name === 'root' ? '' : node.name + '/';
    const childPath = currentPath + folderName;

    // Recursively process children
    node.children.forEach((child) => {
      files.push(...extractFilesFromTree(child, childPath));
    });
  }

  return files;
};

/**
 * Uploads room files as individual files to S3 (not as ZIP)
 * @param {String} roomId - Room ID
 * @param {Object} fileTree - File tree structure
 */
const uploadRoomFilesToS3 = async (roomId, fileTree) => {
  console.log(`\n🔄 === S3 UPLOAD OPERATION START ===`);
  console.log(`📤 Room ID: ${roomId}`);
  console.log(`📁 File Tree:`, JSON.stringify(fileTree, null, 2));

  // First, delete all existing files for this room
  try {
    console.log(`\n🗑️  STEP 1: DELETING EXISTING FILES`);
    console.log(`🔍 Searching for files in: rooms/${roomId}/`);

    const listParams = {
      Bucket: BUCKET_NAME,
      Prefix: `rooms/${roomId}/`,
    };

    const listResult = await s3.listObjectsV2(listParams).promise();

    if (listResult.Contents && listResult.Contents.length > 0) {
      console.log(`🗑️  Found ${listResult.Contents.length} existing files to delete:`);
      listResult.Contents.forEach((obj) => {
        console.log(`   - ${obj.Key}`);
      });

      const deleteParams = {
        Bucket: BUCKET_NAME,
        Delete: {
          Objects: listResult.Contents.map((obj) => ({ Key: obj.Key })),
        },
      };

      const deleteResult = await s3.deleteObjects(deleteParams).promise();
      console.log(`✅ Successfully deleted ${deleteResult.Deleted.length} files`);

      if (deleteResult.Errors && deleteResult.Errors.length > 0) {
        console.error(`❌ Errors during deletion:`, deleteResult.Errors);
      }
    } else {
      console.log(`🗑️  No existing files found to delete`);
    }
  } catch (error) {
    console.error(`❌ Error deleting existing files:`, error);
    // Continue with upload even if delete fails
  }

  // Extract all files from the tree
  console.log(`\n📄 STEP 2: EXTRACTING FILES FROM TREE`);
  const files = extractFilesFromTree(fileTree);
  console.log(`📄 Found ${files.length} files to upload:`);
  files.forEach((file) => {
    console.log(`   - ${file.path} (${file.content.length} chars)`);
  });

  if (files.length === 0) {
    console.log(`⚠️  No files to upload - this will result in an empty room`);
  }

  // Upload each file individually to S3
  console.log(`\n📤 STEP 3: UPLOADING FILES TO S3`);
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
  console.log(`\n✅ STEP 4: UPLOAD COMPLETE`);
  console.log(`✅ Successfully uploaded ${results.length} files to S3`);
  results.forEach((result) => {
    console.log(`   - ${result.Key}`);
  });

  console.log(`🔄 === S3 UPLOAD OPERATION END ===\n`);
  return results;
};

/**
 * Get content type based on file extension
 * @param {String} filePath - File path
 * @returns {String} Content type
 */
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

/**
 * Downloads room files from S3 as individual files and builds file tree
 * @param {String} roomId - Room ID
 * @returns {Object} File tree structure
 */
const downloadRoomFilesFromS3 = async (roomId) => {
  try {
    console.log(`\n📥 === S3 DOWNLOAD OPERATION START ===`);
    console.log(`📥 Room ID: ${roomId}`);

    // List all objects in the room folder
    const listParams = {
      Bucket: BUCKET_NAME,
      Prefix: `rooms/${roomId}/`,
    };

    console.log(`🔍 Searching for files in: rooms/${roomId}/`);
    const listResult = await s3.listObjectsV2(listParams).promise();

    if (!listResult.Contents || listResult.Contents.length === 0) {
      console.log(`❌ No files found for room ${roomId}`);
      console.log(`📥 === S3 DOWNLOAD OPERATION END (EMPTY) ===\n`);
      return {
        name: 'root',
        type: 'folder',
        children: [],
      };
    }

    console.log(`📄 Found ${listResult.Contents.length} files in S3:`);
    listResult.Contents.forEach((obj) => {
      console.log(`   - ${obj.Key}`);
    });

    // Download each file
    console.log(`\n📥 STEP 1: DOWNLOADING FILES`);
    const filePromises = listResult.Contents.map(async (object) => {
      const key = object.Key;

      // Skip the folder itself
      if (key.endsWith('/')) {
        console.log(`⏭️  Skipping folder: ${key}`);
        return null;
      }

      console.log(`📥 Downloading: ${key}`);

      const getParams = {
        Bucket: BUCKET_NAME,
        Key: key,
      };

      const fileData = await s3.getObject(getParams).promise();

      // Extract relative path from S3 key
      const relativePath = key.replace(`rooms/${roomId}/`, '');

      const content = fileData.Body.toString('utf-8');

      // Check if this looks like a JSON file (old data)
      if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
        console.log(`⚠️  WARNING: ${relativePath} looks like JSON data! Skipping...`);
        return null;
      }

      console.log(`✅ Downloaded: ${relativePath} (${content.length} chars)`);
      return {
        path: relativePath,
        content: content,
      };
    });

    const files = (await Promise.all(filePromises)).filter((f) => f !== null);
    console.log(`\n📄 STEP 2: PROCESSING FILES`);
    console.log(`📄 Successfully downloaded ${files.length} files:`);
    files.forEach((file) => {
      console.log(`   - ${file.path} (${file.content.length} chars)`);
    });

    // Build file tree from files
    console.log(`\n🌳 STEP 3: BUILDING FILE TREE`);
    const fileTree = {
      name: 'root',
      type: 'folder',
      children: [],
    };

    files.forEach((file) => {
      const pathParts = file.path.split('/');
      let currentLevel = fileTree.children;

      // Create folders if they don't exist
      for (let i = 0; i < pathParts.length - 1; i++) {
        const folderName = pathParts[i];
        let folder = currentLevel.find(
          (item) => item.name === folderName && item.type === 'folder'
        );

        if (!folder) {
          folder = {
            name: folderName,
            type: 'folder',
            children: [],
          };
          currentLevel.push(folder);
          console.log(`📁 Created folder: ${folderName}`);
        }

        currentLevel = folder.children;
      }

      // Add file
      const fileName = pathParts[pathParts.length - 1];
      const ext = fileName.split('.').pop();
      const languageMap = {
        js: 'javascript',
        py: 'python',
        java: 'java',
        cpp: 'cpp',
        html: 'html',
        css: 'css',
        json: 'json',
        md: 'markdown',
        txt: 'plaintext',
      };

      const fileNode = {
        name: fileName,
        type: 'file',
        language: languageMap[ext] || 'plaintext',
        content: file.content,
      };

      currentLevel.push(fileNode);
      console.log(`📄 Added file: ${fileName}`);
    });

    console.log(`\n✅ STEP 4: FILE TREE BUILT`);
    console.log(`🌳 Final file tree:`, JSON.stringify(fileTree, null, 2));
    console.log(`📥 === S3 DOWNLOAD OPERATION END ===\n`);

    return fileTree;
  } catch (err) {
    console.error('❌ Error downloading room files:', err);
    throw err;
  }
};

/**
 * Creates a ZIP buffer for export
 * @param {Object} fileTree - File tree structure
 * @returns {Buffer} ZIP buffer
 */
const createExportZip = async (fileTree) => {
  const zip = new JSZip();

  console.log('📦 Creating ZIP from file tree:', JSON.stringify(fileTree, null, 2));

  // Extract all files from the tree
  const files = extractFilesFromTree(fileTree);
  console.log(
    '📄 Extracted files:',
    files.map((f) => f.path)
  );

  // Add files to ZIP
  files.forEach((file) => {
    console.log(`📝 Adding file to ZIP: ${file.path} (${file.content.length} chars)`);
    zip.file(file.path, file.content);
  });

  // Generate ZIP buffer with proper compression
  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 6,
    },
  });

  console.log(`✅ ZIP generated, size: ${zipBuffer.length} bytes`);
  return zipBuffer;
};

/**
 * Downloads entire room folder from S3 and creates ZIP for export
 * @param {String} roomId - Room ID
 * @returns {Buffer} ZIP buffer
 */
const downloadRoomFolderForExport = async (roomId) => {
  try {
    console.log(`📥 Downloading entire folder from S3 for room ${roomId} export...`);

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

    console.log(`📄 Found ${listResult.Contents.length} files in S3 for export`);

    // Log all found objects
    listResult.Contents.forEach((obj) => {
      console.log(`   📁 Found: ${obj.Key} (${obj.Size} bytes)`);
    });

    // Create ZIP
    const zip = new JSZip();

    // Download each file and add to ZIP
    const downloadPromises = listResult.Contents.map(async (object) => {
      const key = object.Key;

      // Skip the folder itself
      if (key.endsWith('/')) return;

      console.log(`📥 Downloading for export: ${key}`);

      const getParams = {
        Bucket: BUCKET_NAME,
        Key: key,
      };

      const fileData = await s3.getObject(getParams).promise();

      // Extract relative path from S3 key
      const relativePath = key.replace(`rooms/${roomId}/`, '');

      // Check if this looks like a JSON file (old data)
      const content = fileData.Body.toString('utf-8');
      if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
        console.log(`⚠️  WARNING: ${relativePath} looks like JSON data! Skipping...`);
        return;
      }

      // Add file to ZIP
      console.log(`📝 Adding to ZIP: ${relativePath} (${fileData.Body.length} bytes)`);
      zip.file(relativePath, fileData.Body);
    });

    await Promise.all(downloadPromises);

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6,
      },
    });

    console.log(
      `✅ Successfully created export ZIP for room ${roomId}, size: ${zipBuffer.length} bytes`
    );
    return zipBuffer;
  } catch (error) {
    console.error(`❌ Error downloading folder for export:`, error);
    throw error;
  }
};

/**
 * Downloads a JSON file from S3 (fallback for old data)
 * @param {String} key - The file path in S3
 */
const downloadJSONFromS3 = async (key) => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
  };

  const response = await s3.getObject(params).promise();
  return JSON.parse(response.Body.toString('utf-8'));
};

/**
 * Deletes all files in a room's S3 folder
 * @param {String} roomId - Room ID
 */
const deleteRoomFromS3 = async (roomId) => {
  const listParams = {
    Bucket: BUCKET_NAME,
    Prefix: `rooms/${roomId}/`,
  };
  const listedObjects = await s3.listObjectsV2(listParams).promise();
  if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
    return;
  }
  const deleteParams = {
    Bucket: BUCKET_NAME,
    Delete: { Objects: listedObjects.Contents.map((obj) => ({ Key: obj.Key })) },
  };
  await s3.deleteObjects(deleteParams).promise();
};

module.exports = {
  uploadRoomFilesToS3,
  downloadRoomFilesFromS3,
  downloadRoomFolderForExport,
  createExportZip,
  extractFilesFromTree,
  downloadJSONFromS3,
  deleteRoomFromS3,
};
