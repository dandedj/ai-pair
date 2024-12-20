import fs from 'fs';
import path from 'path';
import { logger } from '../logger';

interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

interface ApiResponseBase {
    usage?: {
        prompt_tokens: number;
        completion_tokens: number;
    };
}

abstract class BaseAIClient {
    protected apiKey: string;
    protected model: string;
    protected tmpDir: string;
    protected tokenUsage: TokenUsage;
    protected logger: typeof logger;

    constructor(apiKey: string, model: string, tmpDir: string) {
        this.apiKey = apiKey;
        this.model = model;
        this.tmpDir = tmpDir;
        this.logger = logger;
        this.tokenUsage = {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
        };
    }

    estimateTokens(text: string): number {
        // Estimate tokens by dividing the character count by 4
        return Math.ceil(text.length / 4);
    }

    logRequest(prompt: string, logDir: string): string {
        const requestLogPath = path.join(logDir, 'generation_request.log');
        const logString = `Model: ${this.model}\n${prompt}\n`;
        fs.writeFileSync(requestLogPath, logString);
        return requestLogPath;
    }

    logResponse(response: string, logDir: string): string {
        const responseLogPath = path.join(logDir, 'generation_response.log');
        fs.writeFileSync(responseLogPath, response);
        return responseLogPath;
    }

    logTokenUsage(promptTokens: number, completionTokens: number): void {
        this.tokenUsage.promptTokens += promptTokens;
        this.tokenUsage.completionTokens += completionTokens;
        this.tokenUsage.totalTokens += (promptTokens + completionTokens);
        this.logger.debug(`Token usage - Prompt: ${promptTokens}, Completion: ${completionTokens}, Total: ${this.tokenUsage.totalTokens}`);
    }

    updateTokenUsage(apiResponse: ApiResponseBase): void {
        if (apiResponse.usage) {
            const { prompt_tokens, completion_tokens } = apiResponse.usage;
            this.logTokenUsage(prompt_tokens, completion_tokens);
        }
    }

    getTokenUsage(): TokenUsage {
        return this.tokenUsage;
    }

    protected async handleError(error: Error): Promise<void> {
        this.logger.error(`Error in AI client: ${error.message}`);
        throw error;
    }

    public abstract generateResponse(prompt: string, systemPrompt: string, logDir: string): Promise<string>;
    protected abstract processResponse(response: unknown): Promise<string>;
}

export default BaseAIClient; 