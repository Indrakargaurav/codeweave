@echo off
echo Compiling Java Lambda function...

REM Check if Java is installed
java -version >nul 2>&1
if errorlevel 1 (
    echo Error: Java is not installed or not in PATH
    pause
    exit /b 1
)

REM Check if javac is available
javac -version >nul 2>&1
if errorlevel 1 (
    echo Error: Java compiler (javac) is not available
    pause
    exit /b 1
)

echo Java version:
java -version

echo.
echo Compiling LambdaHandler.java...
javac -cp ".;*" LambdaHandler.java

if errorlevel 1 (
    echo Compilation failed!
    pause
    exit /b 1
)

echo.
echo Compilation successful!
echo.
echo Note: This creates a basic JAR without dependencies.
echo For production use, install Maven and run: mvn clean package
echo.
pause 