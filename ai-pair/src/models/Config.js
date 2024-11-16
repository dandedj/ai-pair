const path = require('path');

class Config {
    constructor(configData) {
        // Validate 'model'
        if (!configData.model || typeof configData.model !== 'string') {
            throw new Error("Invalid 'model' parameter. Please provide a valid model name.");
        }
        this.model = configData.model;

        // Validate 'projectRoot'
        if (!configData.projectRoot || typeof configData.projectRoot !== 'string') {
            throw new Error("Invalid 'projectRoot' parameter. Please provide a valid project root path.");
        }
        this.projectRoot = path.resolve(configData.projectRoot);

        // Validate 'extension'
        if (!configData.extension || typeof configData.extension !== 'string') {
            throw new Error("Invalid 'extension' parameter. Please provide a valid file extension (e.g., '.java').");
        }
        this.extension = configData.extension;

        // Validate 'testDir'
        if (!configData.testDir || typeof configData.testDir !== 'string') {
            throw new Error("Invalid 'testDir' parameter. Please provide a valid test directory path.");
        }
        this.testDir = path.resolve(this.projectRoot, configData.testDir);

        // Validate API Keys
        this.apiKeys = {
            anthropic: configData.ANTHROPIC_API_KEY,
            openai: configData.OPENAI_API_KEY,
            gemini: configData.GEMINI_API_KEY,
        };
        if (!this.apiKeys.anthropic && !this.apiKeys.openai && !this.apiKeys.gemini) {
            throw new Error("No API keys provided. Please provide at least one API key for the AI services.");
        }

        // Validate 'logLevel'
        if (!configData.LOG_LEVEL || typeof configData.LOG_LEVEL !== 'string') {
            throw new Error("Invalid 'LOG_LEVEL' parameter. Please provide a valid log level (e.g., 'info', 'debug').");
        }
        this.logLevel = configData.LOG_LEVEL;

        // Validate 'tmpDir'
        if (!configData.tmpDir || typeof configData.tmpDir !== 'string') {
            throw new Error("Invalid 'tmpDir' parameter. Please provide a valid temporary directory path.");
        }
        this.tmpDir = path.resolve(configData.tmpDir);

        // Validate 'promptsPath'
        if (!configData.promptsPath || typeof configData.promptsPath !== 'string') {
            throw new Error("Invalid 'promptsPath' parameter. Please provide a valid prompts directory path.");
        }
        this.promptsPath = path.resolve(configData.promptsPath);

        // Validate 'numRetries'
        if (!Number.isInteger(configData.numRetries) || configData.numRetries < 1) {
            throw new Error("Invalid 'numRetries' parameter. Please provide a positive integer.");
        }
        this.numRetries = configData.numRetries;

        // Ensure system prompts are provided
        if (!configData.systemPrompt || typeof configData.systemPrompt !== 'string') {
            throw new Error("Missing 'systemPrompt'. Please provide the system prompt content.");
        }
        this.systemPrompt = configData.systemPrompt;

        if (!configData.promptTemplate || typeof configData.promptTemplate !== 'string') {
            throw new Error("Missing 'promptTemplate'. Please provide the prompt template content.");
        }
        this.promptTemplate = configData.promptTemplate;

        if (!configData.noIssuePromptTemplate || typeof configData.noIssuePromptTemplate !== 'string') {
            throw new Error("Missing 'noIssuePromptTemplate'. Please provide the no-issue prompt template content.");
        }
        this.noIssuePromptTemplate = configData.noIssuePromptTemplate;
    }
}

module.exports = Config; 