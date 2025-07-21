import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;

public class LambdaHandlerSimple {
    
    public static Map<String, Object> handleRequest(Map<String, Object> event) {
        long startTime = System.currentTimeMillis();
        
        try {
            // Parse input - handle both string and object formats
            Map<String, Object> inputData;
            if (event.containsKey("body")) {
                // If body is a string, parse it
                Object body = event.get("body");
                if (body instanceof String) {
                    // Parse JSON string
                    inputData = parseJsonString((String) body);
                } else {
                    inputData = (Map<String, Object>) body;
                }
            } else {
                inputData = event;
            }
            
            String code = (String) inputData.get("code");
            String language = (String) inputData.get("language");
            String filename = (String) inputData.get("filename");
            
            // Extract class name from code
            String className = extractClassName(code);
            if (className == null) {
                return createResponse(false, "", "No public class found in code", System.currentTimeMillis() - startTime);
            }
            
            // Create temporary file with proper class name
            Path tempDir = Files.createTempDirectory("java_code");
            Path tempFile = tempDir.resolve(className + ".java");
            Files.write(tempFile, code.getBytes());
            
            // Compile and run
            ProcessBuilder compileProcess = new ProcessBuilder("javac", tempFile.toString());
            Process compile = compileProcess.start();
            int compileResult = compile.waitFor();
            
            if (compileResult != 0) {
                // Compilation failed
                String error = new String(compile.getErrorStream().readAllBytes());
                return createResponse(false, "", error, System.currentTimeMillis() - startTime);
            }
            
            // Run the compiled class
            ProcessBuilder runProcess = new ProcessBuilder("java", "-cp", tempDir.toString(), className);
            Process run = runProcess.start();
            
            // Set timeout
            boolean finished = run.waitFor(25, java.util.concurrent.TimeUnit.SECONDS);
            
            if (!finished) {
                run.destroyForcibly();
                return createResponse(false, "", "Execution timeout", System.currentTimeMillis() - startTime);
            }
            
            String output = new String(run.getInputStream().readAllBytes());
            String error = new String(run.getErrorStream().readAllBytes());
            
            // Clean up
            Files.deleteIfExists(tempFile);
            Files.deleteIfExists(tempDir.resolve(className + ".class"));
            Files.deleteIfExists(tempDir);
            
            return createResponse(run.exitValue() == 0, output, error, System.currentTimeMillis() - startTime);
            
        } catch (Exception e) {
            return createResponse(false, "", e.getMessage(), System.currentTimeMillis() - startTime);
        }
    }
    
    private static Map<String, Object> parseJsonString(String jsonString) {
        // Simple JSON parsing for basic objects
        Map<String, Object> result = new HashMap<>();
        try {
            // Remove quotes and braces
            String content = jsonString.substring(1, jsonString.length() - 1);
            String[] pairs = content.split(",");
            for (String pair : pairs) {
                String[] keyValue = pair.split(":");
                if (keyValue.length == 2) {
                    String key = keyValue[0].trim().replace("\"", "");
                    String value = keyValue[1].trim().replace("\"", "");
                    result.put(key, value);
                }
            }
        } catch (Exception e) {
            // Fallback
        }
        return result;
    }
    
    private static String extractClassName(String code) {
        try {
            // Simple regex to find public class declaration
            String[] lines = code.split("\n");
            for (String line : lines) {
                line = line.trim();
                if (line.startsWith("public class ")) {
                    // Extract class name: "public class Test {" -> "Test"
                    String className = line.substring("public class ".length());
                    if (className.contains(" ")) {
                        className = className.substring(0, className.indexOf(" "));
                    }
                    if (className.contains("{")) {
                        className = className.substring(0, className.indexOf("{"));
                    }
                    return className.trim();
                }
            }
            return null;
        } catch (Exception e) {
            return null;
        }
    }
    
    private static Map<String, Object> createResponse(boolean success, String output, String error, long executionTime) {
        Map<String, Object> response = new HashMap<>();
        response.put("statusCode", 200);
        
        Map<String, Object> body = new HashMap<>();
        body.put("success", success);
        body.put("output", output);
        body.put("error", error);
        body.put("executionTime", executionTime);
        body.put("memoryUsed", 0);
        
        response.put("body", body);
        return response;
    }
    
    // Main method for testing
    public static void main(String[] args) {
        Map<String, Object> testEvent = new HashMap<>();
        testEvent.put("code", "public class Test { public static void main(String[] args) { System.out.println(\"Hello from Java!\"); } }");
        testEvent.put("language", "java");
        testEvent.put("filename", "Test.java");
        
        Map<String, Object> result = handleRequest(testEvent);
        System.out.println("Result: " + result);
    }
} 