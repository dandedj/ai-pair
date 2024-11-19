const axios = require('axios');

class GeminiClient {
    constructor(apiKey, model = 'gemini-1', tmpDir) {
        this.apiKey = apiKey;
        this.tmpDir = tmpDir;
        this.model = model;
        this.apiUrl = 'https://api.google.com/gemini/v1/completions'; // Hypothetical URL
    }

    async generateCode(prompt) {
        try {
            const response = await axios.post(this.apiUrl, {
                model: this.model,
                prompt: prompt,
                max_tokens: 1500,
                temperature: 0.7
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            const generatedCode = response.data.choices[0].text.trim();
            return generatedCode;
        } catch (error) {
            console.error('Error generating code with Gemini:', error);
            throw error;
        }
    }
}

module.exports = GeminiClient; 