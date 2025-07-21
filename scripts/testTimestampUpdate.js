const fetch = require('node-fetch');

// Test the timestamp update API directly
const testTimestampUpdate = async () => {
  const roomId = 'acc4a674-2930-4302-8f33-7cdb6d9c7ff8'; // Use the room ID from your logs
  const ownerId = '3f7cbdef-505b-488f-b79f-79c0e37988b8'; // Use the owner ID from your logs
  const apiUrl = 'http://localhost:5000';

  try {
    console.log('🧪 Testing timestamp update API...');
    console.log(`📡 Making request to: ${apiUrl}/api/room/${roomId}/update-timestamp`);
    console.log(`📤 Request body:`, { ownerId });

    const response = await fetch(`${apiUrl}/api/room/${roomId}/update-timestamp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ownerId }),
    });

    console.log(`📥 Response status:`, response.status);
    console.log(`📥 Response headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error: ${response.status} - ${errorText}`);
      return;
    }

    const result = await response.json();
    console.log(`✅ API Response:`, JSON.stringify(result, null, 2));

    if (result.room && result.room.updatedAt) {
      console.log(`🕐 Timestamp updated to: ${result.room.updatedAt}`);
    }
  } catch (error) {
    console.error('❌ Error testing timestamp update:', error);
  }
};

// Test the room info API to see current timestamp
const testRoomInfo = async () => {
  const roomId = 'acc4a674-2930-4302-8f33-7cdb6d9c7ff8';
  const ownerId = '3f7cbdef-505b-488f-b79f-79c0e37988b8';
  const apiUrl = 'http://localhost:5000';

  try {
    console.log('\n🔍 Testing room info API...');
    console.log(`📡 Making request to: ${apiUrl}/api/room/${roomId}/info?ownerId=${ownerId}`);

    const response = await fetch(`${apiUrl}/api/room/${roomId}/info?ownerId=${ownerId}`);

    console.log(`📥 Response status:`, response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error: ${response.status} - ${errorText}`);
      return;
    }

    const result = await response.json();
    console.log(`✅ Room info:`, JSON.stringify(result, null, 2));

    if (result.room && result.room.updatedAt) {
      console.log(`🕐 Current timestamp: ${result.room.updatedAt}`);
    }
  } catch (error) {
    console.error('❌ Error testing room info:', error);
  }
};

// Main test function
const runTests = async () => {
  console.log('🧪 Timestamp Update API Test');
  console.log('============================');

  // First, get current room info
  await testRoomInfo();

  // Wait a moment
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Then test timestamp update
  await testTimestampUpdate();

  // Wait a moment
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Check room info again to see if timestamp changed
  await testRoomInfo();
};

// Run the tests
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testTimestampUpdate,
  testRoomInfo,
  runTests,
};
