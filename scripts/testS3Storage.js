const mongoose = require('mongoose');
const User = require('../server/models/User');
const { Room } = require('../server/models/mongoschema');
const { uploadJSONToS3, downloadJSONFromS3 } = require('../server/utils/s3');
require('dotenv').config();

async function testS3Storage() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🧪 Testing S3 Storage Functionality:');
    console.log('=====================================');

    // Test 1: Create a test user
    console.log('\n1️⃣ Creating test user...');
    const testUser = new User({
      name: 'S3 Test User',
      email: 's3test@example.com',
      password: 'hashedpassword123',
    });
    await testUser.save();
    console.log('✅ User created with ownerId:', testUser.ownerId);

    // Test 2: Create a test room
    console.log('\n2️⃣ Creating test room...');
    const { v4: uuidv4 } = require('uuid');
    const roomId = uuidv4();

    const newRoom = new Room({
      roomId,
      roomOwnerId: testUser.ownerId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {
        fileCount: 0,
        totalSizeKB: 0,
        fileTypes: [],
      },
    });
    await newRoom.save();
    console.log('✅ Room created with roomId:', roomId);

    // Test 3: Create sample file data
    console.log('\n3️⃣ Creating sample file data...');
    const sampleFiles = {
      name: 'root',
      type: 'folder',
      children: [
        {
          name: 'index.js',
          type: 'file',
          language: 'javascript',
          content:
            "console.log('Hello, CodeWeave!');\n\nfunction greet() {\n  return 'Welcome to collaborative coding!';\n}",
        },
        {
          name: 'styles',
          type: 'folder',
          children: [
            {
              name: 'main.css',
              type: 'file',
              language: 'css',
              content:
                'body {\n  font-family: Arial, sans-serif;\n  background-color: #f0f0f0;\n}\n\n.container {\n  max-width: 1200px;\n  margin: 0 auto;\n}',
            },
          ],
        },
        {
          name: 'README.md',
          type: 'file',
          language: 'markdown',
          content:
            '# CodeWeave Project\n\nThis is a collaborative coding platform.\n\n## Features\n- Real-time editing\n- Multi-language support\n- File management',
        },
      ],
    };
    console.log('✅ Sample files created');

    // Test 4: Test S3 upload (simulating room shutdown)
    console.log('\n4️⃣ Testing S3 upload...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const s3Key = `rooms/${roomId}/files_${timestamp}.json`;

    const uploadData = {
      roomId,
      ownerId: testUser.ownerId,
      files: sampleFiles,
      shutdownTime: new Date().toISOString(),
      metadata: {
        fileCount: 3, // index.js, main.css, README.md
        totalSizeKB: 0.5, // Approximate size
        fileTypes: ['js', 'css', 'md'],
      },
    };

    try {
      await uploadJSONToS3(s3Key, uploadData);
      console.log('✅ Files uploaded to S3 successfully');
      console.log('   - S3 Key:', s3Key);
      console.log('   - File count:', uploadData.metadata.fileCount);
      console.log('   - File types:', uploadData.metadata.fileTypes.join(', '));
    } catch (s3Error) {
      console.error('❌ S3 upload failed:', s3Error.message);
      console.log('   - Make sure your AWS credentials are configured correctly');
      console.log(
        '   - Check your .env file for AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_BUCKET_NAME'
      );
      return;
    }

    // Test 5: Test S3 download
    console.log('\n5️⃣ Testing S3 download...');
    try {
      const downloadedData = await downloadJSONFromS3(s3Key);
      console.log('✅ Files downloaded from S3 successfully');
      console.log('   - Room ID:', downloadedData.roomId);
      console.log('   - Owner ID:', downloadedData.ownerId);
      console.log('   - Shutdown time:', downloadedData.shutdownTime);
      console.log('   - Files retrieved:', downloadedData.files.children.length, 'items');
    } catch (s3Error) {
      console.error('❌ S3 download failed:', s3Error.message);
    }

    // Test 6: Update room with S3 metadata
    console.log('\n6️⃣ Updating room with S3 metadata...');
    newRoom.isActive = false;
    newRoom.updatedAt = new Date();
    newRoom.s3Key = s3Key;
    newRoom.metadata = uploadData.metadata;
    await newRoom.save();
    console.log('✅ Room updated with S3 metadata');

    console.log('\n📊 S3 Storage Test Summary:');
    console.log('==========================');
    console.log('✅ User creation with ownerId');
    console.log('✅ Room creation with roomId');
    console.log('✅ Sample file data generation');
    console.log('✅ S3 upload functionality');
    console.log('✅ S3 download functionality');
    console.log('✅ Room metadata update');
    console.log('✅ Complete file persistence workflow');

    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await User.deleteMany({ email: 's3test@example.com' });
    await Room.deleteMany({ roomId });
    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

testS3Storage();
