const AIPairRunner = require('./AIPairRunner');
const Config = require('./models/Config');
const RunningState = require('./models/RunningState');
const { loadConfiguration } = require('./lib/configLoader');

// Add required modules
const fs = require('fs');
const path = require('path');

(async () => {
    try {
        // Load configuration data
        const configData = loadConfiguration();

        // Set prompts on configData
        const promptsPath = configData.promptsPath || path.join(__dirname, 'prompts');

        // Validate that prompt files exist and read them
        const systemPromptPath = path.join(promptsPath, 'system_prompt.txt');
        const promptTemplatePath = path.join(promptsPath, 'prompt_template.txt');
        const noIssuePromptTemplatePath = path.join(promptsPath, 'no_issue_prompt_template.txt');

        if (!fs.existsSync(systemPromptPath)) {
            throw new Error(`System prompt file not found at path: ${systemPromptPath}`);
        }
        if (!fs.existsSync(promptTemplatePath)) {
            throw new Error(`Prompt template file not found at path: ${promptTemplatePath}`);
        }
        if (!fs.existsSync(noIssuePromptTemplatePath)) {
            throw new Error(`No-issue prompt template file not found at path: ${noIssuePromptTemplatePath}`);
        }

        configData.systemPrompt = fs.readFileSync(systemPromptPath, 'utf-8');
        configData.promptTemplate = fs.readFileSync(promptTemplatePath, 'utf-8');
        configData.noIssuePromptTemplate = fs.readFileSync(noIssuePromptTemplatePath, 'utf-8');

        // Create Config object (will throw errors if validations fail)
        const config = new Config(configData);

        const runningState = new RunningState();

        const runner = new AIPairRunner(config, runningState);

        await runner.run();
    } catch (error) {
        console.error('Failed to run AI Pair:', error.message);
        process.exit(1);
    }
})(); 