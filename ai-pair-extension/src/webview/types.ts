export interface WebviewConfig {
    model: string;
    logLevel: string;
    anthropicApiKey?: string;
    openaiApiKey?: string;
    geminiApiKey?: string;
    autoWatch: boolean;
    maxTokens: number;
    temperature: number;
} 