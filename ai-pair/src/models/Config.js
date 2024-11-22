const path = require('path');
const fs = require('fs');

class Config {
    constructor(configData) {
        this.model = configData.model;
        this.projectRoot = path.resolve(configData.projectRoot);
        this.extension = configData.extension || '.java';
        this.srcDir = path.resolve(this.projectRoot, configData.srcDir || 'src/main/java');
        this.testDir = path.resolve(this.projectRoot, configData.testDir || 'src/test');

        this.apiKeys = {
            anthropic: configData.anthropicApiKey || process.env.ANTHROPIC_API_KEY,
            openai: configData.openaiApiKey || process.env.OPENAI_API_KEY,
            gemini: configData.geminiApiKey || process.env.GEMINI_API_KEY,
        };

        // make sure that one apiKeys object has all the required keys
        if (!(this.apiKeys.anthropic || this.apiKeys.openai || this.apiKeys.gemini)) {
            throw new Error("API keys are not provided");
        }
        

        // throw an error if logLevel is not provided
        if (!configData.logLevel) {
            throw new Error("Log level is not provided");
        }

        this.logLevel = configData.logLevel || 'info';
        // throw an error if tmpDir is not provided 
        if (!configData.tmpDir) {
            throw new Error("Tmp directory is not provided");
        }

        this.tmpDir = configData.tmpDir;

        this.promptsPath = configData.promptsPath || path.join(__dirname, '../prompts');
        this.numRetries = configData.numRetries || 3;

        // Validate that the projectRoot exists
        if (!fs.existsSync(this.projectRoot)) {
            throw new Error(`Project root directory not found at path: ${this.projectRoot}`);
        }

        // Validate that the promptsPath exists
        if (!fs.existsSync(this.promptsPath)) {
            throw new Error(`Prompts directory not found at path: ${this.promptsPath}`);
        }

        // Load prompt templates
        this.systemPrompt = this.loadPromptFile('system_prompt.txt');
        this.promptTemplate = this.loadPromptFile('prompt_template.txt');
        this.noIssuePromptTemplate = this.loadPromptFile('no_issue_prompt_template.txt');
    }

    /**
     * Helper method to load a prompt file from the prompts directory.
     * @param {string} fileName - The name of the prompt file.
     * @returns {string} - The content of the prompt file.
     */
    loadPromptFile(fileName) {
        const filePath = path.join(this.promptsPath, fileName);
        if (!fs.existsSync(filePath)) {
            throw new Error(`Prompt file not found at path: ${filePath}`);
        }
        return fs.readFileSync(filePath, 'utf-8');
    }
}

module.exports = Config; 