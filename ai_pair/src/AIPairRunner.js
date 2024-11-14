require('dotenv').config();
const minimist = require('minimist');
const path = require('path');
const readline = require('readline-sync');
const chokidar = require('chokidar');
const fs = require('fs');
const ChatGPTClient = require('./lib/ai/ChatGPTClient');
const ClaudeClient = require('./lib/ai/ClaudeClient');
const GeminiClient = require('./lib/ai/GeminiClient');
const { parseAndApplyGeneratedCode } = require('./lib/CodeParser');
const { collectJavaFiles, clearDirectory } = require('./lib/FileUtils');
const { runTests, summarizeAllTests } = require('./lib/TestUtils');
const logger = require('./lib/logger');


class AIPairRunner {
    constructor(model, projectRoot, anthropicApiKey, openaiApiKey, geminiApiKey, logLevel) {
        this.model = model;
        this.projectRoot = projectRoot;
        this.apiKeys = {
            'anthropic': anthropicApiKey,
            'openai': openaiApiKey,
            'gemini': geminiApiKey
        };
        this.logLevel = logLevel;
        this.models = {
            'gpt-4o': 'openai',
            'gpt-4o-mini': 'openai',
            'gpt-3.5-turbo': 'openai',
            'claude-3-5-sonnet-20241022': 'anthropic',
            'claude-3-5-sonnet': 'anthropic',
            'gemini-1.5-pro': 'gemini',
            'gemini-2': 'gemini'
        };

        this.tmpDir = path.join(process.cwd(), 'tmp');
        this.systemPrompt = `You are a senior software engineer working on a gradle project with kotlin. Please respond in plain text and do not include any markdown formatting.`;
        this.accumulatedHints = [];
    }

    getApiKeyForModel(model) {
        const family = this.models[model];
        const apiKey = this.apiKeys[family];

        if (!apiKey) {
            console.error(`Error: No API key found for ${family} model family.`);
            console.error(`Please set the appropriate environment variable.`);
            process.exit(1);
        }

        return apiKey;
    }

    selectAIClient(apiKey, model) {
        const family = this.models[model];
        if (family === 'openai') {
            return new ChatGPTClient(apiKey, model);
        } else if (family === 'anthropic') {
            return new ClaudeClient(apiKey, model);
        } else if (family === 'gemini') {
            return new GeminiClient(apiKey, model);
        }
        logger.warn('Model not recognized, defaulting to ChatGPTClient.');
        return new ChatGPTClient(apiKey, model);
    }

    promptForModel() {
        console.log('Select a model:');
        console.log('1. gpt-4o');
        console.log('2. gpt-4o-mini');
        console.log('3. gpt-3.5-turbo');
        console.log('4. claude-3-5-sonnet-20241022');
        console.log('5. gemini-1.5-pro');
        console.log('6. gemini-2');
        const modelChoice = readline.question('Enter the number of the model you want to use: ');

        const modelMap = {
            '1': 'gpt-4o',
            '2': 'gpt-4o-mini',
            '3': 'gpt-3.5-turbo',
            '4': 'claude-3-5-sonnet-20241022',
            '5': 'gemini-1.5-pro',
            '6': 'gemini-2'
        };

        return modelMap[modelChoice] || 'gpt-4o';
    }

