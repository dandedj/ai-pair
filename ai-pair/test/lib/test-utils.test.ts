import { processTestResults } from '../../src/lib/test-utils';
import { Config } from '../../src/types/config';
import * as fs from 'fs';
import * as path from 'path';
import { jest, expect, describe, it, beforeEach } from '@jest/globals';

jest.mock('fs');
jest.mock('path');
jest.mock('../../src/lib/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    }
}));

describe('test-utils', () => {
    describe('processTestResults', () => {
        let config: Config;
        const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="org.example.OpenRTBTest" tests="1" skipped="0" failures="0" errors="0" timestamp="2024-11-30T20:56:29" hostname="mac.lan" time="0.015">
  <properties/>
  <testcase name="testOpenRTB()" classname="org.example.OpenRTBTest" time="0.015"/>
  <system-out><![CDATA[]]></system-out>
  <system-err><![CDATA[]]></system-err>
</testsuite>`;

        beforeEach(() => {
            config = {
                model: 'gpt-4',
                projectRoot: '/test/project',
                srcDir: '/test/project/src',
                testDir: '/test/project/test',
                promptsPath: '/test/project/prompts',
                tmpDir: '/test/project/tmp',
                logLevel: 'info',
                extension: '.java',
                apiKeys: {
                    openai: 'test-key',
                    anthropic: '',
                    gemini: ''
                },
                numRetries: 3,
                systemPrompt: '',
                promptTemplate: '',
                noIssuePromptTemplate: '',
                autoWatch: false,
                maxTokens: 4096,
                temperature: 0.7,
                escalateToPremiumModel: false,
                escalationModel: 'gpt-4'
            } as Config;

            // Mock filesystem
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readdirSync as jest.Mock).mockReturnValue(['TEST-org.example.OpenRTBTest.xml']);
            (fs.readFileSync as jest.Mock).mockReturnValue(mockXml);
            (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
        });

        it('should correctly parse test case metadata', () => {
            const results = processTestResults(config);

            expect(results.testsPassed).toBe(true);
            expect(results.passedTests).toHaveLength(1);
            expect(results.passedTests[0]).toBe('testOpenRTB() - org.example.OpenRTBTest');
            expect(results.failedTests).toHaveLength(0);
            expect(results.erroredTests).toHaveLength(0);
        });
    });
}); 