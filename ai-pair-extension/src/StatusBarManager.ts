import * as vscode from 'vscode';
import { RunningState, Config, Status } from 'ai-pair';

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

    public updateFromState(state: RunningState): void {
        if (!state) { 
            return; 
        }

        const testResults = state.testResults || { passedTests: [], failedTests: [], erroredTests: [] };
        const totalTests = testResults.passedTests.length + testResults.failedTests.length + testResults.erroredTests.length;
        const passedTests = testResults.passedTests.length;

        if (state.status === Status.IDLE) {
            this.statusBarItem.text = "$(debug-start) Start AI Pair";
            this.statusBarItem.command = 'ai-pair-extension.configView';
        } else if (state.status === Status.COMPLETED) {
            this.statusBarItem.text = `$(check) Tests Passed: ${passedTests}/${totalTests}`;
            this.statusBarItem.command = 'ai-pair-extension.configView';
        } else {
            this.statusBarItem.text = `$(sync~spin) ${this.getStatusText(state.status)} (${passedTests}/${totalTests})`;
            this.statusBarItem.command = 'ai-pair-extension.configView';
        }

        this.statusBarItem.show();
    }

    dispose() {
        this.statusBarItem.dispose();
    }
} 