const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function verifyZipFile() {
  console.log('🔍 Verifying ZIP File:');
  console.log('=====================');

  try {
    const zipPath = path.join(__dirname, 'test-export.zip');

    if (!fs.existsSync(zipPath)) {
      console.log('❌ ZIP file not found. Run testZipCreation.js first.');
      return;
    }

    console.log('📁 Reading ZIP file:', zipPath);
    const zipData = fs.readFileSync(zipPath);
    console.log('📦 ZIP file size:', zipData.length, 'bytes');

    // Check ZIP header
    const header = zipData.slice(0, 4);
    console.log('🔍 ZIP header (hex):', header.toString('hex'));

    if (header.toString('hex') !== '504b0304') {
      console.log('❌ Invalid ZIP header');
      return;
    }

    // Load and verify ZIP contents
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(zipData);

    console.log('✅ ZIP loaded successfully');
    console.log('📄 Files in ZIP:');

    const fileCount = Object.keys(zipContent.files).length;
    console.log(`   Total files: ${fileCount}`);

    // List all files
    zip.forEach((relativePath, zipEntry) => {
      if (!zipEntry.dir) {
        console.log(`   📄 ${relativePath} (${zipEntry._data.uncompressedSize} bytes)`);
      } else {
        console.log(`   📁 ${relativePath} (folder)`);
      }
    });

    // Extract and verify file contents
    console.log('\n📖 File contents:');
    for (const [filename, zipEntry] of Object.entries(zipContent.files)) {
      if (!zipEntry.dir) {
        const content = await zipEntry.async('string');
        console.log(`\n📄 ${filename}:`);
        console.log(`   Size: ${content.length} characters`);
        console.log(`   Preview: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`);
      }
    }

    console.log('\n🎉 ZIP file verification completed successfully!');
    console.log('💡 This ZIP file should open correctly in Windows Explorer.');
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

verifyZipFile();
