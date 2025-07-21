import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;

public class LambdaHandler implements RequestHandler<Map<String, Object>, Map<String, Object>> {
    private final ObjectMapper mapper = new ObjectMapper();
    
    @Override
    public Map<String, Object> handleRequest(Map<String, Object> event, Context context) {
        long startTime = System.currentTimeMillis();
        
        try {
            // Parse input
            String code = (String) event.get("code");
            String language = (String) event.get("language");
            String filename = (String) event.get("filename");
            
            // Create temporary file
            Path tempFile = Files.createTempFile("code", ".java");
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
            String className = tempFile.getFileName().toString().replace(".java", "");
            ProcessBuilder runProcess = new ProcessBuilder("java", "-cp", "/tmp", className);
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
            Files.deleteIfExists(Paths.get("/tmp/" + className + ".class"));
            
            return createResponse(run.exitValue() == 0, output, error, System.currentTimeMillis() - startTime);
            
        } catch (Exception e) {
            return createResponse(false, "", e.getMessage(), System.currentTimeMillis() - startTime);
        }
    }
    
    private Map<String, Object> createResponse(boolean success, String output, String error, long executionTime) {
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
} 