    async performCodeGenerationCycle(force = false) {
        let testsPassed = true;
        let testOutput = 'No test output yet.';

        if (!force) {
            testsPassed = runTests(this.projectRoot, this.tmpDir);
            testOutput = fs.readFileSync(path.join(this.tmpDir, 'test_output.txt'), 'utf-8');

            if (testsPassed) {
                console.log('Project compiles and all tests passed! No changes needed.');
                summarizeAllTests(this.projectRoot, this.tmpDir);
                return;
            }
        }

        logger.debug('Collecting Java files for code generation');
        const javaFiles = collectJavaFiles([
            path.join(this.projectRoot, 'src/main/java'),
            path.join(this.projectRoot, 'src/test/java')
        ]);

        logger.debug(`Found ${javaFiles.length} Java files`);
        
        const filesContent = javaFiles.map(file => {
            const relativePath = path.relative(this.projectRoot, file.path);
            return `File: ${relativePath}\n\n${file.content}`;
        }).join('\n\n');

        let prompt = `The following Java / gradle project unit test is failing:

${testOutput}

Here are the current contents of the Java files:

${filesContent}

Here is the build file contents:

${this.buildGradleContent}

Please provide the updated Java code for the files that will make the test pass. 
Before each file path, add the following:
File: <file_path>

Do not EVER change any of the unit test classes (*.Test.java). 
The results will be used to save a file to code so do NOT use markdown formatting or include other information in the response. Only the files and their contents. `;

        if (this.accumulatedHints.length > 0) {
            prompt += `\n\nHints for improvement: ${this.accumulatedHints.join('; ')}`;
        }

        const sessionLogFilePath = path.join(this.tmpDir, 'session_log.txt');
        fs.appendFileSync(sessionLogFilePath, `Prompt at ${new Date().toISOString()}:\n${prompt}\n\n`);

        logger.debug('Sending prompt to AI service');
        const generatedCode = await this.client.generateCode(prompt, this.tmpDir, this.systemPrompt);

        logger.info('Applying generated code changes');
        parseAndApplyGeneratedCode(this.projectRoot, this.tmpDir, generatedCode);

        console.log('Changes have been applied.');

        testsPassed = runTests(this.projectRoot, this.tmpDir);
        return testsPassed;
    }

    async handleSingleIteration(force = false) {
        const allTestsPassed = await this.performCodeGenerationCycle(force);
        if (allTestsPassed) {
            console.log('All tests passed!');
        }
    }

    watchTestDirectory() {
        const testDir = path.join(this.projectRoot, 'src/test/java');
        chokidar.watch(testDir, { persistent: true }).on('change', async () => {
            console.log('Detected changes in test directory.');
            await this.handleSingleIteration(true);
        });
    }

    async handleHint() {
        const userFeedback = readline.question('Provide a hint to be used to regenerate code:\n');
        if (userFeedback) {
            this.accumulatedHints.push(userFeedback);
            logger.debug(`Added hint: ${userFeedback}`);
        }
        await this.handleSingleIteration(true);
    }

    async handleModelChange() {
        const newModel = this.promptForModel();
        this.client = this.selectAIClient(this.getApiKeyForModel(newModel), newModel);
        logger.info(`Switched to model: ${this.client.model}`);
        await this.handleSingleIteration(true);
    }

    async run() {
        console.log('Log Level:', this.logLevel);

        const apiKey = this.getApiKeyForModel(this.model);
        this.client = this.selectAIClient(apiKey, this.model);

        logger.debug(`Initialized ${this.client.model} client with API key: ${this.client.apiKey.substring(0, 4)}...`);

        logger.info('Clearing temporary directories');
        clearDirectory(this.tmpDir);
        clearDirectory(path.join(this.tmpDir, 'archive/versions'));

        logger.debug('Reading build.gradle.kts file');
        const buildGradlePath = path.join(this.projectRoot, 'build.gradle.kts');
        this.buildGradleContent = fs.existsSync(buildGradlePath) ? fs.readFileSync(buildGradlePath, 'utf-8') : '';

        await this.handleSingleIteration();
        await this.startInteractiveLoop();
    }

    async startInteractiveLoop() {
        while (true) {
            const userChoice = readline.question('Options: [c]ontinue, provide [h]int, change [m]odel, e[x]it, [w]atch for changes. (Press Enter to continue): ').trim().toLowerCase();

            if (userChoice === 'c' || userChoice === '') {
                console.log('Continuing with the next iteration...');
                await this.handleSingleIteration();
            } else if (userChoice === 'h') {
                await this.handleHint();
            } else if (userChoice === 'm') {
                await this.handleModelChange();
            } else if (userChoice === 'e' || userChoice === 'x') {
                console.log('Exiting...');
                process.exit(0);
            } else if (userChoice === 'w') {
                console.log('Watch mode enabled. Watching for changes in the test directory...');
                this.watchTestDirectory();
                break;
            } else {
                console.log('Invalid option. Please try again.');
            }
        }
    }
}

module.exports = AIPairRunner; 