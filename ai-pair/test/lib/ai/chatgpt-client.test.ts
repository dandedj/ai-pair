import { jest, expect } from '@jest/globals';
import { ChatGPTClient } from '../../../src/lib/ai/chatgpt-client';
import { logger } from '../../../src/lib/logger';
import OpenAI from 'openai';

jest.mock('openai');
jest.mock('../../../src/lib/logger');

describe('ChatGPTClient', () => {
    let client: ChatGPTClient;
    let mockCreate: jest.MockedFunction<(params: OpenAI.Chat.ChatCompletionCreateParamsNonStreaming) => Promise<OpenAI.Chat.ChatCompletion>>;

    beforeEach(() => {
        jest.clearAllMocks();
        client = new ChatGPTClient('test-key', 'gpt-4', '/tmp');
        mockCreate = jest.fn();
        ((client as unknown) as { openai: Pick<OpenAI, 'chat'> }).openai = {
            chat: {
                completions: { create: mockCreate },
                _client: {}
            } as unknown as OpenAI.Chat
        };
    });

    describe('generateResponse', () => {
        it('should use standard configuration for non-o1 models', async () => {
            const mockResponse: OpenAI.Chat.ChatCompletion = {
                id: 'test-id',
                object: 'chat.completion',
                created: Date.now(),
                model: 'gpt-4',
                choices: [{ 
                    index: 0,
                    message: { 
                        role: 'assistant', 
                        content: 'Test response',
                        refusal: null
                    },
                    finish_reason: 'stop',
                    logprobs: null
                }],
                usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
            };

            mockCreate.mockResolvedValue(mockResponse);

            await client.generateResponse('test prompt', 'test system prompt');

            expect(mockCreate).toHaveBeenCalledWith({
                model: 'gpt-4',
                messages: [
                    { role: 'system', content: 'test system prompt' },
                    { role: 'user', content: 'test prompt' }
                ],
                temperature: 0.2,
                max_tokens: 4000
            });
        });

        it('should use special configuration for o1 models', async () => {
            client = new ChatGPTClient('test-key', 'o1-model', '/tmp');
            ((client as unknown) as { openai: Pick<OpenAI, 'chat'> }).openai = {
                chat: {
                    completions: { create: mockCreate },
                    _client: {}
                } as unknown as OpenAI.Chat
            };

            const mockResponse: OpenAI.Chat.ChatCompletion = {
                id: 'test-id',
                object: 'chat.completion',
                created: Date.now(),
                model: 'o1-model',
                choices: [{ 
                    index: 0,
                    message: { 
                        role: 'assistant', 
                        content: 'Test response',
                        refusal: null
                    },
                    finish_reason: 'stop',
                    logprobs: null
                }],
                usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
            };

            mockCreate.mockResolvedValue(mockResponse);

            await client.generateResponse('test prompt', 'test system prompt');

            expect(mockCreate).toHaveBeenCalledWith({
                model: 'o1-model',
                messages: [
                    { role: 'user', content: 'test prompt' }
                ],
                max_completion_tokens: 25000
            });
        });

        it('should handle API errors', async () => {
            mockCreate.mockRejectedValue(new Error('API error'));
            await expect(client.generateResponse('test', 'test'))
                .rejects
                .toThrow('API error');
            expect(logger.error).toHaveBeenCalled();
        });
    });
}); 