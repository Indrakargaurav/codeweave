@echo off
echo Creating Java Lambda JAR file...

REM Check if Java is installed
java -version >nul 2>&1
if errorlevel 1 (
    echo Error: Java is not installed or not in PATH
    pause
    exit /b 1
)

echo Java version:
java -version

echo.
echo Compiling LambdaHandler.java...
javac LambdaHandler.java

if errorlevel 1 (
    echo Compilation failed!
    pause
    exit /b 1
)

echo.
echo Creating JAR file...
jar cf lambda-java-runtime.jar LambdaHandler.class

if errorlevel 1 (
    echo JAR creation failed!
    pause
    exit /b 1
)

echo.
echo JAR file created: lambda-java-runtime.jar
echo.
echo IMPORTANT: This is a basic JAR without AWS Lambda dependencies.
echo You need to add the AWS Lambda JAR files manually or use Maven.
echo.
echo For now, you can:
echo 1. Upload this JAR to Lambda
echo 2. Add AWS Lambda dependencies as layers
echo 3. Or install Maven and run: mvn clean package
echo.
pause 