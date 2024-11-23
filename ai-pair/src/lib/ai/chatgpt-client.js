const axios = require('axios');
const BaseAIClient = require('./base-ai-client');
const { logger } = require('../logger');

class ChatGPTClient extends BaseAIClient {
    constructor(apiKey, model = 'gpt-4o', tmpDir) {
        super(apiKey, model, tmpDir);
        this.apiUrl = 'https://api.openai.com/v1/chat/completions';
    }

    async generateCode(prompt, systemPrompt = '') {
        const timestamp = this.logRequest(prompt);

        try {
            // Determine if the model is an 'o1' model
            const isO1Model = this.model.startsWith('o1');

            // Construct messages
            const messages = isO1Model
                ? [{ role: 'user', content: prompt }]
                : [
                      { role: 'system', content: systemPrompt },
                      { role: 'user', content: prompt },
                  ];

            // Set the correct token parameter key
            const maxTokens = 4096;
            const maxCompletionTokens = 32768;
            const tokenParamKey = isO1Model ? 'max_completion_tokens' : 'max_tokens';
            const temperature = isO1Model ? 1.0 : 0.5;

            // Prepare request body with dynamic token parameter
            const requestBody = {
                model: this.model,
                messages: messages,
                temperature: temperature,
                [tokenParamKey]: isO1Model ? maxCompletionTokens : maxTokens,
            };

            // Make API request
            const response = await axios.post(
                this.apiUrl,
                requestBody,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${this.apiKey}`,
                    },
                }
            );
            // this.logResponse(response, timestamp);

            const generatedCode = response.data.choices[0].message.content.trim();
            this.logResponse(generatedCode, timestamp);

            // Update token usage
            this.updateTokenUsage(response.data);

            return generatedCode;
        } catch (error) {
            logger.error('Error generating code:', error);
            console.error(error.stack);

            // Print the HTTP response if available
            if (error.response && error.response.data) {
                console.log(error.response.data);
            }
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