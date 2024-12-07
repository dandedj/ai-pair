import axios, { AxiosError } from 'axios';
import BaseAIClient from './base-ai-client';

interface ApiResponse {
    completion: string;
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
    };
}

export class ClaudeClient extends BaseAIClient {
    private apiUrl: string;

    constructor(apiKey: string, model: string, tmpDir: string) {
        super(apiKey, model, tmpDir);
        this.apiUrl = 'https://api.anthropic.com/v1/complete';
    }

    async generateResponse(prompt: string, systemPrompt: string): Promise<string> {
        const timestamp = this.logRequest(prompt);

        try {
            const response = await axios.post<ApiResponse>(
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
        } catch (error) {
            const err = error as AxiosError;
            this.logger.error(`Error generating code: ${err.message}`);
            throw err;
        }
    }

    protected async processResponse(response: ApiResponse): Promise<string> {
        return response.completion.trim();
    }
} 