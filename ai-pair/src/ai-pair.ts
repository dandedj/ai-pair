import fs from 'fs';
import path from 'path';
import AIClientFactory from './lib/ai/ai-client-factory';
import { ChatGPTClient } from './lib/ai/chatgpt-client';
import { ClaudeClient } from './lib/ai/claude-client';
import { GeminiClient } from './lib/ai/gemini-client';
import { constructPrompt } from './lib/ai/prompt-utils';
import { clearDirectory, collectFilesWithExtension } from './lib/file-utils';
import { Logger } from './lib/logger';
import { runTests, collectTestFiles, buildProject } from './lib/test-utils';
import { Config } from './types/config';
import { CodeFile, RunningState, Status, GenerationCycleDetails } from './types/running-state';
import { parseAndApplyGeneratedCode } from './lib/code-parser';

type AIClient = ChatGPTClient | ClaudeClient | GeminiClient;
type ErrorWithMessage = { message: string };

class AIPair {
    config: Config;
    runningState: RunningState;
    logger: Logger;
    client: AIClient;
    clientFactory: AIClientFactory;
    models: { [key: string]: string };

    constructor(config: Config, runningState: RunningState) {
        this.config = config;
        this.runningState = runningState;
        this.logger = Logger.getInstance();
        this.logger.initialize(config.tmpDir, config.logLevel as 'debug' | 'info' | 'warn' | 'error');
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
            this.logger.error(errorMsg);
            throw new Error(errorMsg);
        }

