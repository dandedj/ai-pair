import { jest, expect, describe, it, beforeEach } from '@jest/globals';
import fs from 'fs';
import { parseAndApplyGeneratedCode, extractFileBlocks } from '../../src/lib/code-parser';
import { Config } from '../../src/types/config';
import { RunningState } from '../../src/types/running-state';
import * as fileUtils from '../../src/lib/file-utils';

jest.mock('fs');
jest.mock('../../src/lib/file-utils');
jest.mock('../../src/lib/logger');

describe('code-parser', () => {
    let config: Config;
    let runningState: RunningState;

    beforeEach(() => {
        jest.clearAllMocks();
        // Mock filesystem checks
        (fs.existsSync as jest.Mock).mockImplementation((path: unknown) => {
            return typeof path === 'string' && (path.includes('/test/project') || path.includes('prompts'));
        });
        
        config = new Config({
            projectRoot: '/test/project',
            model: 'test-model',
            extension: '.ts',
            testDir: 'test',
            tmpDir: 'tmp',
            logLevel: 'info',
            openaiApiKey: 'test-key',
            srcDir: '/test/project/src',
            promptsPath: '/test/project/prompts'
        });
        runningState = new RunningState();
    });

    describe('parseAndApplyGeneratedCode', () => {
        it('should parse and write new files correctly', () => {
            const generatedCode = `
// File: src/components/Button.tsx
\`\`\`
import React from 'react';
export const Button = () => <button>Click me</button>;
\`\`\`
            `;

            (fileUtils.fileExists as jest.Mock).mockReturnValue(false);
            (fileUtils.isBuildFile as jest.Mock).mockReturnValue(false);
            (fileUtils.isTestFile as jest.Mock).mockReturnValue(false);

            const result = parseAndApplyGeneratedCode(config, runningState, generatedCode);

            expect(result.newFiles).toContain('src/components/Button.tsx');
            expect(fileUtils.safeWriteFile).toHaveBeenCalled();
        });

        it('should handle modified files correctly', () => {
            const generatedCode = `
// File: src/components/Button.tsx
\`\`\`
import React from 'react';
export const Button = () => <button>Updated</button>;
\`\`\`
            `;

            (fileUtils.fileExists as jest.Mock).mockReturnValue(true);
            (fileUtils.isBuildFile as jest.Mock).mockReturnValue(false);
            (fileUtils.isTestFile as jest.Mock).mockReturnValue(false);

            const result = parseAndApplyGeneratedCode(config, runningState, generatedCode);

            expect(result.modifiedFiles).toContain('src/components/Button.tsx');
            expect(fileUtils.safeWriteFile).toHaveBeenCalled();
        });

        it('should handle build files correctly', () => {
            const generatedCode = `
// File: build.gradle.kts
\`\`\`
{
  "name": "test-project",
  "version": "1.0.0"
}
\`\`\`
            `;

            (fileUtils.isBuildFile as jest.Mock).mockReturnValue(true);
            (fileUtils.isTestFile as jest.Mock).mockReturnValue(false);

            parseAndApplyGeneratedCode(config, runningState, generatedCode);

            expect(fileUtils.safeWriteFile).toHaveBeenCalled();
        });

        it('should skip test files', () => {
            const generatedCode = `
// File: src/__tests__/Button.test.tsx
\`\`\`
import { render } from '@testing-library/react';
test('Button renders', () => {});
\`\`\`
            `;

            (fileUtils.isTestFile as jest.Mock).mockReturnValue(true);

            const result = parseAndApplyGeneratedCode(config, runningState, generatedCode);

            expect(result.newFiles).toHaveLength(0);
            expect(result.modifiedFiles).toHaveLength(0);
            expect(result.buildFiles).toHaveLength(0);
            expect(fileUtils.safeWriteFile).not.toHaveBeenCalled();
        });

        it('should handle multiple files in generated code', () => {
            const generatedCode = `
// File: src/components/Button.tsx
\`\`\`
import React from 'react';
export const Button = () => <button>Click me</button>;
\`\`\`

// File: src/styles/button.css
\`\`\`
.button { color: blue; }
\`\`\`
            `;

            (fileUtils.fileExists as jest.Mock).mockReturnValue(false);
            (fileUtils.isBuildFile as jest.Mock).mockReturnValue(false);
            (fileUtils.isTestFile as jest.Mock).mockReturnValue(false);

            const result = parseAndApplyGeneratedCode(config, runningState, generatedCode);

            expect(result.newFiles).toContain('src/components/Button.tsx');
            expect(result.newFiles).toContain('src/styles/button.css');
            expect(fileUtils.safeWriteFile).toHaveBeenCalledTimes(2);
        });

        it('should handle complex code blocks with language identifiers and mixed formats', () => {
            const generatedCode = `
// File: src/first.ts
\`\`\`typescript
const x = 1;
const y = 2;
\`\`\`

File: src/second.ts
\`\`\`
export const z = 3;

function test() {
    return true;
}
\`\`\`

// File: src/third.ts
\`\`\`javascript
// This is a comment
const a = {
    b: 'test',
    c: [1, 2, 3]
};
\`\`\`
            `;

            (fileUtils.isTestFile as jest.Mock).mockReturnValue(false);
            (fileUtils.isBuildFile as jest.Mock).mockReturnValue(false);
            (fileUtils.fileExists as jest.Mock).mockReturnValue(false);

            const result = parseAndApplyGeneratedCode(config, runningState, generatedCode);

            expect(result.newFiles).toContain('src/first.ts');
            expect(result.newFiles).toContain('src/second.ts');
            expect(result.newFiles).toContain('src/third.ts');
            expect(fileUtils.safeWriteFile).toHaveBeenCalledTimes(3);
            expect(fileUtils.safeWriteFile).toHaveBeenCalledWith(
                expect.stringContaining('first.ts'),
                expect.stringContaining('const x = 1')
            );
            expect(fileUtils.safeWriteFile).toHaveBeenCalledWith(
                expect.stringContaining('second.ts'),
                expect.stringContaining('export const z = 3')
            );
            expect(fileUtils.safeWriteFile).toHaveBeenCalledWith(
                expect.stringContaining('third.ts'),
                expect.stringContaining('const a = {')
            );
        });
    });

    describe('writeFile', () => {
        it('should skip test files and not write them', () => {
            const generatedCode = `
// File: src/test/Button.test.tsx
\`\`\`
test('it works', () => {});
\`\`\`
            `;

            (fileUtils.isTestFile as jest.Mock).mockReturnValue(true);
            (fileUtils.isBuildFile as jest.Mock).mockReturnValue(false);
            (fileUtils.fileExists as jest.Mock).mockReturnValue(false);

            const result = parseAndApplyGeneratedCode(config, runningState, generatedCode);

            expect(result.newFiles).toHaveLength(0);
            expect(result.modifiedFiles).toHaveLength(0);
            expect(result.buildFiles).toHaveLength(0);
            expect(fileUtils.safeWriteFile).not.toHaveBeenCalled();
        });

        it('should categorize build files correctly', () => {
            const generatedCode = `
// File: package.json
\`\`\`
{ "name": "test" }
\`\`\`
            `;

            (fileUtils.isTestFile as jest.Mock).mockReturnValue(false);
            (fileUtils.isBuildFile as jest.Mock).mockReturnValue(true);
            (fileUtils.fileExists as jest.Mock).mockReturnValue(false);

            const result = parseAndApplyGeneratedCode(config, runningState, generatedCode);

            expect(result.buildFiles).toContain('package.json');
            expect(result.newFiles).toHaveLength(0);
            expect(result.modifiedFiles).toHaveLength(0);
            expect(fileUtils.safeWriteFile).toHaveBeenCalledWith(
                expect.stringContaining('package.json'),
                expect.stringContaining('test')
            );
        });

        it('should categorize modified files correctly', () => {
            const generatedCode = `
// File: src/existing.ts
\`\`\`
console.log('modified');
\`\`\`
            `;

            (fileUtils.isTestFile as jest.Mock).mockReturnValue(false);
            (fileUtils.isBuildFile as jest.Mock).mockReturnValue(false);
            (fileUtils.fileExists as jest.Mock).mockReturnValue(true);

            const result = parseAndApplyGeneratedCode(config, runningState, generatedCode);

            expect(result.modifiedFiles).toContain('src/existing.ts');
            expect(result.newFiles).toHaveLength(0);
            expect(result.buildFiles).toHaveLength(0);
            expect(fileUtils.safeWriteFile).toHaveBeenCalledWith(
                expect.stringContaining('existing.ts'),
                expect.stringContaining('modified')
            );
        });

        it('should categorize new files correctly', () => {
            const generatedCode = `
// File: src/new-file.ts
\`\`\`
console.log('new');
\`\`\`
            `;

            (fileUtils.isTestFile as jest.Mock).mockReturnValue(false);
            (fileUtils.isBuildFile as jest.Mock).mockReturnValue(false);
            (fileUtils.fileExists as jest.Mock).mockReturnValue(false);

            const result = parseAndApplyGeneratedCode(config, runningState, generatedCode);

            expect(result.newFiles).toContain('src/new-file.ts');
            expect(result.modifiedFiles).toHaveLength(0);
            expect(result.buildFiles).toHaveLength(0);
            expect(fileUtils.safeWriteFile).toHaveBeenCalledWith(
                expect.stringContaining('new-file.ts'),
                expect.stringContaining('new')
            );
        });

        it('should handle path resolution correctly', () => {
            const generatedCode = `
// File: ./relative/path/file.ts
\`\`\`
console.log('test');
\`\`\`
            `;

            (fileUtils.isTestFile as jest.Mock).mockReturnValue(false);
            (fileUtils.isBuildFile as jest.Mock).mockReturnValue(false);
            (fileUtils.fileExists as jest.Mock).mockReturnValue(false);

            const result = parseAndApplyGeneratedCode(config, runningState, generatedCode);

            expect(result.newFiles).toContain('relative/path/file.ts');
            expect(fileUtils.safeWriteFile).toHaveBeenCalledWith(
                expect.stringContaining('/test/project/relative/path/file.ts'),
                expect.any(String)
            );
        });
    });

    describe('extractFileBlocks', () => {
        it('should extract blocks with markdown code blocks', () => {
            const input = `
// File: src/first.ts
\`\`\`typescript
const x = 1;
\`\`\`

File: src/second.ts
\`\`\`
const y = 2;
\`\`\`
            `;

            const blocks = extractFileBlocks(input);
            expect(blocks).toHaveLength(2);
            expect(blocks[0]).toEqual({
                filePath: 'src/first.ts',
                content: 'const x = 1;'
            });
            expect(blocks[1]).toEqual({
                filePath: 'src/second.ts',
                content: 'const y = 2;'
            });
        });

        it('should extract blocks without markdown', () => {
            const input = `
File: src/first.ts
const x = 1;
const y = 2;

// File: src/second.ts
function test() {
    return true;
}
            `;

            const blocks = extractFileBlocks(input);
            expect(blocks).toHaveLength(2);
            expect(blocks[0]).toEqual({
                filePath: 'src/first.ts',
                content: 'const x = 1;\nconst y = 2;'
            });
            expect(blocks[1]).toEqual({
                filePath: 'src/second.ts',
                content: 'function test() {\n    return true;\n}'
            });
        });

        it('should handle mixed formats in the same input', () => {
            const input = `
// File: src/first.ts
\`\`\`typescript
const x = 1;
\`\`\`

File: src/second.ts
const y = 2;
            `;

            const blocks = extractFileBlocks(input);
            expect(blocks).toHaveLength(2);
            expect(blocks[0]).toEqual({
                filePath: 'src/first.ts',
                content: 'const x = 1;'
            });
            expect(blocks[1]).toEqual({
                filePath: 'src/second.ts',
                content: 'const y = 2;'
            });
        });

        it('should skip empty or invalid blocks', () => {
            const input = `File: src/empty.ts

File: src/valid.ts
const x = 1;`;

            const blocks = extractFileBlocks(input);
            expect(blocks).toHaveLength(1);
            expect(blocks[0]).toEqual({
                filePath: 'src/valid.ts',
                content: 'const x = 1;'
            });
        });
    });
});