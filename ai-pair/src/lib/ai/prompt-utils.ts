import { Config } from '../../types/config';
import { RunningState } from '../../types/running-state';
import * as fs from 'fs';
import { joinPaths } from '../utils/file-utils';

function constructPrompt(config: Config, runningState: RunningState, filesContent: string, buildGradleContent: string): string {
    let prompt;

    if (runningState.testResults.testsPassed) {
        console.log('Tests passed, using noIssuePromptTemplate');
        prompt = config.noIssuePromptTemplate
            .replace('{filesContent}', filesContent)
            .replace('{buildGradleContent}', buildGradleContent);

        if (runningState.accumulatedHints.length > 0) {
            console.log(`Adding ${runningState.accumulatedHints.length} hints to prompt`);
            prompt += `\n\nUser hints: ${runningState.accumulatedHints.join('; ')}`;
        }
    } else {
        console.log('Tests failed, using promptTemplate');
        prompt = config.promptTemplate
            .replace('{testOutput}', runningState.lastRunOutput)
            .replace('{filesContent}', filesContent)
            .replace('{buildGradleContent}', buildGradleContent);

        if (runningState.accumulatedHints.length > 0) {
            console.log(`Adding ${runningState.accumulatedHints.length} hints to prompt`);
            prompt += `\n\nHints for improvement: ${runningState.accumulatedHints.join('; ')}`;
        }
    }

    return prompt;
}

function loadPrompts(promptsPath: string): { 
    systemPrompt: string; 
    promptTemplate: string; 
    noIssuePromptTemplate: string; 
} {
    console.log(`Loading prompts from directory: ${promptsPath}`);
    try {
        const prompts = {
            systemPrompt: loadPromptFile(promptsPath, 'system_prompt.txt'),
            promptTemplate: loadPromptFile(promptsPath, 'prompt_template.txt'),
            noIssuePromptTemplate: loadPromptFile(promptsPath, 'no_issue_prompt_template.txt')
        };
        console.log('Successfully loaded all prompt files');
        return prompts;
    } catch (error) {
        console.log(`Failed to load prompts: ${error}`);
        throw error;
    }
}

function loadPromptFile(promptsPath: string, fileName: string): string {
    const filePath = joinPaths(promptsPath, fileName);
    console.log(`Loading prompt file: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
        console.log(`Prompt file not found: ${filePath}`);
        throw new Error(`Prompt file not found at path: ${filePath}`);
    }
    
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        console.log(`Successfully loaded ${fileName} (${content.length} characters)`);
        return content;
    } catch (error) {
        console.log(`Error reading prompt file ${fileName}: ${error}`);
        throw error;
    }
}

export { loadPrompts, constructPrompt };