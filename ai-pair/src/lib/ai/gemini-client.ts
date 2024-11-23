import BaseAIClient from './base-ai-client';
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { logger } from '../logger';

class GeminiClient extends BaseAIClient {
    genAI: GoogleGenerativeAI;
    modelInstance: GenerativeModel;

    constructor(apiKey: string, model: string, tmpDir: string) {
        super(apiKey, model, tmpDir);
        this.genAI = new GoogleGenerativeAI(this.apiKey);

        if (!this.model.includes('exp')) {
            this.modelInstance = this.genAI.getGenerativeModel({ model: this.model });
        } else {
            this.modelInstance = this.genAI.getGenerativeModel({ model: this.model }, { apiVersion: 'v1beta' });
        }
    }

    async generateCode(prompt: string, systemPrompt: string = ''): Promise<string> {
        try {
            const timestamp = this.logRequest(prompt);

            const fullPrompt = `${systemPrompt}\n\n${prompt}`.trim();

            const result = await this.modelInstance.generateContent(fullPrompt);
            const generatedCode = result.response.text();

            this.logResponse(generatedCode, timestamp);

            // Update token usage if the API provides this information
            // this.updateTokenUsage(result);

            return generatedCode;
        } catch (error: any) {
            logger.error('Error while generating code with Gemini:', error);
            throw error;
        }
    }

    // ... any additional methods if needed ...
}

export default GeminiClient; 