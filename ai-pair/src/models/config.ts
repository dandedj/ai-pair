import path from 'path';
import fs from 'fs';

interface ConfigData {
    model: string;
    projectRoot: string;
    extension?: string;
    srcDir?: string;
    testDir?: string;
    anthropicApiKey?: string;
    openaiApiKey?: string;
    geminiApiKey?: string;
    logLevel?: string;
    tmpDir: string;
    promptsPath?: string;
    numRetries?: number;
}

class Config {
    model: string;
    projectRoot: string;
    extension: string;
    srcDir: string;
    testDir: string;
    apiKeys: { [key: string]: string };
    logLevel: string;
    tmpDir: string;
    promptsPath: string;
    numRetries: number;
    systemPrompt: string;
    promptTemplate: string;
    noIssuePromptTemplate: string;

    constructor(configData: ConfigData) {
        this.model = configData.model;
        this.projectRoot = path.resolve(configData.projectRoot);
        this.extension = configData.extension || '.java';
        this.srcDir = path.resolve(this.projectRoot, configData.srcDir || 'src/main/java');
        this.testDir = path.resolve(this.projectRoot, configData.testDir || 'src/test');

        this.apiKeys = {
            anthropic: configData.anthropicApiKey || process.env.ANTHROPIC_API_KEY || '',
            openai: configData.openaiApiKey || process.env.OPENAI_API_KEY || '',
            gemini: configData.geminiApiKey || process.env.GEMINI_API_KEY || '',
        };

        if (!(this.apiKeys.anthropic || this.apiKeys.openai || this.apiKeys.gemini)) {
            throw new Error("API keys are not provided");
        }

        if (!configData.logLevel) {
            throw new Error("Log level is not provided");
        }

        this.logLevel = configData.logLevel || 'info';

        if (!configData.tmpDir) {
            throw new Error("Tmp directory is not provided");
        }

        this.tmpDir = configData.tmpDir;
        this.promptsPath = configData.promptsPath || path.join(__dirname, '../prompts');
        this.numRetries = configData.numRetries || 3;

        if (!fs.existsSync(this.projectRoot)) {
            throw new Error(`Project root directory not found at path: ${this.projectRoot}`);
        }

        if (!fs.existsSync(this.promptsPath)) {
            throw new Error(`Prompts directory not found at path: ${this.promptsPath}`);
        }

        this.systemPrompt = this.loadPromptFile('system_prompt.txt');
        this.promptTemplate = this.loadPromptFile('prompt_template.txt');
        this.noIssuePromptTemplate = this.loadPromptFile('no_issue_prompt_template.txt');
    }

    loadPromptFile(fileName: string): string {
        const filePath = path.join(this.promptsPath, fileName);
        if (!fs.existsSync(filePath)) {
            console.error(`Prompt file not found at path: ${filePath}`);
            throw new Error(`Prompt file not found`);
        }
        return fs.readFileSync(filePath, 'utf-8');
    }
}

export { Config };