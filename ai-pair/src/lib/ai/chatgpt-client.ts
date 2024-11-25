import OpenAI from 'openai';
import BaseAIClient from './base-ai-client';
import { logger } from '../logger';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

class ChatGPTClient extends BaseAIClient {
    openai: OpenAI;

    constructor(apiKey: string, model: string = 'gpt-4o', tmpDir: string) {
        super(apiKey, model, tmpDir);
        this.openai = new OpenAI({apiKey: apiKey});
    }

    async generateCode(prompt: string, systemPrompt: string = ''): Promise<string> {
        const timestamp = this.logRequest(prompt);

        try {
            const isO1Model = this.model.startsWith('o1');

            const messages: ChatCompletionMessageParam[] = isO1Model
                ? [{ role: 'user', content: prompt }]
                : [
                      { role: 'system', content: systemPrompt },
                      { role: 'user', content: prompt },
                  ];

            const maxTokens = 4096;
            const maxCompletionTokens = 32768;
            const tokenParamKey = isO1Model ? 'max_completion_tokens' : 'max_tokens';
            const temperature = isO1Model ? 1.0 : 0.5;

            const response = await this.openai.chat.completions.create({
                model: this.model,
                messages: messages,
                temperature: temperature,
                [tokenParamKey]: isO1Model ? maxCompletionTokens : maxTokens,
            });

            const generatedCode = response.choices[0].message;
            if (generatedCode && generatedCode.content) {
                this.logResponse(generatedCode.content, timestamp);
            } else {
                throw new Error('Generated code content is null or undefined');
            }

            this.updateTokenUsage(response.usage);

            return generatedCode.content;
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

export { ChatGPTClient }; 