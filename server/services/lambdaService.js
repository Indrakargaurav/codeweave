const AWS = require('aws-sdk');

// Configure AWS with existing credentials
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1',
});

const lambda = new AWS.Lambda();

// Language runtime mappings
const languageRuntimes = {
  js: 'nodejs18.x',
  javascript: 'nodejs18.x',
  py: 'python3.9',
  python: 'python3.9',
  java: 'java17',
  cpp: 'provided.al2',
  c: 'provided.al2',
  rs: 'provided.al2',
  rust: 'provided.al2',
};

// Lambda function names for different languages
const lambdaFunctions = {
  'nodejs18.x': process.env.NODEJS_LAMBDA_FUNCTION || 'codeweave-nodejs-runtime',
  'python3.9': process.env.PYTHON_LAMBDA_FUNCTION || 'codeweave-python-runtime',
  java17: process.env.JAVA_LAMBDA_FUNCTION || 'codeweave-java-runtime',
  'provided.al2': process.env.CPP_LAMBDA_FUNCTION || 'codeweave-cpp-runtime',
};

class LambdaService {
  static async executeCode(code, language, filename) {
    try {
      console.log(`🚀 Executing ${language} code for file: ${filename}`);

      // Determine runtime based on language
      const runtime = languageRuntimes[language.toLowerCase()];
      if (!runtime) {
        throw new Error(`Unsupported language: ${language}`);
      }

      // Get Lambda function name for this runtime
      const functionName = lambdaFunctions[runtime];
      if (!functionName) {
        throw new Error(`No Lambda function configured for runtime: ${runtime}`);
      }

      // Prepare payload for Lambda
      const payload = {
        code: code,
        language: language,
        filename: filename,
        timestamp: new Date().toISOString(),
      };

      console.log(`📤 Sending to Lambda function: ${functionName}`);

      // Invoke Lambda function
      const params = {
        FunctionName: functionName,
        InvocationType: 'RequestResponse',
        Payload: JSON.stringify(payload),
      };

      const result = await lambda.invoke(params).promise();

      console.log(`✅ Lambda execution completed`);
      console.log(`📊 Raw Lambda response:`, JSON.stringify(result.Payload, null, 2));

      // Parse the response
      const response = JSON.parse(result.Payload);

      if (response.errorMessage) {
        throw new Error(`Lambda execution error: ${response.errorMessage}`);
      }

      // Handle different response formats
      let output = '';
      let error = '';
      let executionTime = 0;
      let memoryUsed = 0;

      if (response.body) {
        // New format with body wrapper
        if (typeof response.body === 'string') {
          // Handle double-encoded JSON (like Python Lambda)
          try {
            const bodyData = JSON.parse(response.body);
            output = bodyData.output || '';
            error = bodyData.error || '';
            executionTime = bodyData.executionTime || 0;
            memoryUsed = bodyData.memoryUsed || 0;
          } catch (e) {
            output = response.body;
            error = '';
            executionTime = 0;
            memoryUsed = 0;
          }
        } else {
          output = response.body.output || '';
          error = response.body.error || '';
          executionTime = response.body.executionTime || 0;
          memoryUsed = response.body.memoryUsed || 0;
        }
      } else {
        // Direct format
        output = response.output || '';
        error = response.error || '';
        executionTime = response.executionTime || 0;
        memoryUsed = response.memoryUsed || 0;
      }

      const finalResult = {
        success: !error || error.trim() === '',
        output: output,
        error: error,
        executionTime: executionTime,
        memoryUsed: memoryUsed,
      };

      console.log(`📤 Final result:`, JSON.stringify(finalResult, null, 2));
      return finalResult;
    } catch (error) {
      console.error(`❌ Lambda execution failed:`, error);
      return {
        success: false,
        output: '',
        error: error.message || 'Execution failed',
        executionTime: 0,
        memoryUsed: 0,
      };
    }
  }

  static getSupportedLanguages() {
    return Object.keys(languageRuntimes);
  }

  static isLanguageSupported(language) {
    return languageRuntimes.hasOwnProperty(language.toLowerCase());
  }
}

module.exports = LambdaService;
