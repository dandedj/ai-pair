import * as vscode from 'vscode';
import { getNonce } from './Utils';
import { AIPairService } from './AIPairService';
import * as path from 'path';
import { DiffProvider } from './DiffProvider';
import * as fs from 'fs';
import { WebviewMessage } from './types/WebviewMessage';
import { LogPanelManager } from './LogPanelManager';

export class SidebarManager implements vscode.WebviewViewProvider {
    public static readonly viewType = 'ai-pair-extension.configView';

    private _service: AIPairService;
    private _logPanelManager: LogPanelManager;

    constructor(
        private readonly _extensionUri: vscode.Uri,
    ) {
        this._service = AIPairService.getInstance();
        this._logPanelManager = new LogPanelManager(path.join(this._service.config?.tmpDir || '', 'ai-pair.log'));
    }

    dispose() {
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {

        webviewView.webview.options = {
            enableScripts: true,
            enableCommandUris: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };

        // Set up message handler before setting HTML
        console.log('Setting up message handler');
        webviewView.webview.onDidReceiveMessage(async (data: WebviewMessage) => {
            if (!this._service.config) {
                vscode.window.showErrorMessage('Configuration not found');
                return;
            }

            switch (data.type) {
                case 'openSettings':
                    await vscode.commands.executeCommand('workbench.action.openSettings', 'aiPair');
                    break;

                case 'startWithHint':
                    await this._service.startWithHint(data.hint);
                    break;

                case 'startAIPair':
                    await this._service.startAIPair();
                    break;

                case 'stopAIPair':
                    await this._service.stopAIPair();
                    break;

                case 'requestState':
                    if (this._service.runningState) {
                        webviewView.webview.postMessage({
                            type: 'stateUpdate',
                            state: this._service.runningState
                        });
                    }
                    if (this._service.config) {
                        webviewView.webview.postMessage({
                            type: 'configUpdate',
                            config: this._service.config
                        });
                    }
                    break;

                case 'viewBuildLog':
                case 'viewTestLog':
                case 'viewGenerationLog': {
                    const logPath = path.join(
                        this._service.config.tmpDir,
                        `generationCycle${data.cycleNumber}`,
                        `${data.stage}_${data.logType}_result.log`
                    );
                    await this._logPanelManager.viewLogFile(logPath);
                    break;
                }

                case 'viewDiff': {
                    const cycleDir = path.join(
                        this._service.config.tmpDir,
                        `generationCycle${data.cycleNumber}`,
                        'changes'
                    );
                    
                    const originalPath = path.join(cycleDir, data.originalPath);
                    const modifiedPath = path.join(cycleDir, data.filePath);

                    await vscode.commands.executeCommand('vscode.diff',
                        vscode.Uri.file(originalPath),
                        vscode.Uri.file(modifiedPath),
                        `Changes to ${data.filePath}`
                    );
                    break;
                }

                case 'requestLogs': {
                    const logs = await this._logPanelManager.readNewLogs();
                    webviewView.webview.postMessage({
                        type: 'logUpdate',
                        logs: logs.slice(-1000)
                    });
                    break;
                }
            }
        });

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        this._service.registerWebview(webviewView.webview);

        // Unregister webview when disposed
        webviewView.onDidDispose(() => {
            this._service.unregisterWebview(webviewView.webview);
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'dist', 'webview', 'sidebar.js'));
        const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'node_modules', '@vscode/codicons', 'dist', 'codicon.css'));
        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline'; font-src ${webview.cspSource};">
                <link href="${codiconsUri}" rel="stylesheet" />
                <title>AI Pair</title>
            </head>
            <body>
                <div id="root"></div>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>`;
    }
} 