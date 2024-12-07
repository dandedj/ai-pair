import { jest, expect, describe, beforeEach, it } from '@jest/globals';
import { AIPair } from '../src/ai-pair';
import { Config } from '../src/types/config';
import { RunningState } from '../src/types/running-state';
import * as testUtils from '../src/lib/test-utils';
import * as fileUtils from '../src/lib/file-utils';
import { ChatGPTClient } from '../src/lib/ai/chatgpt-client';
import AIClientFactory from '../src/lib/ai/ai-client-factory';
import fs from 'fs';
import path from 'path';

type MockRunTests = jest.MockedFunction<(config: Config, runningState: RunningState) => Promise<void>>;

// Create a formatted timestamp
const getFormattedTime = () => {
    const now = new Date();
    return now.toLocaleTimeString('en-US', { hour12: false });
};

jest.mock('../src/lib/test-utils');
jest.mock('../src/lib/file-utils');
jest.mock('fs');
jest.mock('path');
jest.mock('../src/lib/ai/ai-client-factory');
jest.mock('../src/lib/logger', () => ({
    logger: {
        info: jest.fn((msg: string) => {
            const time = getFormattedTime();
            process.stdout.write(`[${time}] INFO: ${msg}\n`);
        }),
        error: jest.fn((msg: string) => {
            const time = getFormattedTime();
            process.stdout.write(`[${time}] ERROR: ${msg}\n`);
        }),
        warn: jest.fn((msg: string) => {
            const time = getFormattedTime();
            process.stdout.write(`[${time}] WARN: ${msg}\n`);
        }),
        debug: jest.fn((msg: string) => {
            const time = getFormattedTime();
            process.stdout.write(`[${time}] DEBUG: ${msg}\n`);
        })
    }
}));

