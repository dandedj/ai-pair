const path = require("path");
const readline = require("readline-sync");
const chokidar = require("chokidar");
const fs = require("fs");
const ChatGPTClient = require("./lib/ai/chatgpt-client");
const ClaudeClient = require("./lib/ai/claude-client");
const GeminiClient = require("./lib/ai/gemini-client");
const { parseAndApplyGeneratedCode } = require("./lib/code-parser");
const {
    collectFilesWithExtension,
    clearDirectory,
} = require("./lib/file-utils");
const AIClientFactory = require('./lib/ai-client-factory');
const configData = require('./config');
const TestRunner = require('./lib/test-runner');
const CodeGenerator = require('./lib/code-generator');
const { delay, startSpinner } = require('./lib/utils');
const { logger } = require('./lib/logger');

class AIPair {
    constructor(config, runningState) {
        this.config = { ...config, ...configData };
        this.runningState = runningState;
        this.logger = logger;
        this.testRunner = new TestRunner();
        this.codeGenerator = new CodeGenerator(config, this.client, runningState, this.logger);

        // Initialize AI client using the factory
        const clientFactory = new AIClientFactory(config);
        this.client = clientFactory.createClient(config.model);

        // AI model to client mapping
        this.models = {
            "gpt-4o": "openai",
            "gpt-4o-mini": "openai",
            "gpt-3.5-turbo": "openai",
            "claude-3-5-sonnet-20241022": "anthropic",
            "claude-3-5-sonnet": "anthropic",
            "gemini-1.5-pro": "gemini",
            "gemini-2": "gemini",
        };
    }

    getApiKeyForModel(model) {
        const family = this.models[model];
        const apiKey = this.config.apiKeys[family];

        if (!apiKey) {
            const errorMsg = `Error: No API key found for ${family} model family. Please set the appropriate API key in the configuration.`;
            console.error(errorMsg);
            throw new Error(errorMsg);
        }

        return apiKey;
    }

    selectAIClient(apiKey, model) {
        const family = this.models[model];
        if (family === "openai") {
            return new ChatGPTClient(apiKey, model, this.config.tmpDir);
        } else if (family === "anthropic") {
            return new ClaudeClient(apiKey, model, this.config.tmpDir);
        } else if (family === "gemini") {
            return new GeminiClient(apiKey, model, this.config.tmpDir);
        }
        this.logger.warn("Model not recognized, defaulting to ChatGPTClient.");
        return new ChatGPTClient(apiKey, model, this.config.tmpDir);
    }

    /**
     * Runs the AI pair programming process without user interaction.
     * @param {boolean} force - If true, forces code generation even if tests pass.
     * @returns {Promise<Object>} - Detailed results of the code generation and testing process.
     */
    async runWithoutInteraction(force = false) {
        this.logger.debug('Clearing temporary directories');
        clearDirectory(this.config.tmpDir);
        clearDirectory(path.join(this.config.tmpDir, 'archive', 'versions'));

        this.logger.debug('Reading build.gradle.kts file');
        const buildGradlePath = path.join(this.config.projectRoot, 'build.gradle.kts');
        this.buildGradleContent = fs.existsSync(buildGradlePath)
            ? fs.readFileSync(buildGradlePath, 'utf-8')
            : '';

        // Perform code generation cycle and collect results
        const results = await this.performCodeGenerationCycle(force);

        // Combine results
        return {
            results,
        };
    }

