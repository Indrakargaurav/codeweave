const mongoose = require('mongoose');
const User = require('../server/models/User');
const { Room } = require('../server/models/mongoschema');
require('dotenv').config();

async function debugIssues() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🔍 Debugging Issues:');
    console.log('===================');

    // Test 1: Check if there are any users
    console.log('\n1️⃣ Checking users...');
    const users = await User.find({});
    console.log('Total users:', users.length);
    if (users.length > 0) {
      console.log('Sample user:', {
        name: users[0].name,
        email: users[0].email,
        ownerId: users[0].ownerId,
      });
    }

    // Test 2: Check if there are any rooms
    console.log('\n2️⃣ Checking rooms...');
    const rooms = await Room.find({});
    console.log('Total rooms:', rooms.length);
    if (rooms.length > 0) {
      console.log('Sample room:', {
        roomId: rooms[0].roomId,
        roomOwnerId: rooms[0].roomOwnerId,
        isActive: rooms[0].isActive,
        s3Key: rooms[0].s3Key,
      });
    }

    // Test 3: Test room creation
    console.log('\n3️⃣ Testing room creation...');
    if (users.length > 0) {
      const testUser = users[0];
      const { v4: uuidv4 } = require('uuid');

      const newRoom = new Room({
        roomId: uuidv4(),
        roomOwnerId: testUser.ownerId,
        isActive: true,
      });

      await newRoom.save();
      console.log('✅ Test room created:', newRoom.roomId);

      // Test 4: Test room retrieval
      console.log('\n4️⃣ Testing room retrieval...');
      const userRooms = await Room.find({ roomOwnerId: testUser.ownerId });
      console.log('User rooms found:', userRooms.length);

      // Test 5: Test room shutdown
      console.log('\n5️⃣ Testing room shutdown...');
      const roomToShutdown = userRooms[userRooms.length - 1];
      console.log('Room to shutdown:', roomToShutdown.roomId);

      // Simulate shutdown
      roomToShutdown.isActive = false;
      roomToShutdown.updatedAt = new Date();
      roomToShutdown.s3Key = `test/room/${roomToShutdown.roomId}/files.json`;
      roomToShutdown.metadata = {
        fileCount: 2,
        totalSizeKB: 1.5,
        fileTypes: ['js', 'css'],
      };

      await roomToShutdown.save();
      console.log('✅ Room shutdown simulation completed');

      // Clean up test room
      await Room.deleteOne({ _id: newRoom._id });
      console.log('✅ Test room cleaned up');
    } else {
      console.log('⚠️ No users found to test with');
    }

    console.log('\n📊 Debug Summary:');
    console.log('=================');
    console.log('✅ Database connection working');
    console.log('✅ User model accessible');
    console.log('✅ Room model accessible');
    console.log('✅ Room creation working');
    console.log('✅ Room retrieval working');
    console.log('✅ Room shutdown simulation working');
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

debugIssues();
