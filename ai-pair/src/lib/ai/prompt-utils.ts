import { Config } from '../../types/config';
import { RunningState } from '../../types/running-state';
import * as fs from 'fs';
import { joinPaths } from '../file-utils';

/**
 * Constructs a prompt based on the test results and configuration.
 */
function constructPrompt(
    config: Config,
    runningState: RunningState,
    filesContent: string,
    buildGradleContent: string
): string {
    const { testResults, accumulatedHints } = runningState;
    const testsPassed = testResults.failedTests.length === 0 && testResults.erroredTests.length === 0;

    // Choose the appropriate prompt template
    const template = testsPassed
        ? config.noIssuePromptTemplate
        : config.promptTemplate;

    let prompt = template
        .replace('{filesContent}', filesContent)
        .replace('{buildGradleContent}', buildGradleContent);

    if (!testsPassed) {
        prompt = prompt.replace('{testOutput}', 'No test output available');
    }

    // Append hints if available
    if (accumulatedHints.length > 0) {
        const hintsText = accumulatedHints.join('; ');
        const hintsSection = testsPassed
            ? `\n\nUser hints: ${hintsText}`
            : `\n\nHints for improvement: ${hintsText}`;
        prompt += hintsSection;
    }

    return prompt;
}

/**
 * Loads all necessary prompt templates from the given directory.
 */
function loadPrompts(promptsPath: string): {
    systemPrompt: string;
    promptTemplate: string;
    noIssuePromptTemplate: string;
} {
    logInfo(`Loading prompts from directory: ${promptsPath}`);

    try {
        const prompts = {
            systemPrompt: loadPromptFile(promptsPath, 'system_prompt.txt'),
            promptTemplate: loadPromptFile(promptsPath, 'prompt_template.txt'),
            noIssuePromptTemplate: loadPromptFile(promptsPath, 'no_issue_prompt_template.txt'),
        };

        logInfo('Successfully loaded all prompt files.');
        return prompts;
    } catch (error) {
        logError(`Failed to load prompts: ${(error as Error).message}`);
        throw error;
    }
}

/**
 * Loads a single prompt file from the specified directory.
 */
function loadPromptFile(promptsPath: string, fileName: string): string {
    const filePath = joinPaths(promptsPath, fileName);
    logInfo(`Loading prompt file: ${filePath}`);

    if (!fs.existsSync(filePath)) {
        const errorMessage = `Prompt file not found at path: ${filePath}`;
        logError(errorMessage);
        throw new Error(errorMessage);
    }

    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        logInfo(`Successfully loaded ${fileName} (${content.length} characters).`);
        return content;
    } catch (error) {
        logError(`Error reading prompt file ${fileName}: ${(error as Error).message}`);
        throw error;
    }
}

/**
 * Logs informational messages.
 */
function logInfo(message: string): void {
    console.log(`[INFO] ${message}`);
}

/**
 * Logs error messages.
 */
function logError(message: string): void {
    console.error(`[ERROR] ${message}`);
}

export { loadPrompts, constructPrompt };