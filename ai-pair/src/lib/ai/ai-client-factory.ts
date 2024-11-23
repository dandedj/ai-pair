import ChatGPTClient from './chatgpt-client';
import ClaudeClient from './claude-client';
import GeminiClient from './gemini-client';
import { logger } from '../logger';

interface Config {
    model: string;
    tmpDir: string;
    apiKeys: { [key: string]: string };
}

class AIClientFactory {
    modelFamilies: { [key: string]: string };

    constructor() {
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

    getModelFamily(model: string): string {
        return this.modelFamilies[model];
    }

    getApiKeyForModel(config: Config, model: string): string {
        const family = this.getModelFamily(model);
        const apiKey = config.apiKeys[family];

        if (!apiKey) {
            const errorMsg = `Error: No API key found for ${family} model family.`;
            logger.error(errorMsg);
            throw new Error(errorMsg);
        }

        return apiKey;
    }

    createClient(config: Config): ChatGPTClient | ClaudeClient | GeminiClient {
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

export default AIClientFactory; 