const axios = require('axios');
const BaseAIClient = require('./base-ai-client');
const { logger } = require('../logger');

class ClaudeClient extends BaseAIClient {
    constructor(apiKey, model = 'claude-3-5-sonnet', tmpDir) {
        super(apiKey, model, tmpDir);
        this.apiUrl = 'https://api.anthropic.com/v1/complete';
    }

    async generateCode(prompt, tmpDir, systemPrompt = '') {
        const timestamp = this.logRequest(prompt);

        try {
            const response = await axios.post(
                this.apiUrl,
                {
                    model: this.model,
                    prompt: systemPrompt + '\n\n' + prompt,
                    max_tokens_to_sample: 2048,
                    temperature: 0.5,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': this.apiKey,
                    },
                }
            );

            const generatedCode = response.data.completion.trim();
            this.logResponse(generatedCode, timestamp);

            // Update token usage if available
            this.updateTokenUsage(response.data);

            return generatedCode;
        } catch (error) {
            logger.error('Error generating code:', error);
            throw error;
        }
    }

    updateTokenUsage(apiResponse) {
        // Handle token usage if the API provides it
        // This is placeholder code; replace with actual implementation if available
        if (apiResponse.usage) {
            const usage = apiResponse.usage;
            this.logTokenUsage(usage.prompt_tokens, usage.completion_tokens);
        }
    }
}

module.exports = ClaudeClient;