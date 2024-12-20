"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = void 0;
class Config {
    constructor(configData) {
        this.model = configData.model;
        this.projectRoot = configData.projectRoot;
        this.srcDir = configData.srcDir;
        this.testSourceDir = configData.testSourceDir;
        this.testResultsDir = configData.testResultsDir;
        this.extension = configData.extension || '.java';
        this.tmpDir = configData.tmpDir;
        this.promptsPath = configData.promptsPath;
        // Initialize API keys
        this.apiKeys = {
            anthropic: configData.anthropicApiKey || '',
            openai: configData.openaiApiKey || '',
            gemini: configData.geminiApiKey || '',
        };
        if (!(this.apiKeys.anthropic || this.apiKeys.openai || this.apiKeys.gemini)) {
            throw new Error("API keys are not provided");
        }
        this.logLevel = configData.logLevel;
        if (!this.logLevel) {
            throw new Error("Log level is not provided");
        }
        if (!this.tmpDir) {
            throw new Error("Tmp directory is not provided");
        }
        this.numRetries = configData.numRetries || 3;
        this.autoWatch = configData.autoWatch || false;
        this.maxTokens = configData.maxTokens || 2000;
        this.temperature = configData.temperature || 0.7;
        this.escalateToPremiumModel = configData.escalateToPremiumModel || false;
        this.escalationModel = configData.escalationModel || 'o1-preview';
        // Initialize prompt templates
        this.systemPrompt = configData.systemPrompt || '';
        this.promptTemplate = configData.promptTemplate || '';
        this.noIssuePromptTemplate = configData.noIssuePromptTemplate || '';
    }
}
exports.Config = Config;
