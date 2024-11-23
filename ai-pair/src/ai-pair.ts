import path from 'path';
import readline from 'readline-sync';
import chokidar from 'chokidar';
import fs from 'fs';
import ChatGPTClient from './lib/ai/chatgpt-client';
import ClaudeClient from './lib/ai/claude-client';
import GeminiClient from './lib/ai/gemini-client';
import { parseAndApplyGeneratedCode } from './lib/code-parser';
import { collectFilesWithExtension, clearDirectory } from './lib/file-utils';
import AIClientFactory from './lib/ai/ai-client-factory';
import Config from './models/config';
import RunningState from './models/running-state';
import TestRunner from './lib/test-runner';
import CodeGenerator from './lib/code-generator';
import { delay, startSpinner } from './lib/spinner-utils';
import { logger } from './lib/logger';

interface CodeFile {
    path: string;
    content: string;
}

class AIPair {
    config: Config;
    runningState: RunningState;
    logger: typeof logger;
    client: ChatGPTClient | ClaudeClient | GeminiClient;
    codeGenerator: CodeGenerator;
    testRunner: TestRunner;
    models: { [key: string]: string };

    constructor(config: Config, runningState: RunningState) {
        this.config = config;
        this.runningState = runningState;
        this.logger = logger;

        const clientFactory = new AIClientFactory();
        this.client = clientFactory.createClient(this.config);

        this.codeGenerator = new CodeGenerator(this.client);
        this.testRunner = new TestRunner();

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

        this.logger.debug('Reading build.gradle.kts file');
        const buildGradlePath = path.join(this.config.projectRoot, 'build.gradle.kts');
        const buildGradleContent = fs.existsSync(buildGradlePath)
            ? fs.readFileSync(buildGradlePath, 'utf-8')
            : '';

        const results = await this.performCodeGenerationCycle(force);

        return { results };
    }

    async performCodeGenerationCycle(force: boolean = false): Promise<void> {
        this.logger.debug('Starting code generation cycle');

        this.runningState.resetCycleState();
        this.runningState.setCycleStartTime();

        const buildGradlePath = path.join(this.config.projectRoot, 'build.gradle.kts');
        const buildGradleContent = fs.existsSync(buildGradlePath)
            ? fs.readFileSync(buildGradlePath, 'utf-8')
            : '';

        if (!force) {
            this.logger.debug('Performing tests to determine if changes are needed');
            this.testRunner.runTests(this.config, this.runningState);

            if (this.runningState.buildState.compiledSuccessfully === false) {
                this.logger.info('Project compilation failed!');
            } else if (this.runningState.testResults.testsPassed) {
                this.logger.info('Project compiles and all tests passed! No changes needed.');
                return;
            }
        } else {
            this.runningState.testResults = {
                testsPassed: true,
                totalTests: 0,
                failedTests: [],
                passedTests: [],
                erroredTests: [],
                lastRunTime: null,
            };
        }

        if (
            this.runningState.buildState.compiledSuccessfully &&
            this.runningState.testResults.testsPassed &&
            !force
        ) {
            this.logger.info('Project compiles and all tests passed! No changes needed.');
            return;
        }

        this.logger.debug('Collecting files for code generation');

        const codeFiles = collectFilesWithExtension(
            [path.join(this.config.projectRoot, 'src/main')],
            this.config.extension
        );

        const testFiles = this.collectTestFiles(force);

        this.logger.debug(
            `${codeFiles.length} code files and ${testFiles.length} test files will be used for code generation`
        );

        const filesContent = [...codeFiles, ...testFiles]
            .map((file) => {
                const relativePath = path.relative(this.config.projectRoot, file.path);
                return `File: ${relativePath}\n\n${file.content}`;
            })
            .join('\n\n');

        const prompt = this.constructPrompt(filesContent, buildGradleContent);

        this.logger.debug('Sending prompt to AI service');

        const generatedCode = await this.generateCodeWithRetries(prompt);

        const codeChanges = this.codeGenerator.applyGeneratedCode(
            generatedCode,
            this.config,
            this.runningState
        );

        this.runningState.codeChanges = codeChanges;
        this.runningState.generationCycles++;

        this.logger.debug('Retrying tests after applying AI-generated code');
        this.testRunner.runTests(this.config, this.runningState);

        this.logger.info(`Tests passed: ${this.runningState.testResults.testsPassed}`);

        if (!this.runningState.testResults.testsPassed) {
            this.logger.info(`Last run output: ${this.runningState.lastRunOutput}`);
        }
        this.logger.info(`Project compiled successfully: ${this.runningState.buildState.compiledSuccessfully}`);
    }