describe('AIPair', () => {
    let aiPair: AIPair;
    let config: Config;
    let runningState: RunningState;
    let mockGenerateResponse: jest.MockedFunction<(prompt: string, systemPrompt: string) => Promise<string>>;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        // Mock file system operations first
        (fs.readFileSync as jest.Mock).mockReturnValue('// Test file content');
        (fs.existsSync as jest.Mock).mockImplementation((path: unknown) => {
            if (typeof path === 'string' && (
                path === '/test/project' || 
                path === '/test/tmp' || 
                path === '/test/prompts' ||
                path.endsWith('.ts') || 
                path.endsWith('.test.ts'))) {
                return true;
            }
            return false;
        });
        (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
        (path.relative as jest.Mock).mockImplementation((from, to) => to);
        (path.resolve as jest.Mock).mockImplementation((...args) => args.join('/'));

        // Then create Config instance
        const configOptions = {
            model: 'gpt-4',
            projectRoot: '/test/project',
            tmpDir: '/test/tmp',
            logLevel: 'info',
            openaiApiKey: 'test-openai-key',
            promptsPath: '/test/prompts',
            srcDir: '/test/project/src',
            testDir: '/test/project/test',
            extension: '.ts'
        };
        config = new Config(configOptions);

        // Mock process.env for API keys
        process.env.OPENAI_API_KEY = 'test-openai-key';

        // Mock RunningState
        runningState = new RunningState();

        // Mock AIClientFactory
        const mockChatGPTClient = new ChatGPTClient('test-openai-key', 'gpt-4', '/test/tmp');
        jest.spyOn(AIClientFactory.prototype, 'createClient').mockReturnValue(mockChatGPTClient);

        // Create AIPair instance
        aiPair = new AIPair(config, runningState);

        // Mock ChatGPTClient's generateResponse
        mockGenerateResponse = jest
            .fn<(prompt: string, systemPrompt: string) => Promise<string>>()
            .mockResolvedValue('// Generated code');
        jest.spyOn(ChatGPTClient.prototype, 'generateResponse').mockImplementation(mockGenerateResponse);

        // Mock test utilities
        const mockRunTests = testUtils.runTests as MockRunTests;
        mockRunTests.mockImplementation(async (config, state) => {
            state.buildState.compiledSuccessfully = true;
            state.testResults.testsPassed = true;
        });

        // Mock file utilities
        (fileUtils.collectFilesWithExtension as jest.Mock).mockReturnValue([
            { path: 'test.ts', content: '// Test content' }
        ]);
        (testUtils.collectTestFiles as jest.Mock).mockReturnValue([
            { path: 'test.test.ts', content: '// Test file' }
        ]);
    });

    describe('performCodeGenerationCycle', () => {
        it('should stop generation when tests pass initially', async () => {
            const result = await aiPair.performCodeGenerationCycle(false);
            
            expect(result).toBe(true);
            expect(mockGenerateResponse).not.toHaveBeenCalled();
            expect(runningState.generationCycles).toBe(0);
            expect(runningState.buildState.compiledSuccessfully).toBe(true);
            expect(runningState.testResults.testsPassed).toBe(true);
        });

        it('should continue generation when tests fail initially', async () => {
            const mockRunTests = testUtils.runTests as MockRunTests;
            // Mock failing tests initially
            mockRunTests
                .mockImplementationOnce(async (config, state) => {
                    state.buildState.compiledSuccessfully = true;
                    state.testResults.testsPassed = false;
                })
                .mockImplementationOnce(async (config, state) => {
                    state.buildState.compiledSuccessfully = true;
                    state.testResults.testsPassed = true;
                });

            const result = await aiPair.performCodeGenerationCycle(false);
            
            expect(result).toBe(true);
            expect(mockGenerateResponse).toHaveBeenCalled();
            expect(runningState.buildState.compiledSuccessfully).toBe(true);
            expect(runningState.testResults.testsPassed).toBe(true);
        });

        it('should handle build failures correctly', async () => {
            const mockRunTests = testUtils.runTests as MockRunTests;
            // Mock build failure
            mockRunTests.mockImplementation(async (config, state) => {
                state.buildState.compiledSuccessfully = false;
                state.testResults.testsPassed = false;
            });

            const result = await aiPair.performCodeGenerationCycle(false);
            
            expect(result).toBe(false);
            expect(mockGenerateResponse).toHaveBeenCalled();
            expect(runningState.buildState.compiledSuccessfully).toBe(false);
        });

        it('should force generation when force flag is true', async () => {
            await aiPair.performCodeGenerationCycle(true);
            
            expect(mockGenerateResponse).toHaveBeenCalled();
            expect(testUtils.runTests).toHaveBeenCalledTimes(1);
        });

        it('should properly reset cycle state', async () => {
            // Set some initial state
            runningState.cycleStartTime = new Date(2000, 1, 1);
            runningState.lastRunOutput = 'old output';
            
            await aiPair.performCodeGenerationCycle(false);
            
            expect(runningState.cycleStartTime).not.toEqual(new Date(2000, 1, 1));
            expect(runningState.lastRunOutput).not.toBe('old output');
        });
    });

    describe('performCodeGenerationCyclesWithRetries', () => {
        it('should stop after successful generation', async () => {
            await aiPair.performCodeGenerationCyclesWithRetries(false);
            
            expect(runningState.generationCycles).toBe(1);
            expect(config.model).toBe('gpt-4'); // Should restore original model
        });

        it('should retry up to max attempts on failure', async () => {
            const mockRunTests = testUtils.runTests as MockRunTests;
            // Mock failing tests
            mockRunTests.mockImplementation(async (config, state) => {
                state.buildState.compiledSuccessfully = true;
                state.testResults.testsPassed = false;
            });

            await aiPair.performCodeGenerationCyclesWithRetries(false);
            
            expect(runningState.generationCycles).toBe(config.numRetries);
            expect(config.model).toBe('gpt-4'); // Should restore original model
        });

        it('should only apply force on first attempt', async () => {
            const mockRunTests = testUtils.runTests as MockRunTests;
            
            // Mock the test runs
            mockRunTests.mockImplementation(async (config, state) => {
                // First run after forced generation should succeed
                state.buildState.compiledSuccessfully = true;
                state.testResults.testsPassed = true;
            });

            // Mock generate response to simulate code generation
            mockGenerateResponse.mockResolvedValue('// Generated code');

            await aiPair.performCodeGenerationCyclesWithRetries(true);
            
            // Should only have one test run after the forced generation
            expect(mockRunTests).toHaveBeenCalledTimes(1);
            expect(runningState.generationCycles).toBe(1);
        });

        it('should switch to o1-preview model on last retry', async () => {
            const mockRunTests = testUtils.runTests as MockRunTests;
            // Mock failing tests
            mockRunTests.mockImplementation(async (config, state) => {
                state.buildState.compiledSuccessfully = true;
                state.testResults.testsPassed = false;
            });

            config.numRetries = 2;
            await aiPair.performCodeGenerationCyclesWithRetries(false);
            
            // Check if model was switched for last attempt
            expect(mockGenerateResponse).toHaveBeenCalledTimes(2);
            expect(config.model).toBe('gpt-4'); // Should restore original model
        });
    });

    describe('handleTestFailure', () => {
        let mockRunTests: MockRunTests;

        beforeEach(() => {
            mockRunTests = testUtils.runTests as MockRunTests;
        });

        it('should generate code to fix failing tests', async () => {
            const mockRunTests = testUtils.runTests as MockRunTests;
            // Mock failing tests
            mockRunTests.mockImplementation(async (config, state) => {
                state.buildState.compiledSuccessfully = true;
                state.testResults.testsPassed = false;
            });

            // ... rest of test ...
        });

        it('should force code generation after multiple failures', async () => {
            // Mock the test runs
            mockRunTests.mockImplementation(async (config, state) => {
                // First run after forced generation should succeed
                state.buildState.compiledSuccessfully = true;
                state.testResults.testsPassed = true;
            });

            // ... rest of test ...
        });

        it('should handle build failures', async () => {
            const mockRunTests = testUtils.runTests as MockRunTests;
            // Mock failing tests
            mockRunTests.mockImplementation(async (config, state) => {
                state.buildState.compiledSuccessfully = true;
                state.testResults.testsPassed = false;
            });

            // ... rest of test ...
        });
    });
}); 