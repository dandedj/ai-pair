import OpenAI from 'openai';
import BaseAIClient from './base-ai-client';
import { logger } from '../logger';

class ChatGPTClient extends BaseAIClient {
    apiUrl: string;
    openai: OpenAI;

    constructor(apiKey: string, model: string = 'gpt-4o', tmpDir: string) {
        super(apiKey, model, tmpDir);
        this.apiUrl = 'https://api.openai.com/v1/chat/completions';

        this.openai = new OpenAI({apiKey: apiKey});
    }

    async generateCode(prompt: string, systemPrompt: string = ''): Promise<string> {
        const timestamp = this.logRequest(prompt);

        try {
            const isO1Model = this.model.startsWith('o1');

            const messages = isO1Model
                ? [{ role: 'user', content: prompt }]
                : [
                      { role: 'system', content: systemPrompt },
                      { role: 'user', content: prompt },
                  ];

            const maxTokens = 4096;
            const maxCompletionTokens = 32768;
            const tokenParamKey = isO1Model ? 'max_completion_tokens' : 'max_tokens';
            const temperature = isO1Model ? 1.0 : 0.5;

            const response = await this.openai.completions.create({
                model: this.model,
                prompt: prompt,
                temperature: temperature,
                [tokenParamKey]: isO1Model ? maxCompletionTokens : maxTokens,
            });

            const generatedCode = response.choices[0].text;
            this.logResponse(generatedCode, timestamp);

            this.updateTokenUsage(response.usage);

            return generatedCode;
        } catch (error: any) {
            logger.error('Error generating code:', error);
            console.error(error.stack);

            if (error.response && error.response.data) {
                console.log(error.response.data);
            }
            throw error;
        }
    }

    updateTokenUsage(apiResponse: any): void {
        const usage = apiResponse.usage;
        if (usage) {
            this.logTokenUsage(usage.prompt_tokens, usage.completion_tokens);
        }
    }
}

export default ChatGPTClient; 