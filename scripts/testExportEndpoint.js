const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

async function testExportEndpoint() {
  console.log('🧪 Testing Export Endpoint:');
  console.log('===========================');

  try {
    // First, let's get a list of rooms to test with
    console.log('\n1️⃣ Getting user rooms...');
    const roomsResponse = await fetch('http://localhost:5000/api/room/user/test-owner-id-123');

    if (!roomsResponse.ok) {
      console.log('⚠️ No rooms found, creating a test room first...');

      // Create a test room
      const createResponse = await fetch('http://localhost:5000/api/room/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ownerId: 'test-owner-id-123',
        }),
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create test room');
      }

      const createData = await createResponse.json();
      console.log('✅ Test room created:', createData.room.roomId);

      // Shut down the room with some test files
      const shutdownResponse = await fetch(
        `http://localhost:5000/api/room/${createData.room.roomId}/shutdown`,
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
                  name: 'main.java',
                  type: 'file',
                  content:
                    'public class Main { public static void main(String[] args) { System.out.println("Hello!"); } }',
                  language: 'java',
                },
                {
                  name: 'test.py',
                  type: 'file',
                  content: "print('Hello from Python!')",
                  language: 'python',
                },
              ],
            },
          }),
        }
      );

      if (!shutdownResponse.ok) {
        throw new Error('Failed to shut down test room');
      }

      console.log('✅ Test room shut down with files');
    }

    // Now get the rooms again
    const roomsResponse2 = await fetch('http://localhost:5000/api/room/user/test-owner-id-123');
    const roomsData = await roomsResponse2.json();

    if (roomsData.rooms.length === 0) {
      throw new Error('No rooms available for testing');
    }

    const testRoom = roomsData.rooms[0];
    console.log('✅ Found room for testing:', testRoom.roomId);

    // Test the export endpoint
    console.log('\n2️⃣ Testing export endpoint...');
    const exportResponse = await fetch(
      `http://localhost:5000/api/room/${testRoom.roomId}/export?ownerId=test-owner-id-123`
    );

    console.log('📊 Response status:', exportResponse.status);
    console.log('📊 Response headers:');
    exportResponse.headers.forEach((value, key) => {
      console.log(`   ${key}: ${value}`);
    });

    if (!exportResponse.ok) {
      const errorText = await exportResponse.text();
      console.log('❌ Export failed:', errorText);
      return;
    }

    // Get the response as buffer
    const buffer = await exportResponse.buffer();
    console.log('📦 Response size:', buffer.length, 'bytes');

    // Check the first few bytes to see if it's a valid ZIP
    const header = buffer.slice(0, 4);
    console.log('🔍 Response header (hex):', header.toString('hex'));

    if (header.toString('hex') === '504b0304') {
      console.log('✅ Valid ZIP header detected!');
    } else {
      console.log('❌ Invalid ZIP header - might be JSON or other format');
      console.log('🔍 First 100 characters:', buffer.toString('utf8').substring(0, 100));
    }

    // Save the response to a file for inspection
    const outputPath = path.join(__dirname, 'export-test-response.zip');
    fs.writeFileSync(outputPath, buffer);
    console.log('💾 Response saved to:', outputPath);

    // Try to read it as text to see if it's JSON
    try {
      const textContent = buffer.toString('utf8');
      if (textContent.startsWith('{') || textContent.startsWith('[')) {
        console.log('⚠️ Response appears to be JSON, not ZIP!');
        console.log('📄 JSON content:', textContent.substring(0, 200) + '...');
      }
    } catch (e) {
      console.log('✅ Response is binary (good for ZIP)');
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testExportEndpoint();
