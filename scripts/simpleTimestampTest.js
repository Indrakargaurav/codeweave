const http = require('http');

// Test the timestamp update API directly
const testTimestampUpdate = () => {
  const roomId = 'acc4a674-2930-4302-8f33-7cdb6d9c7ff8';
  const ownerId = '3f7cbdef-505b-488f-b79f-79c0e37988b8';

  const postData = JSON.stringify({ ownerId });

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: `/api/room/${roomId}/update-timestamp`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  console.log('🧪 Testing timestamp update API...');
  console.log(`📡 Making request to: ${options.method} ${options.path}`);
  console.log(`📤 Request body:`, { ownerId });

  const req = http.request(options, (res) => {
    console.log(`📥 Response status: ${res.statusCode}`);
    console.log(`📥 Response headers:`, res.headers);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        console.log(`✅ API Response:`, JSON.stringify(result, null, 2));

        if (result.room && result.room.updatedAt) {
          console.log(`🕐 Timestamp updated to: ${result.room.updatedAt}`);
        }
      } catch (error) {
        console.log(`📄 Raw response:`, data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Error testing timestamp update:', error);
  });

  req.write(postData);
  req.end();
};

// Test the room info API
const testRoomInfo = () => {
  const roomId = 'acc4a674-2930-4302-8f33-7cdb6d9c7ff8';
  const ownerId = '3f7cbdef-505b-488f-b79f-79c0e37988b8';

  const options = {
    hostname: 'localhost',
    port: 5000,
    path: `/api/room/${roomId}/info?ownerId=${ownerId}`,
    method: 'GET',
  };

  console.log('\n🔍 Testing room info API...');
  console.log(`📡 Making request to: ${options.method} ${options.path}`);

  const req = http.request(options, (res) => {
    console.log(`📥 Response status: ${res.statusCode}`);

    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        console.log(`✅ Room info:`, JSON.stringify(result, null, 2));

        if (result.room && result.room.updatedAt) {
          console.log(`🕐 Current timestamp: ${result.room.updatedAt}`);
        }
      } catch (error) {
        console.log(`📄 Raw response:`, data);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Error testing room info:', error);
  });

  req.end();
};

// Main test function
const runTests = () => {
  console.log('🧪 Simple Timestamp Update API Test');
  console.log('===================================');

  // First, get current room info
  testRoomInfo();

  // Wait a moment, then test timestamp update
  setTimeout(() => {
    testTimestampUpdate();

    // Wait a moment, then check room info again
    setTimeout(() => {
      testRoomInfo();
    }, 1000);
  }, 1000);
};

// Run the tests
if (require.main === module) {
  runTests();
}

module.exports = {
  testTimestampUpdate,
  testRoomInfo,
  runTests,
};
