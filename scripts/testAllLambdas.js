const AWS = require('aws-sdk');

// Configure AWS with existing credentials
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'ap-south-1',
});

const lambda = new AWS.Lambda();

async function testLambda(functionName, language, testCases) {
  console.log(`🧪 Testing ${language} Lambda Execution...\n`);

  for (const testCase of testCases) {
    console.log(`📝 Testing: ${testCase.name}`);

    try {
      const params = {
        FunctionName: functionName,
        InvocationType: 'RequestResponse',
        Payload: JSON.stringify({
          code: testCase.code,
          language: language,
          filename: testCase.filename || 'test',
        }),
      };

      const result = await lambda.invoke(params).promise();
      const response = JSON.parse(result.Payload);

      console.log(`⏱️ Execution time: ${response.body.executionTime}ms`);
      console.log(`✅ Success: ${response.body.success}`);

      if (response.body.success) {
        console.log(`📤 Output:\n${response.body.output}`);
        if (response.body.output.includes(testCase.expected)) {
          console.log('✅ Test PASSED');
        } else {
          console.log('❌ Test FAILED - Unexpected output');
        }
      } else {
        console.log(`🚨 Error:\n${response.body.error}`);
        if (testCase.expected === 'error') {
          console.log('✅ Test PASSED (Expected error)');
        } else {
          console.log('❌ Test FAILED - Unexpected error');
        }
      }
    } catch (error) {
      console.error(`❌ Lambda invocation failed: ${error.message}`);
    }

    console.log('─'.repeat(50) + '\n');
  }
}

async function runAllTests() {
  console.log('🚀 Starting Comprehensive Lambda Tests...\n');

  // JavaScript Tests
  const jsTests = [
    {
      name: 'Hello World',
      code: `console.log("Hello from JavaScript!"); console.log("Node version:", process.version);`,
      expected: 'Hello from JavaScript!',
      filename: 'test.js',
    },
    {
      name: 'Math Operations',
      code: `
const a = 15;
const b = 3;
console.log("Sum:", a + b);
console.log("Product:", a * b);
console.log("Power:", Math.pow(a, b));
`,
      expected: 'Sum: 18',
      filename: 'math.js',
    },
  ];

  // Java Tests
  const javaTests = [
    {
      name: 'Hello World',
      code: `public class HelloWorld {
  public static void main(String[] args) {
    System.out.println("Hello from Java!");
    System.out.println("Java version: " + System.getProperty("java.version"));
  }
}`,
      expected: 'Hello from Java!',
      filename: 'HelloWorld.java',
    },
    {
      name: 'Math Operations',
      code: `public class MathTest {
  public static void main(String[] args) {
    int a = 15;
    int b = 3;
    System.out.println("Sum: " + (a + b));
    System.out.println("Product: " + (a * b));
    System.out.println("Power: " + Math.pow(a, b));
  }
}`,
      expected: 'Sum: 18',
      filename: 'MathTest.java',
    },
  ];

  // Python Tests (if you have Python Lambda)
  const pythonTests = [
    {
      name: 'Hello World',
      code: `
import sys
import datetime
print("Hello from Python!")
print("Python version:", sys.version)
print("Current time:", datetime.datetime.now())
`,
      expected: 'Hello from Python!',
      filename: 'test.py',
    },
    {
      name: 'Math Operations',
      code: `
import math
a = 15
b = 3
print(f"Sum: {a + b}")
print(f"Product: {a * b}")
print(f"Power: {a ** b}")
print(f"Square root of {a}: {math.sqrt(a)}")
`,
      expected: 'Sum: 18',
      filename: 'math.py',
    },
  ];

  try {
    // Test JavaScript
    await testLambda('codeweave-nodejs-runtime', 'javascript', jsTests);

    // Test Java
    await testLambda('codeweave-java-runtime', 'java', javaTests);

    // Test Python (if available)
    try {
      await testLambda('codeweave-python-runtime', 'python', pythonTests);
    } catch (error) {
      console.log('⚠️ Python Lambda not available or not configured');
    }
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
  }

  console.log('🎉 All tests completed!');
}

// Run all tests
runAllTests().catch(console.error);
