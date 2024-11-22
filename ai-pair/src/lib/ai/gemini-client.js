const BaseAIClient = require('./base-ai-client');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { logger } = require('../logger');

class GeminiClient extends BaseAIClient {
    constructor(apiKey, model, tmpDir) {
        super(apiKey, model, tmpDir);
        this.genAI = new GoogleGenerativeAI(this.apiKey);
        // if the model doesn't contain 'exp' then use the v1beta API
        if (!this.model.includes('exp')) {
            this.modelInstance = this.genAI.getGenerativeModel({ model: this.model });
        } else {
            this.modelInstance = this.genAI.getGenerativeModel({ model: this.model}, { apiVersion: 'v1beta' });
        }
    }

    async generateCode(prompt, systemPrompt) {
        try {
            const timestamp = this.logRequest(prompt);

            // Combine system prompt and user prompt
            const fullPrompt = `${systemPrompt}\n\n${prompt}`.trim();

            const result = await this.modelInstance.generateContent(fullPrompt);
            const generatedCode = result.response.text();

            this.logResponse(generatedCode, timestamp);

            // Update token usage if the API provides this information
            // this.updateTokenUsage(result);

            return generatedCode;
        } catch (error) {
            logger.error('Error while generating code with Gemini:', error);
            throw error;
        }
    }

    // ... any additional methods if needed ...
}

module.exports = GeminiClient; 