    /**
     * Performs a code generation cycle, including testing and applying AI-generated code.
     * @param {boolean} force - If true, forces code generation even if tests pass.
     */
    async performCodeGenerationCycle(force = false) {
        this.logger.debug("Starting code generation cycle");

        // set the cycle start time
        this.runningState.setCycleStartTime();

        // Read build.gradle.kts file
        const buildGradlePath = path.join(this.config.projectRoot, 'build.gradle.kts');
        this.buildGradleContent = fs.existsSync(buildGradlePath)
            ? fs.readFileSync(buildGradlePath, 'utf-8')
            : '';

        if (!force) {
            this.logger.debug("Performing tests to determine if changes are needed");
            this.testRunner.runTests(this.config, this.runningState);

            // if the build didn't compile, we need to generate code
            if (this.runningState.buildState.compiledSuccessfully === false) {
                this.logger.info("Project compilation failed!");
            } else if (this.runningState.testsPassed) {
                this.logger.info("Project compiles and all tests passed! No changes needed.");
                return; // Exit the method as no further action is needed
            }
        } else {
            this.runningState.testResults = {
                compilationFailed: false,
                failedTests: [],
                testsPassed: true,
            };
        }

        this.logger.debug("Collecting files for code generation");

        // Collect code files
        const codeFiles = collectFilesWithExtension(
            [path.join(this.config.projectRoot, "src/main")],
            this.config.extension
        );

        // Collect test files based on test results
        const testFiles = this.collectTestFiles(force);

        this.logger.debug(
            `${codeFiles.length} code files and ${testFiles.length} test files will be used for code generation`
        );

        const filesContent = [...codeFiles, ...testFiles]
            .map((file) => {
                const relativePath = path.relative(this.config.projectRoot, file.path);
                return `File: ${relativePath}\n\n${file.content}`;
            })
            .join("\n\n");

        const prompt = this.constructPrompt(filesContent);

        // Log the prompt to session log
        const sessionLogFilePath = path.join(this.config.tmpDir, "session_log.txt");
        fs.appendFileSync(
            sessionLogFilePath,
            `Prompt at ${new Date().toISOString()}:\n${prompt}\n\n`
        );

        this.logger.debug("Sending prompt to AI service");

        // Generate code with AI client
        const generatedCode = await this.generateCodeWithRetries(prompt);

        // Parse and apply the generated code
        const codeChanges = parseAndApplyGeneratedCode(
            this.config,
            generatedCode,
            this.runningState
        );

        // Update runningState with code changes
        this.runningState.codeChanges = codeChanges;
        this.runningState.generationCycles++;
        // Run tests again after applying changes
        this.logger.debug("Retrying tests after applying AI-generated code");
        this.testRunner.runTests(this.config, this.runningState);

        // show if the tests passed and the project compiled successfully
        this.logger.info(`Tests passed: ${this.runningState.testResults.testsPassed}`);

        if (!this.runningState.testResults.testsPassed) {
            // log the last run output
            this.logger.info(`Last run output: ${this.runningState.lastRunOutput}`);
        }
        this.logger.info(`Project compiled successfully: ${this.runningState.buildState.compiledSuccessfully}`);
    }

    /**
     * Collects test files based on test results and force flag.
     * @param {boolean} force - If true, collect all test files.
     * @returns {Array} - Array of test file objects.
     */
    collectTestFiles(force) {
        let testFiles = [];

        if (this.runningState.buildState.compiledSuccessfully === false) {
            // Include all test files if compilation failed
            testFiles = collectFilesWithExtension(
                [this.config.testDir],
                this.config.extension
            );
        } else if (!this.runningState.testResults.testsPassed) {
            // Include only the failed test files
            testFiles = this.runningState.testResults.failedTests.map((test) => {
                const className = this.extractClassNameFromTest(test);
                const testFilePath = path.join(
                    this.config.testDir,
                    className.replace(/\./g, "/") + this.config.extension
                );
                this.logger.debug(`Constructed test file path: ${testFilePath}`);

                return {
                    path: testFilePath,
                    content: fs.existsSync(testFilePath)
                        ? fs.readFileSync(testFilePath, "utf-8")
                        : "",
                };
            });
        } else if (force) {
            // Include all test files if forced
            testFiles = collectFilesWithExtension(
                [path.join(this.config.testDir)],
                this.config.extension
            );
        }

        return testFiles;
    }

    /**
     * Extracts the class name from a test name.
     * @param {string} test - The test name.
     * @returns {string} - The class name.
     */
    extractClassNameFromTest(test) {
        let className = "";

        if (test.includes("(")) {
            const match = test.match(/\(([^)]+)\)/);
            className = match ? match[1] : test;
        } else {
            className = test;
        }

        const parts = className.split(".");
        const lastPart = parts[parts.length - 1];
        if (lastPart && lastPart[0] === lastPart[0].toLowerCase()) {
            className = parts.slice(0, -1).join(".");
        }

