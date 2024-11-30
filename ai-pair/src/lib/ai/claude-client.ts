import axios, { AxiosResponse } from 'axios';
import BaseAIClient from './base-ai-client';
import { logger } from '../logger';

interface ApiResponse {
    completion: string;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
    };
}

class ClaudeClient extends BaseAIClient {
    apiUrl: string;

    constructor(apiKey: string, model: string = 'claude-3-5-sonnet', tmpDir: string) {
        super(apiKey, model, tmpDir);
        this.apiUrl = 'https://api.anthropic.com/v1/complete';
    }

    async generateCode(prompt: string, systemPrompt: string = ''): Promise<string> {
        const timestamp = this.logRequest(prompt);

        try {
            const response: AxiosResponse<ApiResponse> = await axios.post(
                this.apiUrl,
                {
                    model: this.model,
                    prompt: `${systemPrompt}\n\n${prompt}`,
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
            this.updateTokenUsage(response.data);

            return generatedCode;
        } catch (error: any) {
            logger.error('Error generating code:', error);
            throw error;
        }
    }

    updateTokenUsage(apiResponse: ApiResponse): void {
        if (apiResponse.usage) {
            const usage = apiResponse.usage;
            this.logTokenUsage(usage.prompt_tokens, usage.completion_tokens);
        }
    }
}

export { ClaudeClient }; 