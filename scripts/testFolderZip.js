const { createFolderZip } = require('../server/utils/folderExport');
const fs = require('fs');
const path = require('path');

async function testFolderZip() {
  console.log('🧪 Testing Folder ZIP Creation:');
  console.log('===============================');

  try {
    // Create a test file tree with nested folders
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
            {
              name: 'components',
              type: 'folder',
              children: [
                {
                  name: 'Button.jsx',
                  type: 'file',
                  content: `import React from 'react';

const Button = ({ children, onClick }) => {
  return (
    <button onClick={onClick}>
      {children}
    </button>
  );
};

export default Button;`,
                  language: 'javascript',
                },
              ],
            },
          ],
        },
        {
          name: 'styles',
          type: 'folder',
          children: [
            {
              name: 'main.css',
              type: 'file',
              content: `body {
  margin: 0;
  padding: 0;
  font-family: Arial, sans-serif;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}`,
              language: 'css',
            },
          ],
        },
      ],
    };

    console.log('✅ Test file tree created with nested folders');

    // Create folder ZIP
    console.log('📦 Creating folder ZIP...');
    const zipBuffer = await createFolderZip(testFileTree, 'test-room-123');
    console.log('✅ Folder ZIP created successfully');

    // Save ZIP to disk for testing
    const zipPath = path.join(__dirname, 'test-folder-export.zip');
    fs.writeFileSync(zipPath, zipBuffer);
    console.log('✅ ZIP saved to:', zipPath);

    // Verify ZIP file
    const stats = fs.statSync(zipPath);
    console.log('📊 ZIP file stats:');
    console.log('   Size:', stats.size, 'bytes');
    console.log('   Created:', stats.birthtime);
    console.log('   Modified:', stats.mtime);

    // Check ZIP header
    const fileBuffer = fs.readFileSync(zipPath);
    const zipHeader = fileBuffer.slice(0, 4);
    console.log('🔍 ZIP header (hex):', zipHeader.toString('hex'));

    if (zipHeader.toString('hex') === '504b0304') {
      console.log('✅ Valid ZIP file header detected!');
    } else {
      console.log('❌ Invalid ZIP file header');
    }

    console.log('\n🎉 Folder ZIP test completed successfully!');
    console.log('📁 You can now extract the ZIP file to see the folder structure:');
    console.log('   - main.java (root level)');
    console.log('   - src/utils.js (nested folder)');
    console.log('   - src/components/Button.jsx (deeply nested)');
    console.log('   - styles/main.css (another folder)');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testFolderZip();
