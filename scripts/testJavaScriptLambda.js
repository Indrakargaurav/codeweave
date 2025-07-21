const AWS = require('aws-sdk');

// Configure AWS with existing credentials
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'ap-south-1',
});

const lambda = new AWS.Lambda();

async function testJavaScriptLambda() {
  console.log('🧪 Testing JavaScript Lambda Execution...\n');

  const testCases = [
    {
      name: 'Simple Hello World',
      code: `
console.log("Hello from JavaScript Lambda!");
console.log("Current time:", new Date().toISOString());
console.log("Node.js version:", process.version);
`,
      expected: 'Hello from JavaScript Lambda!',
    },
    {
      name: 'Math Operations',
      code: `
const a = 10;
const b = 5;
console.log("Addition:", a + b);
console.log("Multiplication:", a * b);
console.log("Division:", a / b);
console.log("Power:", Math.pow(a, b));
`,
      expected: 'Addition: 15',
    },
    {
      name: 'Array Operations',
      code: `
const numbers = [1, 2, 3, 4, 5];
const sum = numbers.reduce((acc, num) => acc + num, 0);
const average = sum / numbers.length;

console.log("Numbers:", numbers);
console.log("Sum:", sum);
console.log("Average:", average);
console.log("Max:", Math.max(...numbers));
console.log("Min:", Math.min(...numbers));
`,
      expected: 'Sum: 15',
    },
    {
      name: 'Object and JSON',
      code: `
const person = {
  name: "John Doe",
  age: 30,
  city: "New York",
  skills: ["JavaScript", "Node.js", "AWS"]
};

console.log("Person object:", person);
console.log("JSON stringified:", JSON.stringify(person, null, 2));
console.log("Name:", person.name);
console.log("Skills count:", person.skills.length);
`,
      expected: 'Person object:',
    },
    {
      name: 'Async Operations',
      code: `
async function testAsync() {
  console.log("Starting async test...");
  
  const promise = new Promise((resolve) => {
    setTimeout(() => {
      resolve("Async operation completed!");
    }, 100);
  });
  
  const result = await promise;
  console.log(result);
  console.log("Async test finished!");
}

testAsync();
`,
      expected: 'Async operation completed!',
    },
    {
      name: 'Error Handling',
      code: `
try {
  console.log("Testing error handling...");
  const result = 10 / 0;
  console.log("This should not print");
} catch (error) {
  console.log("Caught error:", error.message);
}
console.log("Program continues after error handling");
`,
      expected: 'Caught error:',
    },
    {
      name: 'File System (should fail)',
      code: `
const fs = require('fs');
fs.readFileSync('/nonexistent/file.txt');
`,
      expected: 'error',
    },
  ];

  for (const testCase of testCases) {
    console.log(`📝 Testing: ${testCase.name}`);

    try {
      const params = {
        FunctionName: 'codeweave-nodejs-runtime',
        InvocationType: 'RequestResponse',
        Payload: JSON.stringify({
          code: testCase.code,
          language: 'javascript',
          filename: 'test.js',
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

// Run the test
testJavaScriptLambda().catch(console.error);
