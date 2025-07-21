const mongoose = require('mongoose');
const User = require('../server/models/User');
require('dotenv').config();

async function testAuth() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Test 1: Create a manual user
    console.log('\n🧪 Test 1: Creating manual user...');
    const manualUser = new User({
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedpassword123',
    });
    await manualUser.save();
    console.log('✅ Manual user created with ownerId:', manualUser.ownerId);

    // Test 2: Create a Google OAuth user
    console.log('\n🧪 Test 2: Creating Google OAuth user...');
    const googleUser = new User({
      name: 'Google User',
      email: 'google@example.com',
      googleId: 'google123456',
    });
    await googleUser.save();
    console.log('✅ Google user created with ownerId:', googleUser.ownerId);

    // Test 3: Create a GitHub OAuth user
    console.log('\n🧪 Test 3: Creating GitHub OAuth user...');
    const githubUser = new User({
      name: 'GitHub User',
      email: 'github@example.com',
      githubId: 'github789012',
    });
    await githubUser.save();
    console.log('✅ GitHub user created with ownerId:', githubUser.ownerId);

    // Test 4: Verify all users have unique ownerIds
    console.log('\n🧪 Test 4: Verifying unique ownerIds...');
    const allUsers = await User.find({});
    const ownerIds = allUsers.map((user) => user.ownerId);
    const uniqueOwnerIds = new Set(ownerIds);

    if (ownerIds.length === uniqueOwnerIds.size) {
      console.log('✅ All ownerIds are unique!');
    } else {
      console.log('❌ Duplicate ownerIds found!');
    }

    console.log('\n📊 Summary:');
    allUsers.forEach((user) => {
      console.log(`- ${user.name} (${user.email}): ${user.ownerId}`);
    });

    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await User.deleteMany({
      email: { $in: ['test@example.com', 'google@example.com', 'github@example.com'] },
    });
    console.log('✅ Test data cleaned up');
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
  }
}

testAuth();
