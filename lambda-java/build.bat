@echo off
echo Building Java Lambda JAR file...

REM Check if Maven is installed
mvn --version >nul 2>&1
if errorlevel 1 (
    echo Error: Maven is not installed or not in PATH
    echo Please install Maven from https://maven.apache.org/download.cgi
    pause
    exit /b 1
)

REM Clean and build
echo Cleaning previous build...
mvn clean

echo Building JAR with dependencies...
mvn package

if errorlevel 1 (
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo Build successful!
echo JAR file created: target/lambda-java-runtime-1.0.0.jar
echo.
echo You can now upload this JAR file to your AWS Lambda function.
echo.
pause 