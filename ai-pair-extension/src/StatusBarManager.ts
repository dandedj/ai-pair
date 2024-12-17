import { Config, RunningState, Status, getStatusDisplay } from 'ai-pair';
import * as vscode from 'vscode';

const statusMap = {
    [Status.IDLE]: { text: "$(debug-start) Start AI Pair", icon: "debug-start" },
    [Status.BUILDING]: { text: "$(sync~spin) Building", icon: "sync~spin" },
    [Status.TESTING]: { text: "$(beaker~spin) Testing", icon: "beaker~spin" },
    [Status.GENERATING_CODE]: { text: "$(sparkle~spin) Generating Code", icon: "sparkle~spin" },
    [Status.APPLYING_CHANGES]: { text: "$(edit~spin) Applying Changes", icon: "edit~spin" },
    [Status.REBUILDING]: { text: "$(sync~spin) Rebuilding", icon: "sync~spin" },
    [Status.RETESTING]: { text: "$(beaker~spin) Retesting", icon: "beaker~spin" },
    [Status.COMPLETED]: { text: "$(check) Completed", icon: "check" }
};

export class StatusBarManager {
    private statusBarItem: vscode.StatusBarItem;

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1000);
        this.statusBarItem.command = 'ai-pair-extension.configView';
        this.statusBarItem.show();
    }

    private getStatusText(status: string): string {
        return status.split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    public update(state: RunningState, config: Config): void {
        const totalTests = state.testResults.passedTests.length + 
                          state.testResults.failedTests.length + 
                          state.testResults.erroredTests.length;
        const passedTests = state.testResults.passedTests.length;

        if (state.status === Status.IDLE) {
            this.statusBarItem.text = statusMap[Status.IDLE].text;
        } else if (state.status === Status.COMPLETED) {
            this.statusBarItem.text = `$(check) Tests Passed: ${passedTests}/${totalTests}`;
        } else {
            const { text } = statusMap[state.status];
            this.statusBarItem.text = `${text} (${passedTests}/${totalTests})`;
        }
        
        this.statusBarItem.command = 'ai-pair-extension.configView';
        this.statusBarItem.show();
    }

    dispose() {
        this.statusBarItem.dispose();
    }
} 