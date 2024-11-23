import * as vscode from 'vscode';
import globalEvents from '../utils/events';
import { getWebviewContent } from '../webview/sidebar';
import { AIPair, Config, RunningState } from 'ai-pair';

class SidebarProvider implements vscode.WebviewViewProvider {
    private _extensionUri: vscode.Uri;
    private _view: vscode.WebviewView | null = null;
    private _statusBarItem: vscode.StatusBarItem;
    private runner: AIPair;
    private config: Config;
    private runningState: RunningState;

    constructor(
        extensionUri: vscode.Uri,
        statusBarItem: vscode.StatusBarItem,
        runner: AIPair,
        config: Config,
        runningState: RunningState
    ) {
        this._extensionUri = extensionUri;
        this._statusBarItem = statusBarItem;
        this.runner = runner;
        this.config = config;
        this.runningState = runningState;

        // Listen for status updates
        globalEvents.on('pairProgrammer:statusUpdate', (status: string) => {
            console.log('Status update received:', status);
            this.updateStatus(status);
        });
    }

    resolveWebviewView(webviewView: vscode.WebviewView): void {
        console.log('Resolving webview view');
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this._extensionUri, 'webview'),
                vscode.Uri.joinPath(this._extensionUri, 'webview', 'styles')
            ]
        };

        // Get the local path to webview resources
        const stylesUri = webviewView.webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'webview', 'styles', 'sidebar.css')
        );
        const scriptUri = webviewView.webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'webview', 'sidebar.js')
        );

        // Generate the HTML content
        const htmlContent = getWebviewContent(stylesUri.toString(), scriptUri.toString(), this.config);

        // Set the HTML content
        webviewView.webview.html = htmlContent;

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (data: { command: string }) => {
            console.log('Received message from webview:', data);
            if (data.command === 'activate') {
                console.log('Activation command received from webview.');
                this.startNewCycle();
            }
        });
    }

    startNewCycle(): void {
        const rootDirectory = this.config.projectRoot;
        
        if (!rootDirectory) {
            console.error('No workspace folder is open.');
            return;
        }

        console.log('Root directory:', rootDirectory);

        this.runningState.resetCycleState();

        // Update status bar to show loading
        this._statusBarItem.text = "$(sync~spin) AI Pair Programmer Running...";
        this._statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        this._statusBarItem.tooltip = `Model: ${this.config.model}\nProject Root: ${this.config.projectRoot}\nTest Directory: ${this.config.testDir}\nExtension: ${this.config.extension}`;
        this._statusBarItem.show();

        // Start the loading animation
        this._view?.webview.postMessage({ type: 'showLoading' });

        this.runner.runWithoutInteraction().then(() => {
            const results = this.runningState.testResults;

            console.log("Results: ", results);
            for (const [key, value] of Object.entries(results)) {
                console.log(`${key}: ${value}`);
            }

            this.updateTestResults(`${results.testsPassed} tests passed, ${this.runningState.buildState.compiledSuccessfully} compilation failed, ${results.failedTests.length} failed tests`);    
            this.updateChangedFiles(this.runningState.codeChanges.modifiedFiles);

            // Stop the loading animation
            this._view?.webview.postMessage({ type: 'hideLoading' });

            // Update status bar based on test results
            if (results.testsPassed) {
                this._statusBarItem.text = "$(check) AI Pair Programmer $(configure)";
                this._statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.successBackground');
            } else {
                this._statusBarItem.text = "$(error) AI Pair Programmer $(configure)";
                this._statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
            }
            this._statusBarItem.tooltip = `Model: ${this.config.model}\n`;
        });
    }

    updateStatus(status: string): void {
        if (this._view) {
            console.log('Updating status in webview:', status);
            this._view.webview.postMessage({
                type: 'updateStatus',
                value: status
            });
        }
    }

    // Method to update progress
    updateProgress(progress: number): void {
        if (this._view) {
            console.log('Updating progress in webview:', progress);
            this._view.webview.postMessage({
                type: 'updateProgress',
                value: progress // percentage from 0 to 100
            });
        }
    }

    // Methods to update test results and changed files
    updateTestResults(results: string): void {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'updateTestResults',
                value: results
            });
        }
    }

    updateChangedFiles(changes: string[]): void {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'updateChangedFiles',
                value: changes
            });
        }
    }
}

export default SidebarProvider; 