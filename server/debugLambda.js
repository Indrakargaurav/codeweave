const AWS = require('aws-sdk');

// Configure AWS with existing credentials
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'ap-south-1',
});

const lambda = new AWS.Lambda();

async function debugLambda() {
  console.log('🔍 Debugging Lambda Response Format...\n');

  // Test JavaScript
  console.log('📝 Testing JavaScript Lambda...');
  try {
    const jsCode = `console.log("Hello from JavaScript!"); console.log("Test output");`;

    const params = {
      FunctionName: 'codeweave-nodejs-runtime',
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify({
        code: jsCode,
        language: 'javascript',
        filename: 'test.js',
      }),
    };

    const result = await lambda.invoke(params).promise();
    console.log('📊 Raw Lambda Response:');
    console.log(JSON.stringify(result.Payload, null, 2));

    const response = JSON.parse(result.Payload);
    console.log('\n📋 Parsed Response:');
    console.log(JSON.stringify(response, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n' + '─'.repeat(50) + '\n');

  // Test Java
  console.log('📝 Testing Java Lambda...');
  try {
    const javaCode = `public class Test {
  public static void main(String[] args) {
    System.out.println("Hello from Java!");
    System.out.println("Test output");
  }
}`;

    const params = {
      FunctionName: 'codeweave-java-runtime',
      InvocationType: 'RequestResponse',
      Payload: JSON.stringify({
        code: javaCode,
        language: 'java',
        filename: 'Test.java',
      }),
    };

    const result = await lambda.invoke(params).promise();
    console.log('📊 Raw Lambda Response:');
    console.log(JSON.stringify(result.Payload, null, 2));

    const response = JSON.parse(result.Payload);
    console.log('\n📋 Parsed Response:');
    console.log(JSON.stringify(response, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the debug
debugLambda().catch(console.error);
