const AWS = require('aws-sdk');

// Configure AWS
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
});

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

// Function to list all rooms in S3
const listAllRooms = async () => {
  try {
    console.log('🔍 Listing all rooms in S3...');

    const listParams = {
      Bucket: BUCKET_NAME,
      Prefix: 'rooms/',
    };

    const listResult = await s3.listObjectsV2(listParams).promise();

    if (!listResult.Contents || listResult.Contents.length === 0) {
      console.log('❌ No rooms found in S3');
      return [];
    }

    // Group by room ID
    const rooms = {};
    listResult.Contents.forEach((obj) => {
      const key = obj.Key;
      const roomId = key.split('/')[1]; // rooms/roomId/file

      if (!rooms[roomId]) {
        rooms[roomId] = [];
      }
      rooms[roomId].push(obj);
    });

    console.log(`📄 Found ${Object.keys(rooms).length} rooms in S3`);
    return rooms;
  } catch (error) {
    console.error('❌ Error listing rooms:', error);
    return [];
  }
};

// Function to check if a file is JSON
const isJSONFile = async (key) => {
  try {
    const getParams = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    const fileData = await s3.getObject(getParams).promise();
    const content = fileData.Body.toString('utf-8');

    // Check if it looks like JSON
    return content.trim().startsWith('{') || content.trim().startsWith('[');
  } catch (error) {
    console.error(`❌ Error checking file ${key}:`, error);
    return false;
  }
};

// Function to delete a file from S3
const deleteFile = async (key) => {
  try {
    const deleteParams = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    await s3.deleteObject(deleteParams).promise();
    console.log(`🗑️  Deleted: ${key}`);
    return true;
  } catch (error) {
    console.error(`❌ Error deleting ${key}:`, error);
    return false;
  }
};

// Function to clean up old JSON files for a specific room
const cleanupRoom = async (roomId, files) => {
  console.log(`\n🧹 Cleaning up room: ${roomId}`);

  let deletedCount = 0;
  let keptCount = 0;

  for (const file of files) {
    const key = file.Key;

    // Skip folders
    if (key.endsWith('/')) {
      console.log(`📁 Skipping folder: ${key}`);
      continue;
    }

    // Check if it's a JSON file
    const isJSON = await isJSONFile(key);

    if (isJSON) {
      console.log(`⚠️  Found JSON file: ${key}`);

      // Ask user if they want to delete it
      if (process.argv.includes('--auto-delete')) {
        const deleted = await deleteFile(key);
        if (deleted) deletedCount++;
      } else {
        console.log(`   Would delete: ${key}`);
        deletedCount++;
      }
    } else {
      console.log(`✅ Keeping normal file: ${key}`);
      keptCount++;
    }
  }

  console.log(`📊 Room ${roomId}: ${deletedCount} JSON files, ${keptCount} normal files`);
  return { deletedCount, keptCount };
};

// Function to show preview of JSON files
const previewJSONFiles = async (roomId, files) => {
  console.log(`\n🔍 Preview of JSON files in room: ${roomId}`);

  for (const file of files) {
    const key = file.Key;

    if (key.endsWith('/')) continue;

    const isJSON = await isJSONFile(key);

    if (isJSON) {
      try {
        const getParams = {
          Bucket: BUCKET_NAME,
          Key: key,
        };

        const fileData = await s3.getObject(getParams).promise();
        const content = fileData.Body.toString('utf-8');

        console.log(`\n📄 ${key}:`);
        console.log(`   Size: ${content.length} characters`);
        console.log(`   Preview: ${content.substring(0, 200)}${content.length > 200 ? '...' : ''}`);

        // Try to parse JSON
        try {
          const jsonData = JSON.parse(content);
          console.log(`   JSON keys: ${Object.keys(jsonData).join(', ')}`);
        } catch (jsonError) {
          console.log(`   Invalid JSON`);
        }
      } catch (error) {
        console.log(`   Error reading file: ${error.message}`);
      }
    }
  }
};

// Main function
const main = async () => {
  const command = process.argv[2];

  if (!command) {
    console.log('Usage:');
    console.log(
      '  node cleanupOldJSON.js list                    - List all rooms and their files'
    );
    console.log('  node cleanupOldJSON.js preview <roomId>        - Preview JSON files in a room');
    console.log('  node cleanupOldJSON.js cleanup <roomId>        - Clean up JSON files in a room');
    console.log(
      '  node cleanupOldJSON.js cleanup-all --auto-delete - Clean up all JSON files (auto-delete)'
    );
    return;
  }

  console.log('🧹 S3 JSON Cleanup Tool');
  console.log('=======================');

  const rooms = await listAllRooms();

  if (command === 'list') {
    console.log('\n📋 All rooms:');
    Object.keys(rooms).forEach((roomId) => {
      const fileCount = rooms[roomId].length;
      console.log(`   ${roomId}: ${fileCount} files`);
    });
  } else if (command === 'preview') {
    const roomId = process.argv[3];
    if (!roomId) {
      console.log('❌ Room ID required for preview command');
      return;
    }

    if (!rooms[roomId]) {
      console.log(`❌ Room ${roomId} not found`);
      return;
    }

    await previewJSONFiles(roomId, rooms[roomId]);
  } else if (command === 'cleanup') {
    const roomId = process.argv[3];
    if (!roomId) {
      console.log('❌ Room ID required for cleanup command');
      return;
    }

    if (!rooms[roomId]) {
      console.log(`❌ Room ${roomId} not found`);
      return;
    }

    await cleanupRoom(roomId, rooms[roomId]);
  } else if (command === 'cleanup-all') {
    console.log('\n🧹 Cleaning up all rooms...');

    let totalDeleted = 0;
    let totalKept = 0;

    for (const roomId of Object.keys(rooms)) {
      const result = await cleanupRoom(roomId, rooms[roomId]);
      totalDeleted += result.deletedCount;
      totalKept += result.keptCount;
    }

    console.log(`\n📊 Summary: ${totalDeleted} JSON files deleted, ${totalKept} normal files kept`);
  } else {
    console.log('❌ Unknown command:', command);
  }
};

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  listAllRooms,
  cleanupRoom,
  previewJSONFiles,
};
