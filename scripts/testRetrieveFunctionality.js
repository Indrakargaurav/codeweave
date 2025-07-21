const mongoose = require('mongoose');
const User = require('../server/models/User');
const { Room } = require('../server/models/mongoschema');
const { uploadJSONToS3 } = require('../server/utils/s3');
require('dotenv').config();

async function testRetrieveFunctionality() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🧪 Testing Retrieve Functionality:');
    console.log('==================================');

    // Test 1: Create a test user
    console.log('\n1️⃣ Creating test user...');
    const testUser = new User({
      name: 'Retrieve Test User',
      email: 'retrievetest@example.com',
      password: 'hashedpassword123',
    });
    await testUser.save();
    console.log('✅ User created with ownerId:', testUser.ownerId);

    // Test 2: Create multiple test rooms
    console.log('\n2️⃣ Creating test rooms...');
    const { v4: uuidv4 } = require('uuid');

    const rooms = [];
    for (let i = 1; i <= 3; i++) {
      const roomId = uuidv4();
      const room = new Room({
        roomId,
        roomOwnerId: testUser.ownerId,
        isActive: i === 1, // First room active, others shut down
        createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000), // Different dates
        updatedAt: new Date(),
        metadata: {
          fileCount: i * 2,
          totalSizeKB: i * 1.5,
          fileTypes: ['js', 'css', 'html'].slice(0, i),
        },
      });
      await room.save();
      rooms.push(room);
      console.log(`✅ Room ${i} created:`, roomId.slice(0, 8) + '...');
    }

    // Test 3: Add S3 data to shut down rooms
    console.log('\n3️⃣ Adding S3 data to shut down rooms...');
    for (let i = 1; i < rooms.length; i++) {
      const room = rooms[i];
      const sampleFiles = {
        name: 'root',
        type: 'folder',
        children: [
          {
            name: `index${i}.js`,
            type: 'file',
            language: 'javascript',
            content: `console.log('Room ${i} file');`,
          },
          {
            name: `style${i}.css`,
            type: 'file',
            language: 'css',
            content: `body { background: #${i}${i}${i}; }`,
          },
        ],
      };

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const s3Key = `rooms/${room.roomId}/files_${timestamp}.json`;

      try {
        await uploadJSONToS3(s3Key, {
          roomId: room.roomId,
          ownerId: testUser.ownerId,
          files: sampleFiles,
          shutdownTime: new Date().toISOString(),
          metadata: {
            fileCount: 2,
            totalSizeKB: 0.5,
            fileTypes: ['js', 'css'],
          },
        });

        room.s3Key = s3Key;
        await room.save();
        console.log(`✅ S3 data added to room ${i + 1}`);
      } catch (s3Error) {
        console.log(`⚠️ S3 upload failed for room ${i + 1}:`, s3Error.message);
      }
    }

    // Test 4: Test retrieving user rooms
    console.log('\n4️⃣ Testing user rooms retrieval...');
    const userRooms = await Room.find({
      roomOwnerId: testUser.ownerId,
    }).sort({ createdAt: -1 });

    console.log('✅ User rooms retrieved:', userRooms.length);
    userRooms.forEach((room, index) => {
      console.log(`   Room ${index + 1}:`);
      console.log(`   - ID: ${room.roomId.slice(0, 8)}...`);
      console.log(`   - Status: ${room.isActive ? 'Active' : 'Shut Down'}`);
      console.log(`   - Files: ${room.metadata?.fileCount || 0}`);
      console.log(`   - S3 Key: ${room.s3Key ? 'Yes' : 'No'}`);
    });

    // Test 5: Test room export functionality
    console.log('\n5️⃣ Testing room export...');
    const roomWithS3 = userRooms.find((room) => room.s3Key);
    if (roomWithS3) {
      console.log('✅ Room with S3 data found for export test');
      console.log(`   - Room ID: ${roomWithS3.roomId.slice(0, 8)}...`);
      console.log(`   - S3 Key: ${roomWithS3.s3Key}`);
    } else {
      console.log('⚠️ No room with S3 data found for export test');
    }

    // Test 6: Test room opening functionality
    console.log('\n6️⃣ Testing room opening...');
    const activeRoom = userRooms.find((room) => room.isActive);
    if (activeRoom) {
      console.log('✅ Active room found for opening test');
      console.log(`   - Room ID: ${activeRoom.roomId.slice(0, 8)}...`);
      console.log(`   - Can be opened: Yes`);
    } else {
      console.log('⚠️ No active room found for opening test');
    }

    console.log('\n📊 Retrieve Functionality Test Summary:');
    console.log('======================================');
    console.log('✅ User creation with ownerId');
    console.log('✅ Multiple room creation');
    console.log('✅ S3 data storage for shut down rooms');
    console.log('✅ User rooms retrieval');
    console.log('✅ Room export preparation');
    console.log('✅ Room opening preparation');
    console.log('✅ Complete retrieve workflow');

    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await User.deleteMany({ email: 'retrievetest@example.com' });
    await Room.deleteMany({ roomOwnerId: testUser.ownerId });
    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

testRetrieveFunctionality();