        return apiKey;
    }

    selectAIClient(apiKey: string, model: string): AIClient {
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

    async performCodeGenerationCyclesWithRetries(force = false): Promise<void> {
        const originalModel = this.config.model;

        clearDirectory(this.config.tmpDir);

        while (this.runningState.generationCycleDetails.length < this.config.numRetries) {
            this.logger.info(`Performing code generation cycle ${this.runningState.generationCycleDetails.length + 1} of ${this.config.numRetries}`);
            
            if (this.runningState.generationCycleDetails.length === this.config.numRetries - 1 && this.config.escalateToPremiumModel) {
                this.logger.info(`Last retry, switching to ${this.config.escalationModel} model`);
                this.config.model = this.config.escalationModel;
                this.client = this.clientFactory.createClient(this.config);
            }

            const shouldForce = force && this.runningState.generationCycleDetails.length === 1;
            const success = await this.performCodeGenerationCycle(shouldForce);
            
            if (success) {
                this.logger.info('Code generation successful, tests passing');
                break;
            }
        }

        this.config.model = originalModel;
        this.client = this.clientFactory.createClient(this.config);
    }

    async performCodeGenerationCycle(force = false): Promise<boolean> {
        const lastRunOutputPath = path.join(this.config.tmpDir, 'last-run-output.log');
        
        if (fs.existsSync(lastRunOutputPath)) {
            fs.unlinkSync(lastRunOutputPath);
        }

        this.runningState.resetCycleState();
        this.logger.debug(`Starting new cycle with model: ${this.config.model}`);
        this.runningState.startNewCycle(this.config.model);

        this.runningState.status = Status.COMPILING;
        const buildSuccess = await buildProject(this.config, this.runningState, false);
        if (!buildSuccess) {
            this.logger.info('Project compilation failed!');
        }

        this.runningState.status = Status.TESTING;
        await runTests(this.config, this.runningState, false);
        this.runningState.updateTimings('testingEndTime', false);

        if (buildSuccess && this.runningState.currentCycle?.initialTestResults.testsPassed) {
            this.logger.info('Project compiles and all tests passed! No changes needed.');
            this.runningState.endCurrentCycle();
            return true;
        }

        this.runningState.status = Status.GENERATING_CODE;
        this.runningState.updateTimings('codeGenerationStartTime', true);

        this.logger.debug('Collecting files for code generation');

        // extract the build file content
        // TODO: handle both build.gradle and build.gradle.kts and other build file types
        const buildGradleContent = fs.readFileSync(path.join(this.config.projectRoot, 'build.gradle.kts'), 'utf8');

        const codeFiles = collectFilesWithExtension(
            [path.join(this.config.projectRoot, 'src/main')],
            this.config.extension
        );

        const testFiles = collectTestFiles(force, this.config);

        this.logger.debug(
            `${codeFiles.length} code files and ${testFiles.length} test files will be used for code generation`
        );

        const filesContent = [...codeFiles, ...testFiles]
            .map((file) => {
                const relativePath = path.relative(this.config.projectRoot, file.path);
                return `File: ${relativePath}\n\n${file.content}`;
            })
            .join('\n\n');

        // Create cycle directory and get paths
        const cycleDir = path.join(this.config.tmpDir, `generationCycle${this.runningState.generationCycleDetails.length}`);
        fs.mkdirSync(cycleDir, { recursive: true });

        const prompt = constructPrompt(this.config, this.runningState, filesContent, buildGradleContent);
        const systemPrompt = this.config.systemPrompt;

        this.logger.info(`Sending prompt to AI service : ${this.config.model}`);

        // Pass cycleDir for logging
        const generatedCode = await this.client.generateResponse(prompt, systemPrompt, cycleDir);
        this.runningState.updateTimings('codeGenerationEndTime', false);

        this.runningState.status = Status.APPLYING_CHANGES;

        const codeChanges = parseAndApplyGeneratedCode(this.config, this.runningState, generatedCode);

        this.runningState.codeChanges = codeChanges;

        // If no changes were made, and tests were already passing, we're done
        if (codeChanges.newFiles.length === 0 && 
            codeChanges.modifiedFiles.length === 0 && 
            codeChanges.buildFiles.length === 0 &&
            this.runningState.buildState.compiledSuccessfully && 
            this.runningState.testResults.testsPassed) {
            this.runningState.endCurrentCycle();
            return true;
        }

        this.logger.debug('Retrying tests after applying AI-generated code');
        this.runningState.resetCycleState();

        this.runningState.status = Status.RECOMPILING;
        const finalBuildSuccess = await buildProject(this.config, this.runningState, true);
        if (!finalBuildSuccess) {
            this.logger.info('Final build failed!');
            return false;
        }

        this.runningState.status = Status.RETESTING;
        this.runningState.updateTimings('retestingStartTime', true);
        await runTests(this.config, this.runningState, true);
        this.runningState.updateTimings('retestingEndTime', false);

        this.logger.debug(`Tests passed: ${this.runningState.currentCycle?.finalTestResults.testsPassed}`);

        if (!this.runningState.currentCycle?.finalTestResults.testsPassed) {
            this.logger.debug(`Last run output: ${this.runningState.lastRunOutput}`);
        }

        this.runningState.status = Status.COMPLETED;
        this.runningState.endCurrentCycle();

        return this.runningState.currentCycle?.finalBuildState.compiledSuccessfully && 
               this.runningState.currentCycle?.finalTestResults.testsPassed || false;
    }

    async generateCodeWithRetries(prompt: string, systemPrompt: string): Promise<string> {
        let generatedCode = '';
        const maxAttempts = this.config.numRetries;
        const cycleDir = path.join(this.config.tmpDir, `generationCycle${this.runningState.generationCycleDetails.length}`);

        for (let attempts = 1; attempts <= maxAttempts; attempts++) {
            try {
                generatedCode = await this.client.generateResponse(prompt, systemPrompt, cycleDir);
                break;
            } catch (error) {
                const err = error as ErrorWithMessage;
                this.logger.error(`Error generating code (attempt ${attempts}): ${err.message}`);
                if (attempts < maxAttempts) {
                    this.logger.info('Retrying code generation...');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } else {
                    throw new Error('Failed to generate code after multiple attempts.');
                }
            }
        }
        return generatedCode;
    }
}
export { AIPair, CodeFile, GenerationCycleDetails };
