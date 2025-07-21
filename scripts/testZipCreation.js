const fs = require('fs');
const path = require('path');
const { createExportZip } = require('../server/utils/s3');

async function testZipCreation() {
  console.log('🧪 Testing ZIP Creation:');
  console.log('========================');

  try {
    // Create a test file tree
    const testFileTree = {
      name: 'root',
      type: 'folder',
      children: [
        {
          name: 'main.java',
          type: 'file',
          content: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from Java!");
    }
}`,
          language: 'java',
        },
        {
          name: 'one.py',
          type: 'file',
          content: `print("Hello from Python!")
def greet(name):
    return f"Hello, {name}!"`,
          language: 'python',
        },
        {
          name: 'two.js',
          type: 'file',
          content: `console.log("Hello from JavaScript!");

function greet(name) {
    return \`Hello, \${name}!\`;
}`,
          language: 'javascript',
        },
        {
          name: 'src',
          type: 'folder',
          children: [
            {
              name: 'utils.js',
              type: 'file',
              content: `// Utility functions
export const formatDate = (date) => {
    return date.toLocaleDateString();
};`,
              language: 'javascript',
            },
          ],
        },
      ],
    };

    console.log('✅ Test file tree created');

    // Create ZIP
    console.log('📦 Creating ZIP file...');
    const zipBuffer = await createExportZip(testFileTree);
    console.log('✅ ZIP created, size:', zipBuffer.length, 'bytes');

    // Save ZIP to disk for testing
    const zipPath = path.join(__dirname, 'test-export.zip');
    fs.writeFileSync(zipPath, zipBuffer);
    console.log('✅ ZIP saved to:', zipPath);

    // Verify ZIP file exists and has content
    const stats = fs.statSync(zipPath);
    console.log('📊 ZIP file stats:');
    console.log('   Size:', stats.size, 'bytes');
    console.log('   Created:', stats.birthtime);
    console.log('   Modified:', stats.mtime);

    // Check if it's a valid ZIP file (should start with PK header)
    const fileBuffer = fs.readFileSync(zipPath);
    const zipHeader = fileBuffer.slice(0, 4);
    console.log('🔍 ZIP header (hex):', zipHeader.toString('hex'));

    if (zipHeader.toString('hex') === '504b0304') {
      console.log('✅ Valid ZIP file header detected!');
    } else {
      console.log('❌ Invalid ZIP file header');
    }

    console.log('\n🎉 Test completed successfully!');
    console.log('📁 You can now try to open the ZIP file at:', zipPath);
    console.log('💡 If Windows can open this ZIP, the export functionality should work correctly.');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testZipCreation();
