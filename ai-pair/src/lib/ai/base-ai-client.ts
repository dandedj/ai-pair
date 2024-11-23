import fs from 'fs';
import path from 'path';
import { logger } from '../logger';

interface TokenUsage {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
}

abstract class BaseAIClient {
    apiKey: string;
    model: string;
    tmpDir: string;
    tokenUsage: TokenUsage;

    constructor(apiKey: string, model: string, tmpDir: string) {
        this.apiKey = apiKey;
        this.model = model;
        this.tmpDir = tmpDir;
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

    logRequest(prompt: string): string {
        const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
        const requestLogFilePath = path.join(this.tmpDir, `request_${timestamp}.txt`);
        fs.writeFileSync(requestLogFilePath, prompt);
        return timestamp;
    }

    logResponse(generatedCode: string, timestamp: string): void {
        const responseLogFilePath = path.join(this.tmpDir, `response_${timestamp}.txt`);
        fs.writeFileSync(responseLogFilePath, generatedCode);
    }

    logTokenUsage(promptTokens: number, completionTokens: number): void {
        this.tokenUsage.promptTokens += promptTokens;
        this.tokenUsage.completionTokens += completionTokens;
        this.tokenUsage.totalTokens += (promptTokens + completionTokens);
        logger.debug(`Token usage - Prompt: ${promptTokens}, Completion: ${completionTokens}, Total: ${this.tokenUsage.totalTokens}`);
    }

    updateTokenUsage(apiResponse: any): void {
        // Override in child classes if the API returns token usage details
    }

    getTokenUsage(): TokenUsage {
        return this.tokenUsage;
    }
}

export default BaseAIClient; 