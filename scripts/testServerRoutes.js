const fetch = require('node-fetch');

async function testServerRoutes() {
  const baseUrl = 'http://localhost:5000';

  console.log('🧪 Testing Server Routes:');
  console.log('=========================');

  try {
    // Test 1: Check if server is running
    console.log('\n1️⃣ Testing server connection...');
    const healthResponse = await fetch(`${baseUrl}/`);
    if (healthResponse.ok) {
      console.log('✅ Server is running');
    } else {
      console.log('❌ Server not responding');
      return;
    }

    // Test 2: Test room creation
    console.log('\n2️⃣ Testing room creation...');
    const createResponse = await fetch(`${baseUrl}/api/room/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ownerId: 'test-owner-id-123',
      }),
    });

    if (createResponse.ok) {
      const createData = await createResponse.json();
      console.log('✅ Room creation working');
      console.log('   Room ID:', createData.room.roomId);

      // Test 3: Test room shutdown
      console.log('\n3️⃣ Testing room shutdown...');
      const shutdownResponse = await fetch(
        `${baseUrl}/api/room/${createData.room.roomId}/shutdown`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ownerId: 'test-owner-id-123',
            files: {
              name: 'root',
              type: 'folder',
              children: [
                {
                  name: 'test.js',
                  type: 'file',
                  content: "console.log('test');",
                },
              ],
            },
          }),
        }
      );

      if (shutdownResponse.ok) {
        const shutdownData = await shutdownResponse.json();
        console.log('✅ Room shutdown working');
        console.log('   S3 Key:', shutdownData.s3Key);
      } else {
        const error = await shutdownResponse.json();
        console.log('❌ Room shutdown failed:', error.error);
      }

      // Test 4: Test room retrieval
      console.log('\n4️⃣ Testing room retrieval...');
      const retrieveResponse = await fetch(`${baseUrl}/api/room/user/test-owner-id-123`);

      if (retrieveResponse.ok) {
        const retrieveData = await retrieveResponse.json();
        console.log('✅ Room retrieval working');
        console.log('   Rooms found:', retrieveData.rooms.length);
      } else {
        const error = await retrieveResponse.json();
        console.log('❌ Room retrieval failed:', error.error);
      }
    } else {
      const error = await createResponse.json();
      console.log('❌ Room creation failed:', error.error);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testServerRoutes();
