import * as vscode from 'vscode';
import { getNonce } from './utils';

export class SidebarManager implements vscode.WebviewViewProvider {
    public static readonly viewType = 'ai-pair-extension.configView';

    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
    ) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'updateConfig': {
                    const config = vscode.workspace.getConfiguration('aiPair');
                    await config.update(data.key, data.value, vscode.ConfigurationTarget.Global);
                    break;
                }
            }
        });

        // Update webview when configuration changes
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('aiPair')) {
                this._updateConfiguration();
            }
        });

        this._updateConfiguration();
    }

    private _updateConfiguration() {
        if (this._view) {
            const config = vscode.workspace.getConfiguration('aiPair');
            this._view.webview.postMessage({
                type: 'configUpdate',
                config: {
                    apiKey: config.get('apiKey'),
                    model: config.get('model'),
                    autoWatch: config.get('autoWatch')
                }
            });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'sidebar.js')
        );

        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
                <title>AI Pair Configuration</title>
            </head>
            <body>
                <div id="root"></div>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }
} 