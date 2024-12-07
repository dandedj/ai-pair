import OpenAI from 'openai';
import BaseAIClient from './base-ai-client';
import { logger } from '../logger';
import { ChatCompletion, ChatCompletionMessageParam } from 'openai/resources/chat/completions';

export class ChatGPTClient extends BaseAIClient {
    private openai: OpenAI;

    constructor(apiKey: string, model: string, tmpDir: string) {
        super(apiKey, model, tmpDir);
        this.openai = new OpenAI({ apiKey });
    }

    async generateResponse(prompt: string, systemPrompt: string, logDir: string): Promise<string> {
        this.logRequest(prompt, logDir);
        
        try {
            const isO1Model = this.model.startsWith('o1');
            const messages: ChatCompletionMessageParam[] = isO1Model ? 
                [{ role: 'user' as const, content: prompt }] :
                [
                    { role: 'system' as const, content: systemPrompt },
                    { role: 'user' as const, content: prompt }
                ];

            const response = await this.openai.chat.completions.create({
                model: this.model,
                messages,
                ...(isO1Model ? 
                    { max_completion_tokens: 25000 } : 
                    { temperature: 0.2, max_tokens: 4000 })
            });

            if (!response.choices[0].message?.content) {
                throw new Error('No content in OpenAI response');
            }

            const generatedCode = response.choices[0].message.content;
            this.logResponse(generatedCode, logDir);
            this.updateTokenUsage(response);

            return generatedCode;
        } catch (error) {
            const err = error as Error;
            logger.error(`OpenAI API error: ${err.message}`);
            if (err.message.includes('rate limit')) {
                logger.info('Rate limit hit, waiting before retry...');
                await new Promise(resolve => setTimeout(resolve, 20000));
            }
            throw err;
        }
    }

    protected async processResponse(response: ChatCompletion): Promise<string> {
        if (!response.choices || response.choices.length === 0 || !response.choices[0].message?.content) {
            throw new Error('Invalid response from OpenAI API');
        }
        return response.choices[0].message.content;
    }
} 