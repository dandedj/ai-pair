import { CodeFile, Config, RunningState, Status } from 'ai-pair-types';
import fs from 'fs';
import path from 'path';
import AIClientFactory from './lib/ai/ai-client-factory';
import { ChatGPTClient } from './lib/ai/chatgpt-client';
import { ClaudeClient } from './lib/ai/claude-client';
import { GeminiClient } from './lib/ai/gemini-client';
import { constructPrompt } from './lib/ai/prompt-utils';
import { parseAndApplyGeneratedCode } from './lib/code-parser';
import { clearDirectory, collectFilesWithExtension } from './lib/file-utils';
import { Logger } from './lib/logger';
import { buildProject, collectTestFiles, runTests } from './lib/test-utils';

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
        this.runningState.resetCycleState();
        this.logger.debug(`Starting cycle ${this.runningState.generationCycleDetails.length + 1} with model: ${this.config.model}`);
        const currentCycle = this.runningState.startNewCycle(this.config.model);

        await this.runningState.withPhase(Status.BUILDING, async () => {
            const result = await buildProject(this.config, currentCycle, false);
            return result;
        });

        if (currentCycle?.initialBuildState.compiledSuccessfully) {
            await this.runningState.withPhase(Status.TESTING, async () => {
                const result = await runTests(this.config, currentCycle, false);
                return result;
            });
        }

        if (!force && currentCycle?.initialBuildState.compiledSuccessfully && 
            currentCycle?.initialTestResults.testsPassed) {
            this.logger.info('Project compiles and all tests passed! No changes needed.');
            this.runningState.updateCurrentCycleStatus(Status.COMPLETED);
            this.runningState.endCurrentCycle();
            return true;
        }

        await this.runningState.withPhase(Status.GENERATING_CODE, async () => {
            this.logger.debug('Collecting files for code generation');

            const buildGradlePath = path.join(this.config.projectRoot, 'build.gradle.kts');
            const buildGradleContent = await fs.readFileSync(buildGradlePath, 'utf8');

            const codeFiles = await collectFilesWithExtension(
                [path.join(this.config.projectRoot, 'src/main')],
                this.config.extension
            );

            const testFiles = await collectTestFiles(force, this.config);

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

            const generatedCode = await this.client.generateResponse(prompt, systemPrompt, cycleDir);
            const codeChanges = parseAndApplyGeneratedCode(this.config, currentCycle, generatedCode);
            if (currentCycle) {
                currentCycle.codeChanges = codeChanges;
            }
            return true;
        });

        if (currentCycle?.codeChanges.newFiles.length === 0 && 
            currentCycle?.codeChanges.modifiedFiles.length === 0 && 
            currentCycle?.codeChanges.buildFiles.length === 0 &&
            currentCycle?.finalBuildState.compiledSuccessfully && 
            currentCycle?.finalTestResults.testsPassed) {
            this.runningState.endCurrentCycle();
            this.runningState.updateCurrentCycleStatus(Status.COMPLETED);
            return true;
        }

        this.logger.debug('Retrying tests after applying AI-generated code');

        await this.runningState.withPhase(Status.REBUILDING, async () => {
            const result = await buildProject(this.config, currentCycle, true);
            return result;
        });

        // Only run final tests if build succeeded
        if (currentCycle?.finalBuildState.compiledSuccessfully) {
            await this.runningState.withPhase(Status.RETESTING, async () => {
                await runTests(this.config, currentCycle, true);
                return true;
            });
        }

        this.logger.debug(`Tests passed: ${currentCycle?.finalTestResults.testsPassed}`);

        this.runningState.updateCurrentCycleStatus(Status.COMPLETED);
        this.runningState.endCurrentCycle();

        return currentCycle?.finalBuildState.compiledSuccessfully && 
               currentCycle?.finalTestResults.testsPassed || false;
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
export { AIPair, CodeFile };