        return className;
    }

    /**
     * Constructs the prompt to be sent to the AI client.
     * @param {string} filesContent - The content of the code and test files.
     * @returns {string} - The constructed prompt.
     */
    constructPrompt(filesContent) {
        let prompt;

        if (this.runningState.testResults.testsPassed) {
            // Use no-issue prompt from config
            prompt = this.config.noIssuePromptTemplate
                .replace("{filesContent}", filesContent)
                .replace("{buildGradleContent}", this.buildGradleContent);

            if (this.runningState.accumulatedHints.length > 0) {
                prompt += `\n\nUser hints: ${this.runningState.accumulatedHints.join("; ")}`;
            }
        } else {
            // Use issue prompt from config
            prompt = this.config.promptTemplate
                .replace("{testOutput}", this.runningState.lastRunOutput)
                .replace("{filesContent}", filesContent)
                .replace("{buildGradleContent}", this.buildGradleContent);

            if (this.runningState.accumulatedHints.length > 0) {
                prompt += `\n\nHints for improvement: ${this.runningState.accumulatedHints.join("; ")}`;
            }
        }

        return prompt;
    }

    /**
     * Generates code using the AI client, with retry logic.
     * @param {string} prompt - The prompt to send to the AI client.
     * @returns {Promise<string>} - The generated code from the AI client.
     */
    async generateCodeWithRetries(prompt) {
        const spinner = startSpinner('Generating code');
        let generatedCode;
        const maxAttempts = this.config.numRetries || 3;

        for (let attempts = 1; attempts <= maxAttempts; attempts++) {
            try {
                generatedCode = await this.client.generateCode(
                    prompt,
                    this.config.tmpDir,
                    this.config.systemPrompt
                );
                break; // Success
            } catch (error) {
                this.logger.error(`Error generating code (attempt ${attempts}): ${error.message}`);
                if (attempts < maxAttempts) {
                    this.logger.info('Retrying code generation...');
                    await delay(1000); // Wait before retrying
                } else {
                    clearInterval(spinner);
                    throw new Error('Failed to generate code after multiple attempts.');
                }
            }
        }
        clearInterval(spinner);
        return generatedCode;
    }

    /**
     * Runs the AI pair programming process with user interaction.
     */
    async runWithInteraction() {
        logger.info(`Starting AI Pair Runner with model: ${this.config.model}`);

        // validate that the runningState is initialized
        if (!this.runningState) {
            console.log("RunningState is not initialized, initializing...");
            // initialize the runningState
            this.runningState = new RunningState();
        }

        let exit = false;

        while (!exit) {
            // Run a code generation cycle
            await this.performCodeGenerationCycle();

            // Prompt for the next action
            console.log('\nSelect an action:');
            console.log('c - Continue and force code generation');
            console.log('w - Watch code files for changes');
            console.log('h - Provide a hint');
            console.log('x or e - Exit');
            const action = readline.question('Enter your choice: ');

            switch (action.toLowerCase()) {
                case 'c':
                    logger.info('Forcing code generation...');
                    await this.performCodeGenerationCycle(true); // Force code generation
                    break;
                case 'w':
                    logger.info('Starting to watch for file changes...');
                    await this.watchForChanges();
                    break;
                case 'h':
                    const hint = readline.question('Enter your hint: ');
                    this.runningState.addHint(hint);
                    await this.performCodeGenerationCycle(true); // Run after adding hint
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

    /**
     * Watches the code files for changes and runs a code generation cycle when changes occur.
     */
    async watchForChanges() {
        logger.info('Watching for file changes...');
        return new Promise((resolve) => {
            const watcher = chokidar.watch(this.config.projectRoot, {
                ignored: /(^|[\/\\])\../, // ignore dotfiles
                ignoreInitial: false,
                depth:  undefined,
                persistent: true,
            });

            // log the directory that is being watched
            logger.info(`Watching directory: ${this.config.projectRoot}`);

            watcher.on('change', async (filePath) => {
                logger.info(`File changed: ${filePath}`);
                // Run code generation
                await this.performCodeGenerationCycle();
            });

            // Allow the user to stop watching
            console.log('Press "x" or "e" and Enter to stop watching for changes.');

            const checkForExit = () => {
                const input = readline.question('');
                if (input.toLowerCase() === 'x' || input.toLowerCase() === 'e') {
                    watcher.close();
                    logger.info('Stopped watching for file changes.');
                    resolve();
                } else {
                    checkForExit();
                }
            };

            checkForExit();
        });
    }
}

module.exports = AIPair;
