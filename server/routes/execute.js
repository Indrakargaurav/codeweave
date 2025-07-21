const express = require('express');
const router = express.Router();
const LambdaService = require('../services/lambdaService');

// Execute code endpoint
router.post('/execute', async (req, res) => {
  try {
    const { code, language, filename, ownerId } = req.body;

    // Validate input
    if (!code || !language || !filename) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: code, language, filename',
      });
    }

    // Check if language is supported
    if (!LambdaService.isLanguageSupported(language)) {
      return res.status(400).json({
        success: false,
        error: `Unsupported language: ${language}. Supported languages: ${LambdaService.getSupportedLanguages().join(', ')}`,
      });
    }

    console.log(`🎯 Code execution request:`, {
      language,
      filename,
      codeLength: code.length,
      ownerId,
    });

    // Execute code using Lambda
    const result = await LambdaService.executeCode(code, language, filename);

    console.log(`📊 Execution result:`, {
      success: result.success,
      hasOutput: !!result.output,
      hasError: !!result.error,
      executionTime: result.executionTime,
    });

    // Return the result
    res.json({
      success: result.success,
      output: result.output,
      error: result.error,
      executionTime: result.executionTime,
      memoryUsed: result.memoryUsed,
      language: language,
      filename: filename,
    });
  } catch (error) {
    console.error('❌ Code execution error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during code execution',
      details: error.message,
    });
  }
});

// Get supported languages endpoint
router.get('/languages', (req, res) => {
  try {
    const supportedLanguages = LambdaService.getSupportedLanguages();
    res.json({
      success: true,
      languages: supportedLanguages,
    });
  } catch (error) {
    console.error('❌ Error getting supported languages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get supported languages',
    });
  }
});

module.exports = router;
