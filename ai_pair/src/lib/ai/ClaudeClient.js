const axios = require('axios');
const BaseAIClient = require('./BaseAIClient');
const logger = require('../logger'); // Import the logger

class ClaudeClient extends BaseAIClient {
    constructor(apiKey, model = 'claude-3-5-sonnet-20241022') {
        super(apiKey, model);
        this.apiUrl = 'https://api.anthropic.com/v1/messages';
        this.modelLimits = this.getModelLimits(model);
    }

    getModelLimits(model) {
        const limits = {
            'claude-3-5-sonnet-20241022': { tpm: 100000, rpm: 500, tpd: 1000000 },
            // Add other models as needed
        };
        return limits[model] || { tpm: 0, rpm: 0, tpd: 0 };
    }

    async createMessage({
        max_tokens = 4096,
        temperature = 0.7,
        systemPrompt = '',
        messages
    }) {
        try {
            const response = await axios.post(
                this.apiUrl,
                {
                    model: this.model,
                    max_tokens,
                    temperature,
                    system: systemPrompt, // Use the top-level system parameter
                    messages: messages.map(msg => ({
                        role: msg.role,
                        content: msg.content
                    }))
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': this.apiKey,
                        'anthropic-version': '2023-06-01'
                    }
                }
            );
            
            return response.data;
        } catch (error) {
            if (error.response) {
                logger.error('API Error:', {
                    status: error.response.status,
                    statusText: error.response.statusText,
                    data: error.response.data
                });
            }
            throw error;
        }
    }

    async generateCode(prompt, tmpDir, systemPrompt = '') {
        try {
            // Log the request
            const timestamp = this.logRequest(prompt, tmpDir);

            // Estimate tokens
            const promptTokens = this.estimateTokens(prompt);
            const maxOutputTokens = 1500;
            const totalEstimatedTokens = promptTokens + maxOutputTokens;

            // Log token usage
            this.logTokenUsage(promptTokens, maxOutputTokens, totalEstimatedTokens, this.modelLimits.tpm);

            // Create the message in the expected format
            const messages = [
                { role: 'user', content: prompt }
            ];

            const response = await this.createMessage({
                systemPrompt,
                messages,
                max_tokens: maxOutputTokens
            });

            // Extract the generated code from the response
            const generatedCode = response.content[0].text.trim();
            // remove any markdown formatting from the generated code
            const cleanedGeneratedCode = generatedCode.replace(/```[^\n]*```/g, '').trim();
            // Log the response
            this.logResponse(cleanedGeneratedCode, tmpDir, timestamp);

            return cleanedGeneratedCode;
        } catch (error) {
            logger.error('Error generating code:', error.message);
            if (error.response?.data) {
                logger.error('API Error Details:', error.response.data);
            }
            throw error;
        }
    }
}

module.exports = ClaudeClient;