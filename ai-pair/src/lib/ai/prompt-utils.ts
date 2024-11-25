import { Config } from '../../models/config';
import { RunningState } from '../../models/running-state';

function constructPrompt(config: Config, runningState: RunningState, filesContent: string, buildGradleContent: string): string {
    let prompt;

    if (runningState.testResults.testsPassed) {
        prompt = config.noIssuePromptTemplate
            .replace('{filesContent}', filesContent)
            .replace('{buildGradleContent}', buildGradleContent);

        if (runningState.accumulatedHints.length > 0) {
            prompt += `\n\nUser hints: ${runningState.accumulatedHints.join('; ')}`;
        }
    } else {
        prompt = config.promptTemplate
            .replace('{testOutput}', runningState.lastRunOutput)
            .replace('{filesContent}', filesContent)
            .replace('{buildGradleContent}', buildGradleContent);

        if (runningState.accumulatedHints.length > 0) {
            prompt += `\n\nHints for improvement: ${runningState.accumulatedHints.join('; ')}`;
        }
    }

    return prompt;
}

export { constructPrompt };