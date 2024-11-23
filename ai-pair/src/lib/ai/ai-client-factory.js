const ChatGPTClient = require('./chatgpt-client');
const ClaudeClient = require('./claude-client');
const GeminiClient = require('./gemini-client');
const { logger } = require('../logger');

/**
 * Factory class to create AI client instances based on the model.
 */
class AIClientFactory {
    constructor() {
        // Model families mapping
        this.modelFamilies = {
            'gpt-4o': 'openai',
            'gpt-4o-mini': 'openai',
            'gpt-3.5-turbo': 'openai',
            'o1-preview': 'openai',
            'o1-mini': 'openai',
            'claude-3-5-sonnet': 'anthropic',
            'claude-3-haiku': 'anthropic',

            'gemini-2': 'gemini',
            'gemini-1.5-flash': 'gemini',
            'gemini-1.5-pro': 'gemini',
            'gemini-1.0-pro': 'gemini',
            'gemini-exp-1114': 'gemini',
            'gemini-exp-1121': 'gemini',
            'gemini-1.5-flash-latest': 'gemini',
            'gemini-1.5-pro-latest': 'gemini',
            'gemini-1.0-pro-latest': 'gemini',
        };
    }

    /**
     * Retrieves the family of the given model.
     * @param {string} model - The AI model name.
     * @returns {string} - The model family.
     */
    getModelFamily(model) {
        return this.modelFamilies[model];
    }

    /**
     * Retrieves the API key for the given model.
     * @param {Object} config - Configuration object.
     * @param {string} model - The AI model name.
     * @returns {string} - The API key.
     */
    getApiKeyForModel(config, model) {
        const family = this.getModelFamily(model);
        const apiKey = config.apiKeys[family];

        if (!apiKey) {
            const errorMsg = `Error: No API key found for ${family} model family.`;
            logger.error(errorMsg);
            throw new Error(errorMsg);
        }

        return apiKey;
    }

    /**
     * Creates an AI client instance based on the model.
     * @param {Object} config - Configuration object.
     * @returns {Object} - The AI client instance.
     */
    createClient(config) {
        const family = this.getModelFamily(config.model);
        const apiKey = this.getApiKeyForModel(config, config.model);

        switch (family) {
            case 'openai':
                return new ChatGPTClient(apiKey, config.model, config.tmpDir);
            case 'anthropic':
                return new ClaudeClient(apiKey, config.model, config.tmpDir);
            case 'gemini':
                return new GeminiClient(apiKey, config.model, config.tmpDir);
            default:
                logger.warn('Model not recognized, defaulting to ChatGPTClient.');
                return new ChatGPTClient(apiKey, config.model, config.tmpDir);
        }
    }
}

module.exports = AIClientFactory;