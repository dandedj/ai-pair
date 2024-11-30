import fs from 'fs';
import path from 'path';
import { parseAndApplyGeneratedCode, splitIntoFileSections, extractCodeFromMarkdown } from '../../src/lib/code-parser';
import { logger } from '../../src/lib/logger';
import { Config } from '../../src/models/config';
import { RunningState, CodeChangeSummary } from '../../src/models/running-state';

jest.mock('fs');
jest.mock('../../src/lib/logger');
jest.mock('../../src/lib/file-utils', () => ({
    ensureDirectoryExists: jest.fn(),
}));

describe('parseAndApplyGeneratedCode', () => {
    let config: Config;
    let mockRunningState: RunningState;

    beforeEach(() => {
        jest.clearAllMocks();

        (fs.existsSync as jest.Mock).mockImplementation((filePath) => {
            return filePath === '/mockProject' || filePath === '/mockPrompts' || filePath.includes('existingFile.ts');
        });

        // Initialize a real Config object with realistic values
        config = new Config({
            projectRoot: '/mockProject',
            tmpDir: '/mockTmp',
            extension: '.ts',
            anthropicApiKey: 'abc',
            openaiApiKey: 'def',
            geminiApiKey: 'ghi',
            model: 'gpt-4o',
            numRetries: 3,
            systemPrompt: '',
            srcDir: '/mockSrc',
            testDir: '/mockTest',
            logLevel: 'debug',
            promptsPath: '/mockPrompts',
            promptTemplate: '',
            noIssuePromptTemplate: ''
        });

        mockRunningState = new RunningState();
    });

    it('should create new files and modify existing ones', () => {
        const generatedCode = `File: src/newFile.ts
New typeScript file content

File: src/existingFile.ts
Existing typeScript file content`;

        const result: CodeChangeSummary = parseAndApplyGeneratedCode(config, mockRunningState, generatedCode);

        expect(fs.writeFileSync).toHaveBeenCalledWith(
            path.join('/mockProject', 'src/newFile.ts'),
            "New typeScript file content",
            'utf-8'
        );
        expect(fs.writeFileSync).toHaveBeenCalledWith(
            path.join('/mockProject', 'src/existingFile.ts'),
            "Existing typeScript file content",
            'utf-8'
        );

        expect(result.newFiles).toContain('src/newFile.ts');
        expect(result.modifiedFiles).toContain('src/existingFile.ts');
        expect(result.newFiles.length).toBe(1);
        expect(result.modifiedFiles.length).toBe(1);
    });

    it('should not modify test files', () => {
        const generatedCode = `File: /test/test.java
      
      public Class Test {
      
      }`;

        parseAndApplyGeneratedCode(config, mockRunningState, generatedCode);

        expect(fs.writeFileSync).not.toHaveBeenCalled();
        expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Attempted to modify a test file'));
    });

});

describe('splitIntoFileSections', () => {
    it('should split generated code into file sections', () => {
        const generatedCode = String.raw`File: src/file1.ts
console.log('File 1 content');

File: src/file2.ts
console.log('File 2 content');
`;

        const result = splitIntoFileSections(generatedCode);

        expect(result).toEqual([
            { filePath: 'src/file1.ts', code: "console.log('File 1 content');" },
            { filePath: 'src/file2.ts', code: "console.log('File 2 content');" }
        ]);
    });

    it('should handle code blocks in markdown format', () => {
        const generatedCode = `File: src/file1.ts
\`\`\`typescript
console.log('File 1 content');
\`\`\`

File: src/file2.ts
\`\`\`typescript
console.log('File 2 content');
\`\`\`
`;

        const result = splitIntoFileSections(generatedCode);

        expect(result).toEqual([
            { filePath: 'src/file1.ts', code: "console.log('File 1 content');" },
            { filePath: 'src/file2.ts', code: "console.log('File 2 content');" }
        ]);
    });

    it('should return an empty array for empty input', () => {
        const generatedCode = String.raw``;

        const result = splitIntoFileSections(generatedCode);

        expect(result).toEqual([]);
    });

    it('should handle malformed input gracefully', () => {
        const generatedCode = String.raw`I couldn't fix your code. 
`;

        const result = splitIntoFileSections(generatedCode);

        // shouldn't write any files
        expect(fs.writeFileSync).not.toHaveBeenCalled();
        
        // Should return an empty array for malformed input
        expect(result).toEqual([]);
    });
});

describe('extractCodeFromMarkdown', () => {
    it('should extract code from markdown code blocks', () => {
        const markdownContent = `Here is some text.

\`\`\`typescript
console.log('Hello, World!');
\`\`\`

More text here.

\`\`\`javascript
function test() {
    return true;
}
\`\`\``;

        const result = extractCodeFromMarkdown(markdownContent);

        expect(result).toBe(
            "console.log('Hello, World!');\nfunction test() {\n    return true;\n}"
        );
    });

    it('should return an empty string if no code blocks are present', () => {
        const markdownContent = `
        Here is some text without any code blocks.
        `;

        const result = extractCodeFromMarkdown(markdownContent);

        expect(result).toBe('');
    });

    it('should handle multiple code blocks of the same language', () => {
        const markdownContent = `
        \`\`\`typescript
        console.log('First block');
        \`\`\`

        \`\`\`typescript
        console.log('Second block');
        \`\`\`
        `;

        const result = extractCodeFromMarkdown(markdownContent);

        expect(result).toBe(
            "console.log('First block');\nconsole.log('Second block');"
        );
    });

    it('should handle code blocks with no specified language', () => {
        const markdownContent = `
        \`\`\`
        console.log('No language specified');
        \`\`\`
        `;

        const result = extractCodeFromMarkdown(markdownContent);

        expect(result).toBe("console.log('No language specified');");
    });
});