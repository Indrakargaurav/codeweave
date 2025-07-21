// JavaScript Lambda Handler using ES modules
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const handler = async (event) => {
  const startTime = Date.now();

  try {
    // Parse input
    const { code, language, filename } = JSON.parse(event.body || event);

    // Create temporary file
    const tempFile = `/tmp/${filename}`;
    fs.writeFileSync(tempFile, code);

    return new Promise((resolve, reject) => {
      exec(
        `node ${tempFile}`,
        {
          timeout: 25000,
          maxBuffer: 1024 * 1024, // 1MB buffer
        },
        (error, stdout, stderr) => {
          const executionTime = Date.now() - startTime;

          if (error) {
            resolve({
              statusCode: 200,
              body: {
                success: false,
                output: stdout || '',
                error: stderr || error.message,
                executionTime: executionTime,
                memoryUsed: 0,
              },
            });
          } else {
            resolve({
              statusCode: 200,
              body: {
                success: true,
                output: stdout || '',
                error: stderr || '',
                executionTime: executionTime,
                memoryUsed: 0,
              },
            });
          }
        }
      );
    });
  } catch (error) {
    return {
      statusCode: 200,
      body: {
        success: false,
        output: '',
        error: error.message,
        executionTime: Date.now() - startTime,
        memoryUsed: 0,
      },
    };
  }
};
