import * as vscode from 'vscode';

export class StatusBarManager {
    private statusBarItem: vscode.StatusBarItem;

    constructor() {
        // Create status bar item aligned to the right with medium priority
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Right,
            100
        );

        // Initialize the status bar item
        this.statusBarItem.name = "AI Pair";
        this.updateStatus('ready');
    }

    /**
     * Updates the status bar item with different states
     */
    public updateStatus(status: 'ready' | 'working' | 'error' | 'success'): void {
        switch (status) {
            case 'ready':
                this.statusBarItem.text = "$(robot) AI Pair";
                this.statusBarItem.tooltip = "Click to show AI Pair commands";
                this.statusBarItem.command = 'ai-pair-extension.showConfig';
                this.statusBarItem.backgroundColor = undefined;
                this.statusBarItem.color = new vscode.ThemeColor('statusBar.foreground');
                break;
            case 'working':
                this.statusBarItem.text = "$(sync~spin) AI Pair: Working";
                this.statusBarItem.tooltip = "AI Pair is processing...";
                this.statusBarItem.command = undefined;
                this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
                this.statusBarItem.color = new vscode.ThemeColor('statusBarItem.warningForeground');
                break;
            case 'error':
                this.statusBarItem.text = "$(error) AI Pair: Error";
                this.statusBarItem.tooltip = "Click to retry";
                this.statusBarItem.command = 'ai-pair-extension.retry';
                this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
                this.statusBarItem.color = new vscode.ThemeColor('statusBarItem.errorForeground');
                break;
            case 'success':
                this.statusBarItem.text = "$(check) AI Pair: Success";
                this.statusBarItem.tooltip = "Operation completed successfully";
                this.statusBarItem.command = 'ai-pair-extension.showConfig';
                this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBar.background');
                this.statusBarItem.color = new vscode.ThemeColor('statusBar.foreground');
                // Reset to ready state after 3 seconds
                setTimeout(() => this.updateStatus('ready'), 3000);
                break;
        }
        this.statusBarItem.show();
    }

    /**
     * Shows a progress indicator in the status bar
     * @param message Optional message to display
     */
    public showProgress(message?: string): void {
        this.statusBarItem.text = `$(sync~spin) ${message || 'Processing...'}`;
        this.statusBarItem.tooltip = 'AI Pair is working...';
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        this.statusBarItem.color = new vscode.ThemeColor('statusBarItem.warningForeground');
        this.statusBarItem.show();
    }

    /**
     * Disposes of the status bar item
     */
    public dispose(): void {
        this.statusBarItem.dispose();
    }
} 