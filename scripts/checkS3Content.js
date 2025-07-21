const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
});

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

// Function to list all objects in a room folder
const listRoomFiles = async (roomId) => {
  try {
    console.log(`🔍 Checking S3 content for room: ${roomId}`);

    const listParams = {
      Bucket: BUCKET_NAME,
      Prefix: `rooms/${roomId}/`,
    };

    const listResult = await s3.listObjectsV2(listParams).promise();

    if (!listResult.Contents || listResult.Contents.length === 0) {
      console.log(`❌ No files found for room ${roomId}`);
      return [];
    }

    console.log(`📄 Found ${listResult.Contents.length} objects in S3:`);

    for (const object of listResult.Contents) {
      const key = object.Key;
      console.log(`   📁 ${key} (${object.Size} bytes)`);

      // If it's a file (not a folder), show first few characters
      if (!key.endsWith('/') && object.Size > 0) {
        try {
          const getParams = {
            Bucket: BUCKET_NAME,
            Key: key,
          };

          const fileData = await s3.getObject(getParams).promise();
          const content = fileData.Body.toString('utf-8');
          const preview = content.substring(0, 100);

          console.log(`      Preview: ${preview}${content.length > 100 ? '...' : ''}`);

          // Check if it looks like JSON
          if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
            console.log(`      ⚠️  This looks like JSON data!`);
          }
        } catch (error) {
          console.log(`      ❌ Error reading file: ${error.message}`);
        }
      }
    }

    return listResult.Contents;
  } catch (error) {
    console.error('❌ Error listing room files:', error);
    return [];
  }
};

// Function to download and check a specific file
const checkFileContent = async (roomId, fileName) => {
  try {
    const key = `rooms/${roomId}/${fileName}`;
    console.log(`\n📥 Checking file: ${key}`);

    const getParams = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    const fileData = await s3.getObject(getParams).promise();
    const content = fileData.Body.toString('utf-8');

    console.log(`📄 File size: ${content.length} characters`);
    console.log(`📄 First 200 characters:`);
    console.log(content.substring(0, 200));

    if (content.length > 200) {
      console.log('...');
    }

    // Try to parse as JSON
    try {
      const jsonData = JSON.parse(content);
      console.log(`✅ File is valid JSON with keys:`, Object.keys(jsonData));
    } catch (jsonError) {
      console.log(`❌ File is not valid JSON`);
    }
  } catch (error) {
    console.error('❌ Error reading file:', error);
  }
};

// Main function
const main = async () => {
  const roomId = process.argv[2];

  if (!roomId) {
    console.log('Usage: node checkS3Content.js <roomId>');
    console.log('Example: node checkS3Content.js 123e4567-e89b-12d3-a456-426614174000');
    return;
  }

  console.log('🔍 S3 Content Checker');
  console.log('====================');

  await listRoomFiles(roomId);

  // If you want to check a specific file, uncomment this:
  // await checkFileContent(roomId, 'files.json');
};

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  listRoomFiles,
  checkFileContent,
};
