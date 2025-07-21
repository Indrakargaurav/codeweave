# Java Lambda Function for CodeWeave

This directory contains the Java Lambda function for executing Java code.

## Prerequisites

1. **Java 17** installed
2. **Maven** installed (download from https://maven.apache.org/download.cgi)
3. **AWS CLI** configured (optional, for direct deployment)

## Building the JAR

### Option 1: Using the build script (Windows)

```bash
cd lambda-java
build.bat
```

### Option 2: Using Maven directly

```bash
cd lambda-java
mvn clean package
```

## Output

After successful build, you'll find the JAR file at:

```
target/lambda-java-runtime-1.0.0.jar
```

## Uploading to AWS Lambda

1. Go to AWS Lambda Console
2. Create a new function named `codeweave-java-runtime`
3. Choose **Java 17** as runtime
4. Upload the JAR file: `target/lambda-java-runtime-1.0.0.jar`
5. Set the handler to: `LambdaHandler::handleRequest`
6. Configure:
   - Memory: 512 MB
   - Timeout: 30 seconds
   - Architecture: x86_64

## Testing

You can test the function with this sample input:

```json
{
  "code": "public class Test { public static void main(String[] args) { System.out.println(\"Hello from Java!\"); } }",
  "language": "java",
  "filename": "Test.java"
}
```

## Function Features

- ✅ Compiles Java code dynamically
- ✅ Executes compiled code with timeout protection
- ✅ Captures stdout and stderr
- ✅ Cleans up temporary files
- ✅ Returns execution metrics (time, memory)
- ✅ Handles compilation errors gracefully
