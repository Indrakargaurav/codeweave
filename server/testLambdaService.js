const LambdaService = require('./services/lambdaService');

async function testLambdaService() {
  console.log('🧪 Testing Lambda Service...\n');

  // Test JavaScript
  console.log('📝 Testing JavaScript...');
  try {
    const jsCode = `
console.log("Hello from JavaScript!");
console.log("Current time:", new Date().toISOString());
console.log("Node version:", process.version);
`;

    const jsResult = await LambdaService.executeCode(jsCode, 'javascript', 'test.js');
    console.log('✅ JavaScript Result:', jsResult);
  } catch (error) {
    console.error('❌ JavaScript Error:', error.message);
  }

  console.log('\n' + '─'.repeat(50) + '\n');

  // Test Java
  console.log('📝 Testing Java...');
  try {
    const javaCode = `public class Test {
  public static void main(String[] args) {
    System.out.println("Hello from Java!");
    System.out.println("Java version: " + System.getProperty("java.version"));
  }
}`;

    const javaResult = await LambdaService.executeCode(javaCode, 'java', 'Test.java');
    console.log('✅ Java Result:', javaResult);
  } catch (error) {
    console.error('❌ Java Error:', error.message);
  }

  console.log('\n' + '─'.repeat(50) + '\n');

  // Test Python (if available)
  console.log('📝 Testing Python...');
  try {
    const pythonCode = `
import sys
import datetime
print("Hello from Python!")
print("Python version:", sys.version)
print("Current time:", datetime.datetime.now())
`;

    const pythonResult = await LambdaService.executeCode(pythonCode, 'python', 'test.py');
    console.log('✅ Python Result:', pythonResult);
  } catch (error) {
    console.error('❌ Python Error:', error.message);
  }

  console.log('\n🎉 Lambda Service tests completed!');
}

// Run the test
testLambdaService().catch(console.error);
