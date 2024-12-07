export interface AIClient {
    generateResponse(prompt: string, systemPrompt: string, logDir: string): Promise<string>;
} 