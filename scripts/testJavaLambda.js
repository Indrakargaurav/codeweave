const AWS = require('aws-sdk');

// Configure AWS with existing credentials
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'ap-south-1',
});

const lambda = new AWS.Lambda();

async function testJavaLambda() {
  console.log('🧪 Testing Java Lambda Execution...\n');

  const testCases = [
    {
      name: 'Simple Hello World',
      code: `public class HelloWorld {
  public static void main(String[] args) {
    System.out.println("Hello from Java Lambda!");
    System.out.println("Current time: " + java.time.LocalDateTime.now());
  }
}`,
      expected: 'Hello from Java Lambda!',
    },
    {
      name: 'Math Operations',
      code: `public class MathTest {
  public static void main(String[] args) {
    int a = 10;
    int b = 5;
    System.out.println("Addition: " + (a + b));
    System.out.println("Multiplication: " + (a * b));
    System.out.println("Division: " + (a / b));
  }
}`,
      expected: 'Addition: 15',
    },
    {
      name: 'Array Operations',
      code: `public class ArrayTest {
  public static void main(String[] args) {
    int[] numbers = {1, 2, 3, 4, 5};
    int sum = 0;
    for (int num : numbers) {
      sum += num;
    }
    System.out.println("Sum of array: " + sum);
    System.out.println("Average: " + (sum / numbers.length));
  }
}`,
      expected: 'Sum of array: 15',
    },
    {
      name: 'Error Test (Compilation Error)',
      code: `public class ErrorTest {
  public static void main(String[] args) {
    System.out.println("This will cause an error");
    int result = 10 / 0; // Division by zero
  }
}`,
      expected: 'error',
    },
  ];

  for (const testCase of testCases) {
    console.log(`📝 Testing: ${testCase.name}`);

    try {
      const params = {
        FunctionName: 'codeweave-java-runtime',
        InvocationType: 'RequestResponse',
        Payload: JSON.stringify({
          code: testCase.code,
          language: 'java',
          filename: 'Test.java',
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
testJavaLambda().catch(console.error);
