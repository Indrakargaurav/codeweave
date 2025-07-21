const fs = require('fs');
const path = require('path');

function convertJsonToFiles(jsonFilePath, outputDir) {
  console.log('🔄 Converting JSON to Files:');
  console.log('============================');

  try {
    // Read the JSON file
    const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
    console.log(`📁 Room ID: ${jsonData.roomId}`);
    console.log(`📅 Export Time: ${jsonData.exportTime}`);

    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Function to recursively create files and folders
    function createFilesRecursively(node, currentPath) {
      if (node.type === 'file') {
        const filePath = path.join(currentPath, node.name);
        fs.writeFileSync(filePath, node.content || '');
        console.log(`📄 Created: ${filePath}`);
      } else if (node.type === 'folder' && node.children) {
        const folderPath = path.join(currentPath, node.name);
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath, { recursive: true });
        }
        console.log(`📁 Created folder: ${folderPath}`);

        // Process children
        node.children.forEach((child) => {
          createFilesRecursively(child, folderPath);
        });
      }
    }

    // Start creating files from the root
    if (jsonData.files && jsonData.files.children) {
      jsonData.files.children.forEach((child) => {
        createFilesRecursively(child, outputDir);
      });
    }

    console.log(`\n✅ Conversion completed!`);
    console.log(`📂 Files created in: ${outputDir}`);
    console.log(`💡 You can now open this folder in your code editor.`);
  } catch (error) {
    console.error('❌ Conversion failed:', error.message);
  }
}

// Usage example
if (process.argv.length >= 4) {
  const jsonFile = process.argv[2];
  const outputDir = process.argv[3];
  convertJsonToFiles(jsonFile, outputDir);
} else {
  console.log('Usage: node convertJsonToFiles.js <json-file> <output-directory>');
  console.log('Example: node convertJsonToFiles.js room-123-files.json ./my-project');
}
