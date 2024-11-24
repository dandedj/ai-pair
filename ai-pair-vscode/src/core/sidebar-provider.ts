import * as vscode from 'vscode';
import globalEvents from '../utils/events';
import { getWebviewContent } from '../webview/sidebar';

class SidebarProvider implements vscode.WebviewViewProvider {
    private _extensionUri: vscode.Uri;
    private _view: vscode.WebviewView | null = null;

    constructor(extensionUri: vscode.Uri) {
        this._extensionUri = extensionUri;

        // Listen for status updates (if needed)
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
                vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview')
            ],
        };

        // Get the local path to webview resources
        const stylesUri = webviewView.webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'styles.css')
        );
        const scriptUri = webviewView.webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'main.js')
        );

        // Generate the HTML content
        const htmlContent = getWebviewContent(
            stylesUri.toString(),
            scriptUri.toString()
        );

        // Set the HTML content
        webviewView.webview.html = htmlContent;

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (data: { command: string }) => {
            console.log('Received message from webview:', data);
            if (data.command === 'activate') {
                console.log('Activation command received from webview.');
                vscode.commands.executeCommand('ai-pair-programmer.startCycle');
            }
        });
    }

    // Methods to update the webview
    updateStatus(status: string): void {
        if (this._view) {
            console.log('Updating status in webview:', status);
            this._view.webview.postMessage({
                type: 'updateStatus',
                value: status,
            });
        }
    }

    updateProgress(progress: number): void {
        if (this._view) {
            console.log('Updating progress in webview:', progress);
            this._view.webview.postMessage({
                type: 'updateProgress',
                value: progress,
            });
        }
    }

    updateTestResults(results: string): void {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'updateTestResults',
                value: results,
            });
        }
    }

    updateChangedFiles(changes: string[]): void {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'updateChangedFiles',
                value: changes,
            });
        }
    }
}

export { SidebarProvider };