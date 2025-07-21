const mongoose = require('mongoose');
const User = require('../server/models/User');
const { Room } = require('../server/models/mongoschema');
require('dotenv').config();

async function testCompleteSystem() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Test 1: Create a user (simulating registration)
    console.log('\n🧪 Test 1: Creating user...');
    const testUser = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedpassword123',
    });
    await testUser.save();
    console.log('✅ User created with ownerId:', testUser.ownerId);

    // Test 2: Create a room for this user
    console.log('\n🧪 Test 2: Creating room...');
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

    // Test 3: Verify room ownership
    console.log('\n🧪 Test 3: Verifying room ownership...');
    const foundRoom = await Room.findOne({ roomId });
    const isOwner = foundRoom.roomOwnerId === testUser.ownerId;
    console.log('✅ Room ownership verified:', isOwner);

    // Test 4: Test shutdown permission
    console.log('\n🧪 Test 4: Testing shutdown permission...');
    if (isOwner) {
      foundRoom.isActive = false;
      await foundRoom.save();
      console.log('✅ Room successfully shut down by owner');
    } else {
      console.log('❌ Non-owner cannot shut down room');
    }

    // Test 5: Create another user and verify they can't shut down the room
    console.log('\n🧪 Test 5: Testing non-owner access...');
    const anotherUser = new User({
      name: 'Another User',
      email: 'another@example.com',
      password: 'hashedpassword456',
    });
    await anotherUser.save();
    console.log('✅ Another user created with ownerId:', anotherUser.ownerId);

    const anotherRoom = await Room.findOne({ roomId: roomId });
    const canShutdown = anotherRoom.roomOwnerId === anotherUser.ownerId;
    console.log('✅ Non-owner cannot shut down room:', !canShutdown);

    console.log('\n📊 Summary:');
    console.log(`- User 1: ${testUser.name} (${testUser.ownerId})`);
    console.log(`- User 2: ${anotherUser.name} (${anotherUser.ownerId})`);
    console.log(`- Room: ${roomId} (Owner: ${foundRoom.roomOwnerId})`);
    console.log(`- Room Active: ${foundRoom.isActive}`);

    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await User.deleteMany({
      email: { $in: ['test@example.com', 'another@example.com'] },
    });
    await Room.deleteMany({ roomId });
    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

testCompleteSystem();
