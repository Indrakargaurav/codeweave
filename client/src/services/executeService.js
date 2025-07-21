const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

class ExecuteService {
  static async executeCode(code, language, filename, ownerId) {
    try {
      console.log(`🚀 Executing code:`, { language, filename, codeLength: code.length });

      const response = await fetch(`${API_BASE_URL}/api/execute/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          language,
          filename,
          ownerId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ Execution completed:`, result);

      return result;
    } catch (error) {
      console.error(`❌ Execution failed:`, error);
      throw error;
    }
  }

  static async getSupportedLanguages() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/execute/languages`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.languages || [];
    } catch (error) {
      console.error(`❌ Failed to get supported languages:`, error);
      return [];
    }
  }

  static isLanguageSupported(language) {
    const supportedLanguages = [
      'js',
      'javascript',
      'py',
      'python',
      'java',
      'cpp',
      'c',
      'rs',
      'rust',
    ];
    return supportedLanguages.includes(language.toLowerCase());
  }

  static getLanguageFromFilename(filename) {
    if (!filename) return null;

    const extension = filename.split('.').pop().toLowerCase();
    const languageMap = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      rs: 'rust',
      html: 'html',
      css: 'css',
      md: 'markdown',
    };

    return languageMap[extension] || extension;
  }
}

export default ExecuteService;
