const vscode = require('vscode');
const globalEvents = require('../utils/events');
const sidebar = require('../webview/sidebar');
const AIPair = require('ai-pair');
const Config = require('ai-pair/src/models/config');
const RunningState = require('ai-pair/src/models/running-state');

class SidebarProvider {
    constructor(extensionUri, statusBarItem, runner, config, runningState) {
        this._extensionUri = extensionUri;
        this._view = null;
        this._statusBarItem = statusBarItem;
        this.runner = runner;
        this.config = config;
        this.runningState = runningState;

        // Listen for status updates
        globalEvents.on('pairProgrammer:statusUpdate', (status) => {
            console.log('Status update received:', status);
            this.updateStatus(status);
        });
    }

    resolveWebviewView(webviewView) {
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
        const htmlContent = sidebar.getWebviewContent(stylesUri, scriptUri, this.config);

        // Set the HTML content
        webviewView.webview.html = htmlContent;

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            console.log('Received message from webview:', data);
            if (data.command === 'activate') {
                console.log('Activation command received from webview.');
                this.startNewCycle();
            }
        });
    }

    startNewCycle() {
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
        this._view.webview.postMessage({ type: 'showLoading' });

        this.runner.runWithoutInteraction().then(() => {
            var results = this.runningState.testResults;

            console.log("Results: ", results);
            for (const [key, value] of Object.entries(results)) {
                console.log(`${key}: ${value}`);
            }

            this.updateTestResults(results.testsPassed + " tests passed, " + results.compilationFailed + " compilation failed, " + results.failedTests + " failed tests");    
            this.updateChangedFiles(results.changedFiles);

            // Stop the loading animation
            this._view.webview.postMessage({ type: 'hideLoading' });

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

    updateStatus(status) {
        if (this._view) {
            console.log('Updating status in webview:', status);
            this._view.webview.postMessage({
                type: 'updateStatus',
                value: status
            });
        }
    }

    // Method to update progress
    updateProgress(progress) {
        if (this._view) {
            console.log('Updating progress in webview:', progress);
            this._view.webview.postMessage({
                type: 'updateProgress',
                value: progress // percentage from 0 to 100
            });
        }
    }

    // Methods to update test results and changed files
    updateTestResults(results) {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'updateTestResults',
                value: results
            });
        }
    }

    updateChangedFiles(changes) {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'updateChangedFiles',
                value: changes
            });
        }
    }
}

module.exports = SidebarProvider; 