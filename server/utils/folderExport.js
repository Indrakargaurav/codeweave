const JSZip = require('jszip');
const path = require('path');

/**
 * Creates a ZIP file containing the actual folder structure
 * @param {Object} fileTree - File tree structure
 * @param {String} roomId - Room ID for naming
 * @returns {Buffer} ZIP buffer with proper folder structure
 */
const createFolderZip = async (fileTree, roomId) => {
  const zip = new JSZip();

  console.log('📦 Creating folder ZIP from file tree...');

  // Function to recursively add files and folders
  const addToZip = (node, currentPath = '') => {
    if (node.type === 'file') {
      const filePath = currentPath + node.name;
      console.log(`📄 Adding file: ${filePath}`);
      zip.file(filePath, node.content || '');
    } else if (node.type === 'folder' && node.children) {
      // Don't add the root folder name to the path
      const folderPath = node.name === 'root' ? currentPath : currentPath + node.name + '/';

      if (node.name !== 'root') {
        console.log(`📁 Adding folder: ${folderPath}`);
      }

      // Process children
      node.children.forEach((child) => {
        addToZip(child, folderPath);
      });
    }
  };

  // Start adding from the root
  addToZip(fileTree);

  // Generate ZIP with proper compression
  const zipBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: {
      level: 6,
    },
  });

  console.log(`✅ Folder ZIP created, size: ${zipBuffer.length} bytes`);
  return zipBuffer;
};

module.exports = {
  createFolderZip,
};
