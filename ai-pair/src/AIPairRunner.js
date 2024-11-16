require("dotenv").config();
const minimist = require("minimist");
const path = require("path");
const readline = require("readline-sync");
const chokidar = require("chokidar");
const fs = require("fs");
const ChatGPTClient = require("./lib/ai/ChatGPTClient");
const ClaudeClient = require("./lib/ai/ClaudeClient");
const GeminiClient = require("./lib/ai/GeminiClient");
const { parseAndApplyGeneratedCode } = require("./lib/CodeParser");
const {
    collectFilesWithExtension,
    clearDirectory,
} = require("./lib/FileUtils");
const { runTests } = require("./lib/TestUtils");
const { getLogger, isLoggerInitialized } = require('./lib/logger');

class AIPairRunner {
    constructor(config, runningState) {
        this.config = config;
        this.runningState = runningState;
        this.logger = require('./lib/logger');

        // Initialize logger
        if (!isLoggerInitialized()) {
            this.logger = getLogger(this.config.tmpDir);
        } else {
            this.logger = getLogger();
        }

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

        // Initialize AI client
        this.client = this.selectAIClient(this.getApiKeyForModel(this.config.model), this.config.model);

        // Remove accumulatedHints from here, as it's now in RunningState
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

        // Collect token usage
        const tokenUsage = this.client.getTokenUsage();

        // Combine results
        return {
            ...results,
            tokenUsage,
        };
    }

    /**
     * Performs a code generation cycle, including testing and applying AI-generated code.
     * @param {boolean} force - If true, forces code generation even if tests pass.
     * @returns {Promise<Object>} - Detailed results of the code generation and testing process.
     */
    async performCodeGenerationCycle(force = false) {
        let testResults;
        let testOutput = "No test output yet.";

        if (!force) {
            this.logger.debug(
                "Performing initial tests to determine if changes are needed"
            );
            testResults = runTests(this.config.projectRoot, this.config.tmpDir);
            testOutput = fs.readFileSync(
                path.join(this.config.tmpDir, "test_output.txt"),
                "utf-8"
            );

            if (testResults.testsPassed) {
                this.logger.info(
                    "Project compiles and all tests passed! No changes needed."
                );
                return {
                    ...testResults,
                    filesChanged: 0,
                    filesAdded: 0,
                    meaningfulChanges: 0,
                    changedFiles: [],
                    newFiles: [],
                };
            }
        } else {
            testResults = {
                compilationFailed: false,
                failedTests: [],
                testsPassed: true,
            };
            testOutput =
                "Tests are passing, but user requested code generation.";
        }

        this.logger.debug("Collecting files for code generation");

        // Collect code files
        const codeFiles = collectFilesWithExtension(
            [path.join(this.config.projectRoot, "src/main")],
            this.config.extension
        );

        // Collect test files based on test results
        const testFiles = this.collectTestFiles(testResults, force);

        this.logger.debug(
            `${codeFiles.length} code files and ${testFiles.length} test files will be used for code generation`
        );

        const filesContent = [...codeFiles, ...testFiles]
            .map((file) => {
                const relativePath = path.relative(this.config.projectRoot, file.path);
                return `File: ${relativePath}\n\n${file.content}`;
            })
            .join("\n\n");

        const prompt = this.constructPrompt(testResults, testOutput, filesContent);

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
            this.config.projectRoot,
            this.config.tmpDir,
            this.config.extension,
            generatedCode
        );

        // Run tests again after applying changes
        this.logger.debug("Running tests after applying AI-generated code");
        testResults = runTests(this.config.projectRoot, this.config.tmpDir);

        if (!testResults.testsPassed) {
            testOutput = fs.readFileSync(
                path.join(this.config.tmpDir, "test_output.txt"),
                "utf-8"
            );
            this.logger.debug("Tests failed after applying AI changes");
        } else {
            this.logger.debug("All tests passed after applying AI changes");
        }

        // Combine and return results
        return {
            ...testResults,
            ...codeChanges,
            testOutput,
        };
    }

    /**
     * Collects test files based on test results and force flag.
     * @param {Object} testResults - The results from running tests.
     * @param {boolean} force - If true, collect all test files.
     * @returns {Array} - Array of test file objects.
     */
    collectTestFiles(testResults, force) {
        let testFiles = [];

        if (testResults.compilationFailed) {
            // Include all test files if compilation failed
            testFiles = collectFilesWithExtension(
                [path.join(this.config.projectRoot, "src/test/java")],
                this.config.extension
            );
        } else if (!testResults.testsPassed) {
            // Include only the failed test files
            testFiles = testResults.failedTests.map((test) => {
                const className = this.extractClassNameFromTest(test);
                const testFilePath = path.join(
                    this.config.projectRoot,
                    "src/test/java",
                    className.replace(/\./g, "/") + ".java"
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
                [path.join(this.config.projectRoot, "src/test/java")],
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
     * @param {Object} testResults - The results from running tests.
     * @param {string} testOutput - The output from running tests.
     * @param {string} filesContent - The content of the code and test files.
     * @returns {string} - The constructed prompt.
     */
    constructPrompt(testResults, testOutput, filesContent) {
        let prompt;

        if (testResults.testsPassed) {
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
                .replace("{testOutput}", testOutput)
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
        const spinner = this.startSpinner("Generating code");
        let generatedCode;
        const maxAttempts = this.config.numRetries || 3;

        for (let attempts = 1; attempts <= maxAttempts; attempts++) {
            try {
                generatedCode = await this.client.generateCode(
                    prompt,
                    this.config.tmpDir,
                    this.config.systemPrompt // Use systemPrompt from config
                );
                break; // Success
            } catch (error) {
                this.logger.error(
                    `Error generating code (attempt ${attempts}): ${error.message}`
                );
                if (attempts < maxAttempts) {
                    console.log("Retrying code generation...");
                    await this.delay(1000); // Wait before retrying
                } else {
                    clearInterval(spinner);
                    throw new Error("Failed to generate code after multiple attempts.");
                }
            }
        }
        clearInterval(spinner);

        return generatedCode;
    }

    /**
     * Starts a simple console spinner.
     * @param {string} message - The message to display with the spinner.
     * @returns {NodeJS.Timeout} - The interval ID for the spinner.
     */
    startSpinner(message) {
        const spinnerChars = ["|", "/", "-", "\\"];
        let index = 0;
        process.stdout.write(message);

        return setInterval(() => {
            process.stdout.write(`\r${message} ${spinnerChars[index]}`);
            index = (index + 1) % spinnerChars.length;
        }, 100);
    }

    /**
     * Delays execution for the specified time.
     * @param {number} ms - The number of milliseconds to wait.
     * @returns {Promise<void>}
     */
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Adds a hint to be used in the next code generation cycle.
     * @param {string} hint - The hint to add.
     */
    addHint(hint) {
        if (hint) {
            this.runningState.accumulatedHints.push(hint);
            this.logger.debug(`Added hint: ${hint}`);
        }
    }

    /**
     * Clears all accumulated hints.
     */
    clearHints() {
        this.runningState.accumulatedHints = [];
    }

    async run() {
        this.logger.info(`Starting AI Pair Runner with model: ${this.config.model}`);
        // Use this.config and this.runningState throughout the method
        // For example:
        this.logger.info(`Starting AI Pair Runner with model: ${this.config.model}`);
        // ... existing code ...
    }
}

module.exports = AIPairRunner;
