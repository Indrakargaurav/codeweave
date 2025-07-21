const LambdaService = require('../server/services/lambdaService');

async function testLambdaExecution() {
  console.log('🧪 Testing Lambda Execution...\n');

  // Test JavaScript execution
  const jsCode = `
console.log("Hello from JavaScript!");
console.log("Current time:", new Date().toISOString());
console.log("Node.js version:", process.version);
`;

  console.log('📝 Testing JavaScript execution...');
  try {
    const result = await LambdaService.executeCode(jsCode, 'javascript', 'test.js');
    console.log('✅ JavaScript Result:', result);
  } catch (error) {
    console.error('❌ JavaScript Error:', error.message);
  }

  console.log('\n📝 Testing Python execution...');
  const pythonCode = `
import datetime
import sys

print("Hello from Python!")
print("Current time:", datetime.datetime.now().isoformat())
print("Python version:", sys.version)
`;

  try {
    const result = await LambdaService.executeCode(pythonCode, 'python', 'test.py');
    console.log('✅ Python Result:', result);
  } catch (error) {
    console.error('❌ Python Error:', error.message);
  }

  console.log('\n📝 Testing supported languages...');
  const supportedLanguages = LambdaService.getSupportedLanguages();
  console.log('✅ Supported languages:', supportedLanguages);
}

// Run the test
testLambdaExecution().catch(console.error);
