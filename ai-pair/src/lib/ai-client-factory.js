const ChatGPTClient = require('./ai/chatgpt-client');
const ClaudeClient = require('./ai/claude-client');
const GeminiClient = require('./ai/gemini-client');
const { logger } = require('./logger');

/**
 * Factory class to create AI client instances based on the model.
 */
class AIClientFactory {
  /**
   * Creates an instance of AIClientFactory.
   * @param {Object} config - Configuration object.
   */
  constructor(config) {
    this.config = config;
    this.models = {
      'gpt-4o': 'openai',
      'gpt-4o-mini': 'openai',
      'gpt-3.5-turbo': 'openai',
      'claude-3-5-sonnet': 'anthropic',
      'gemini-2': 'gemini',
    };
  }

  /**
   * Retrieves the API key for the given model.
   * @param {string} model - The AI model name.
   * @returns {string} - The API key.
   */
  getApiKeyForModel(model) {
    const family = this.models[model];
    const apiKey = this.config.apiKeys[family];

    if (!apiKey) {
      const errorMsg = `Error: No API key found for ${family} model family.`;
      logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    return apiKey;
  }

  /**
   * Creates an AI client instance based on the model.
   * @param {string} model - The AI model name.
   * @returns {Object} - The AI client instance.
   */
  createClient(model) {
    const family = this.models[model];
    const apiKey = this.getApiKeyForModel(model);

    switch (family) {
      case 'openai':
        return new ChatGPTClient(apiKey, model, this.config.tmpDir);
      case 'anthropic':
        return new ClaudeClient(apiKey, model, this.config.tmpDir);
      case 'gemini':
        return new GeminiClient(apiKey, model, this.config.tmpDir);
      default:
        logger.warn('Model not recognized, defaulting to ChatGPTClient.');
        return new ChatGPTClient(apiKey, model, this.config.tmpDir);
    }
  }
}

module.exports = AIClientFactory; 