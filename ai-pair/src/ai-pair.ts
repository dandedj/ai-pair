import chokidar from 'chokidar';
import fs from 'fs';
import path from 'path';
import readline from 'readline-sync';
import AIClientFactory from './lib/ai/ai-client-factory';
import { ChatGPTClient } from './lib/ai/chatgpt-client';
import { ClaudeClient } from './lib/ai/claude-client';
import { GeminiClient } from './lib/ai/gemini-client';
import { constructPrompt } from './lib/ai/prompt-utils';
import { clearDirectory, collectFilesWithExtension } from './lib/file-utils';
import { logger } from './lib/logger';
import { delay, startSpinner } from './lib/spinner-utils';
import { runTests, collectTestFiles } from './lib/test-utils';
import { Config } from './models/config';
import { CodeFile, RunningState } from './models/running-state';
import { parseAndApplyGeneratedCode } from './lib/code-parser';

class AIPair {
    config: Config;
    runningState: RunningState;
    logger: typeof logger;
    client: ChatGPTClient | ClaudeClient | GeminiClient;
    clientFactory: AIClientFactory;
    models: { [key: string]: string };

    constructor(config: Config, runningState: RunningState) {
        this.config = config;
        this.runningState = runningState;
        this.logger = logger;
        this.clientFactory = new AIClientFactory();
        this.client = this.clientFactory.createClient(this.config);

        this.models = {
            'gpt-4o': 'openai',
            'gpt-4o-mini': 'openai',
            'gpt-3.5-turbo': 'openai',
            'claude-3-5-sonnet-20241022': 'anthropic',
            'claude-3-5-sonnet': 'anthropic',
            'gemini-1.5-pro': 'gemini',
            'gemini-2': 'gemini',
        };
    }

    getApiKeyForModel(model: string): string {
        const family = this.models[model];
        const apiKey = this.config.apiKeys[family];

        if (!apiKey) {
            const errorMsg = `Error: No API key found for ${family} model family. Please set the appropriate API key in the configuration.`;
            console.error(errorMsg);
            throw new Error(errorMsg);
        }

        return apiKey;
    }

    selectAIClient(apiKey: string, model: string): ChatGPTClient | ClaudeClient | GeminiClient {
        const family = this.models[model];
        if (family === 'openai') {
            return new ChatGPTClient(apiKey, model, this.config.tmpDir);
        } else if (family === 'anthropic') {
            return new ClaudeClient(apiKey, model, this.config.tmpDir);
        } else if (family === 'gemini') {
            return new GeminiClient(apiKey, model, this.config.tmpDir);
        }
        this.logger.warn('Model not recognized, defaulting to ChatGPTClient.');
        return new ChatGPTClient(apiKey, model, this.config.tmpDir);
    }

    async runWithoutInteraction(force: boolean = false): Promise<{ results: any }> {
        this.logger.debug('Clearing temporary directories');
        clearDirectory(this.config.tmpDir);
        clearDirectory(path.join(this.config.tmpDir, 'archive', 'versions'));        

        const results = await this.performCodeGenerationCycle(force);

        return { results };
    }

    async performCodeGenerationCyclesWithRetries(force: boolean = false): Promise<void> {
        let originalModel = this.config.model;

        while (this.runningState.generationCycles < this.config.numRetries) {
            console.log(`Performing code generation cycle ${this.runningState.generationCycles + 1} of ${this.config.numRetries}`);
            
            if (this.runningState.generationCycles === this.config.numRetries - 1) {
                console.log('Last retry, switching to o1-preview model');
                this.config.model = "o1-preview";
                this.client = this.clientFactory.createClient(this.config);
            }
            this.runningState.generationCycles++;
            const success = await this.performCodeGenerationCycle(force);
            if (success) {
                break;
            }
        }

        this.config.model = originalModel;
        this.client = this.clientFactory.createClient(this.config);
    }

