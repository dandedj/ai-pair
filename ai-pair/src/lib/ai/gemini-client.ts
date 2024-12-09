import BaseAIClient from './base-ai-client';
import { GoogleGenerativeAI, GenerativeModel, GenerateContentResult } from '@google/generative-ai';

class GeminiClient extends BaseAIClient {
    private genAI: GoogleGenerativeAI;
    private modelInstance: GenerativeModel;

    constructor(apiKey: string, model: string, tmpDir: string) {
        super(apiKey, model, tmpDir);
        this.genAI = new GoogleGenerativeAI(this.apiKey);
        this.modelInstance = this.genAI.getGenerativeModel({ model: this.model });
    }

    async generateResponse(prompt: string, systemPrompt: string): Promise<string> {
        const timestamp = this.logRequest(prompt, systemPrompt);

        try {
            const fullPrompt = `${systemPrompt}\n\n${prompt}`.trim();
            const result = await this.modelInstance.generateContent({
                contents: [{ role: 'user', parts: [{ text: fullPrompt }] }]
            });

            const generatedCode = result.response.text();
            this.logResponse(generatedCode, timestamp);
            
            // Estimate token usage since Gemini doesn't provide it directly
            const promptTokens = this.estimateTokens(fullPrompt);
            const completionTokens = this.estimateTokens(generatedCode);
            this.logTokenUsage(promptTokens, completionTokens);

            return generatedCode;
        } catch (error) {
            const err = error as Error;
            this.logger.error(`Error while generating code with Gemini: ${err.message}`);
            throw err;
        }
    }

    protected async processResponse(response: GenerateContentResult): Promise<string> {
        return response.response.text();
    }
}

export { GeminiClient }; 