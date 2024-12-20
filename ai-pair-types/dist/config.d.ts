export interface ConfigOptions {
    model: string;
    projectRoot: string;
    srcDir: string;
    testSourceDir: string;
    testResultsDir: string;
    promptsPath: string;
    tmpDir: string;
    logLevel: string;
    anthropicApiKey: string;
    openaiApiKey: string;
    geminiApiKey: string;
    autoWatch: boolean;
    maxTokens: number;
    temperature: number;
    numRetries: number;
    escalateToPremiumModel: boolean;
    escalationModel: string;
}
interface ConfigData {
    model: string;
    projectRoot: string;
    srcDir: string;
    testSourceDir: string;
    testResultsDir: string;
    extension?: string;
    anthropicApiKey?: string;
    openaiApiKey?: string;
    geminiApiKey?: string;
    logLevel: string;
    tmpDir: string;
    promptsPath: string;
    numRetries?: number;
    systemPrompt?: string;
    promptTemplate?: string;
    noIssuePromptTemplate?: string;
    autoWatch?: boolean;
    maxTokens?: number;
    temperature?: number;
    escalateToPremiumModel?: boolean;
    escalationModel?: string;
}
declare class Config {
    model: string;
    projectRoot: string;
    extension: string;
    srcDir: string;
    testSourceDir: string;
    testResultsDir: string;
    apiKeys: {
        [key: string]: string;
    };
    logLevel: string;
    tmpDir: string;
    promptsPath: string;
    numRetries: number;
    systemPrompt: string;
    promptTemplate: string;
    noIssuePromptTemplate: string;
    autoWatch: boolean;
    maxTokens: number;
    temperature: number;
    escalateToPremiumModel: boolean;
    escalationModel: string;
    constructor(configData: ConfigData);
}
export { Config, ConfigData };