    async performCodeGenerationCycle(force: boolean = false): Promise<boolean> {
        this.runningState.resetCycleState();
        this.runningState.setCycleStartTime();

        const buildGradlePath = path.join(this.config.projectRoot, 'build.gradle.kts');
        const buildGradleContent = fs.existsSync(buildGradlePath)
            ? fs.readFileSync(buildGradlePath, 'utf-8')
            : '';

        if (!force) {
            console.log('Performing tests to determine if changes are needed');
            runTests(this.config, this.runningState);

            if (this.runningState.buildState.compiledSuccessfully && this.runningState.testResults.testsPassed) {
                console.log('Project compiles and all tests passed! No changes needed.');
                return true;
            }

            if (!this.runningState.buildState.compiledSuccessfully) {
                console.log('Project compilation failed!');
            }
        }

        this.logger.debug('Collecting files for code generation');

        const codeFiles = collectFilesWithExtension(
            [path.join(this.config.projectRoot, 'src/main')],
            this.config.extension
        );

        const testFiles = collectTestFiles(force, this.config, this.runningState);

        this.logger.debug(
            `${codeFiles.length} code files and ${testFiles.length} test files will be used for code generation`
        );

        const filesContent = [...codeFiles, ...testFiles]
            .map((file) => {
                const relativePath = path.relative(this.config.projectRoot, file.path);
                return `File: ${relativePath}\n\n${file.content}`;
            })
            .join('\n\n');

        const prompt = constructPrompt(this.config, this.runningState, filesContent, buildGradleContent);
        const systemPrompt = this.config.systemPrompt;

        this.logger.debug('Sending prompt to AI service');

        const generatedCode = await this.generateCodeWithRetries(prompt, systemPrompt);

        const codeChanges = parseAndApplyGeneratedCode(this.config, this.runningState, generatedCode);

        this.runningState.codeChanges = codeChanges;

        this.logger.debug('Retrying tests after applying AI-generated code');
        runTests(this.config, this.runningState);

        this.logger.debug(`Tests passed: ${this.runningState.testResults.testsPassed}`);

        if (!this.runningState.testResults.testsPassed) {
            this.logger.debug(`Last run output: ${this.runningState.lastRunOutput}`);
        }

        this.logger.debug(
            `Project compiled successfully: ${this.runningState.buildState.compiledSuccessfully}`
        );

        return this.runningState.testResults.testsPassed;
    }

    async generateCodeWithRetries(prompt: string, systemPrompt: string): Promise<string> {
        const spinner = startSpinner('Generating code ');
        let generatedCode: string = '';
        const maxAttempts = this.config.numRetries;

        for (let attempts = 1; attempts <= maxAttempts; attempts++) {
            try {
                generatedCode = await this.client.generateCode(prompt, systemPrompt);
                break;
            } catch (error: any) {
                this.logger.error(`Error generating code (attempt ${attempts}): ${error.message}`);
                if (attempts < maxAttempts) {
                    console.log('Retrying code generation...');
                    await delay(1000);
                } else {
                    clearInterval(spinner);
                    throw new Error('Failed to generate code after multiple attempts.');
                }
            }
        }
        clearInterval(spinner);
        return generatedCode;
    }

    async runWithInteraction(): Promise<void> {
        console.log(`Starting AI Pair Runner with model: ${this.config.model}`);

        if (!this.runningState) {
            this.logger.debug('RunningState is not initialized, initializing...');
            this.runningState = new RunningState();
        }

        this.runningState.generationCycles = 0;

        let exit = false;

        while (!exit) {
            console.log('\nSelect an action:');
            console.log('c or [enter]- Continue and force code generation');
            console.log('w - Watch code files for changes');
            console.log('h - Provide a hint');
            console.log('x or e - Exit');
            const action = readline.question('Enter your choice: ');

            switch (action.toLowerCase()) {
                case 'c':
                    logger.debug('Forcing code generation...');
                    await this.performCodeGenerationCyclesWithRetries(true);
                    break;
                case 'w':
                    logger.debug('Starting to watch for file changes...');
                    await this.watchForChanges();
                    break;
                case 'h':
                    const hint = readline.question('Enter your hint: ');
                    this.runningState.addHint(hint);
                    await this.performCodeGenerationCyclesWithRetries(true);
                    break;
                case 'x':
                case 'e':
                    console.log('Exiting AI Pair Runner.');
                    exit = true;
                    break;
                default:
                    console.log('Invalid choice. Please try again.');
            }
        }
    }

    async watchForChanges(): Promise<void> {
        console.log('Watching for file changes...');
        return new Promise((resolve) => {
            const srcDirPath = path.resolve(this.config.srcDir);
            const testDirPath = path.resolve(this.config.testDir);

            this.logger.debug(`Source directory being watched: ${srcDirPath}`);
            this.logger.debug(`Test directory being watched: ${testDirPath}`);

            this.runningState.generationCycles = 0;
            this.runningState.resetCycleState();

            const watcher = chokidar.watch([srcDirPath, testDirPath], {
                persistent: true,
                ignoreInitial: true,
            });

            watcher.on('ready', () => {
                this.logger.debug('Initial scan complete. Ready for changes.');
                const watchedPaths = watcher.getWatched();
                for (const dir in watchedPaths) {
                    watchedPaths[dir].forEach((file) => {
                        this.logger.debug(`Watching: ${path.join(dir, file)}`);
                    });
                }
            });

            watcher.on('change', async (filePath) => {
                this.logger.debug(`File changed: ${filePath}`);
                await this.performCodeGenerationCyclesWithRetries();
            });

            watcher.on('add', async (filePath) => {
                this.logger.debug(`File added: ${filePath}`);
                await this.performCodeGenerationCyclesWithRetries();
            });

            watcher.on('unlink', async (filePath) => {
                this.logger.debug(`File removed: ${filePath}`);
                await this.performCodeGenerationCyclesWithRetries();
            });

            watcher.on('error', (error) => {
                this.logger.error(`Watcher error: ${error}`);
            });
        });
    }
}

export { AIPair, CodeFile };
