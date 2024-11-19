const axios = require('axios');
const BaseAIClient = require('./base-ai-client');
const { logger } = require('../logger');

class ChatGPTClient extends BaseAIClient {
    constructor(apiKey, model = 'gpt-4o', tmpDir) {
        super(apiKey, model, tmpDir);
        this.apiUrl = 'https://api.openai.com/v1/chat/completions';
    }

    async generateCode(prompt, tmpDir, systemPrompt = '') {
        const timestamp = this.logRequest(prompt);

        try {
            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt },
            ];

            const response = await axios.post(
                this.apiUrl,
                {
                    model: this.model,
                    messages: messages,
                    max_tokens: 2048,
                    temperature: 0.5,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${this.apiKey}`,
                    },
                }
            );

            const generatedCode = response.data.choices[0].message.content.trim();
            this.logResponse(generatedCode, timestamp);

            // Update token usage
            this.updateTokenUsage(response.data);

            return generatedCode;
        } catch (error) {
            logger.error('Error generating code:', error);
            throw error;
        }
    }

    updateTokenUsage(apiResponse) {
        const usage = apiResponse.usage;
        if (usage) {
            this.logTokenUsage(usage.prompt_tokens, usage.completion_tokens);
        }
    }
}

module.exports = ChatGPTClient;