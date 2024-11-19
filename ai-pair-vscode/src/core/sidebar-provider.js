const vscode = require('vscode');
const globalEvents = require('../utils/events');
const sidebar = require('../webview/sidebar');
const AIPair = require('ai-pair');
const Config = require('ai-pair/src/models/config');

class SidebarProvider {
    constructor(extensionUri, statusBarItem) {
        this._extensionUri = extensionUri;
        this._view = null;
        this._statusBarItem = statusBarItem;

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

        // Get the configuration
        const configData = vscode.workspace.getConfiguration('aiPairProgrammer');
        const config = new Config({
            model: configData.get('model', 'gpt-4o'),
            projectRoot: vscode.workspace.workspaceFolders[0].uri.fsPath,
            testDir: configData.get('testDir', 'src/test'),
            extension: configData.get('extension', '.java'),
            openaiApiKey: configData.get('openaiApiKey', ''),
            anthropicApiKey: configData.get('anthropicApiKey', ''),
            geminiApiKey: configData.get('geminiApiKey', ''),
            logLevel: configData.get('logLevel', 'debug'),
            tmpDir: configData.get('tmpDir', vscode.workspace.workspaceFolders[0].uri.fsPath + '/tmp')
        });

        // Generate the HTML content
        const htmlContent = sidebar.getWebviewContent(stylesUri, scriptUri, config);

        // Set the HTML content
        webviewView.webview.html = htmlContent;

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            console.log('Received message from webview:', data);
            if (data.command === 'activate') {
                console.log('Activation command received from webview.');
                this.startNewCycle(config);
            }
        });
    }

    startNewCycle(config) {
        // Check if workspace folders are available
        const rootDirectory = config.projectRoot;
        
        if (!rootDirectory) {
            console.error('No workspace folder is open.');
            return;
        }

        console.log('Root directory:', rootDirectory);

        const runner = new AIPair(config);

        // Update status bar to show loading
        this._statusBarItem.text = "$(sync~spin) AI Pair Programmer Running...";
        this._statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        this._statusBarItem.tooltip = `Model: ${config.model}\nProject Root: ${config.projectRoot}\nTest Directory: ${config.testDir}\nExtension: ${config.extension}`;
        this._statusBarItem.show();

        // Start the loading animation
        this._view.webview.postMessage({ type: 'showLoading' });

        runner.runWithoutInteraction().then(results => {
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
                this._statusBarItem.text = "$(check) AI Pair Programmer";
                this._statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.successBackground');
            } else {
                this._statusBarItem.text = "$(error) AI Pair Programmer";
                this._statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
            }
            this._statusBarItem.tooltip = `Model: ${config.model}\nProject Root: ${config.projectRoot}\nTest Directory: ${config.testDir}\nExtension: ${config.extension}`;
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