    collectTestFiles(force: boolean): CodeFile[] {
        let testFiles: CodeFile[] = [];

        if (this.runningState.buildState.compiledSuccessfully === false) {
            testFiles = collectFilesWithExtension(
                [this.config.testDir],
                this.config.extension
            );
        } else if (!this.runningState.testResults.testsPassed) {
            testFiles = this.runningState.testResults.failedTests.map((test) => {
                const className = this.extractClassNameFromTest(test);
                const testFilePath = path.join(
                    this.config.testDir,
                    className.replace(/\./g, '/') + this.config.extension
                );
                this.logger.debug(`Constructed test file path: ${testFilePath}`);

                return {
                    path: testFilePath,
                    content: fs.existsSync(testFilePath)
                        ? fs.readFileSync(testFilePath, 'utf-8')
                        : '',
                };
            });
        } else if (force) {
            testFiles = collectFilesWithExtension(
                [path.join(this.config.testDir)],
                this.config.extension
            );
        }

        return testFiles;
    }

    extractClassNameFromTest(test: string): string {
        let className = '';

        if (test.includes('(')) {
            const match = test.match(/\(([^)]+)\)/);
            className = match ? match[1] : test;
        } else {
            className = test;
        }

        const parts = className.split('.');
        const lastPart = parts[parts.length - 1];
        if (lastPart && lastPart[0] === lastPart[0].toLowerCase()) {
            className = parts.slice(0, -1).join('.');
        }

        return className;
    }

    constructPrompt(filesContent: string, buildGradleContent: string): string {
        let prompt;

        if (this.runningState.testResults.testsPassed) {
            prompt = this.config.noIssuePromptTemplate
                .replace('{filesContent}', filesContent)
                .replace('{buildGradleContent}', buildGradleContent);

            if (this.runningState.accumulatedHints.length > 0) {
                prompt += `\n\nUser hints: ${this.runningState.accumulatedHints.join('; ')}`;
            }
        } else {
            prompt = this.config.promptTemplate
                .replace('{testOutput}', this.runningState.lastRunOutput)
                .replace('{filesContent}', filesContent)
                .replace('{buildGradleContent}', buildGradleContent);

            if (this.runningState.accumulatedHints.length > 0) {
                prompt += `\n\nHints for improvement: ${this.runningState.accumulatedHints.join('; ')}`;
            }
        }

        return prompt;
    }

    async generateCodeWithRetries(prompt: string): Promise<string> {
        const spinner = startSpinner('Generating code');
        let generatedCode: string = '';
        const maxAttempts = this.config.numRetries || 3;

        for (let attempts = 1; attempts <= maxAttempts; attempts++) {
            try {
                generatedCode = await this.codeGenerator.generateCode(prompt, this.config);
                break;
            } catch (error: any) {
                this.logger.error(`Error generating code (attempt ${attempts}): ${error.message}`);
                if (attempts < maxAttempts) {
                    this.logger.info('Retrying code generation...');
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
        logger.info(`Starting AI Pair Runner with model: ${this.config.model}`);

        if (!this.runningState) {
            console.log('RunningState is not initialized, initializing...');
            this.runningState = new RunningState();
        }

        await this.performCodeGenerationCycle();

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
                    logger.info('Forcing code generation...');
                    await this.performCodeGenerationCycle(true);
                    break;
                case 'w':
                    logger.info('Starting to watch for file changes...');
                    await this.watchForChanges();
                    break;
                case 'h':
                    const hint = readline.question('Enter your hint: ');
                    this.runningState.addHint(hint);
                    await this.performCodeGenerationCycle(true);
                    break;
                case 'x':
                case 'e':
                    logger.info('Exiting AI Pair Runner.');
                    exit = true;
                    break;
                default:
                    console.log('Invalid choice. Please try again.');
            }
        }
    }

    async watchForChanges(): Promise<void> {
        this.logger.info('Watching for file changes...');
        return new Promise((resolve) => {
            const srcDirPath = path.resolve(this.config.srcDir);
            const testDirPath = path.resolve(this.config.testDir);

            this.logger.info(`Source directory being watched: ${srcDirPath}`);
            this.logger.info(`Test directory being watched: ${testDirPath}`);

            const watcher = chokidar.watch([srcDirPath, testDirPath], {
                persistent: true,
            });

            watcher.on('ready', () => {
                this.logger.info('Initial scan complete. Ready for changes.');
                const watchedPaths = watcher.getWatched();
                for (const dir in watchedPaths) {
                    watchedPaths[dir].forEach((file) => {
                        this.logger.debug(`Watching: ${path.join(dir, file)}`);
                    });
                }
            });

            watcher.on('change', async (filePath) => {
                this.logger.info(`File changed: ${filePath}`);
                await this.performCodeGenerationCycle();
            });

            watcher.on('add', async (filePath) => {
                this.logger.info(`File added: ${filePath}`);
                await this.performCodeGenerationCycle();
            });

            watcher.on('unlink', async (filePath) => {
                this.logger.info(`File removed: ${filePath}`);
                await this.performCodeGenerationCycle();
            });

            watcher.on('error', (error) => {
                this.logger.error(`Watcher error: ${error}`);
            });
        });
    }
}

export default AIPair; 