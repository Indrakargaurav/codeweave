@echo off
echo Compiling simplified Java Lambda function...

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
echo Compiling LambdaHandlerSimple.java...
javac LambdaHandlerSimple.java

if errorlevel 1 (
    echo Compilation failed!
    pause
    exit /b 1
)

echo.
echo Creating JAR file...
jar cf lambda-java-runtime.jar LambdaHandlerSimple.class

if errorlevel 1 (
    echo JAR creation failed!
    pause
    exit /b 1
)

echo.
echo JAR file created: lambda-java-runtime.jar
echo.
echo Testing the function...
java -cp . LambdaHandlerSimple

echo.
echo JAR file is ready for AWS Lambda!
echo Upload this JAR to your Lambda function.
echo.
pause 