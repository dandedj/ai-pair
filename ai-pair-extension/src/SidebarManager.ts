import * as path from 'path';
import * as vscode from 'vscode';
import { AIPairService } from './AIPairService';
import { DiffProvider } from './DiffProvider';
import { LogPanelManager } from './LogPanelManager';
import { WebviewMessage } from './types/WebviewMessage';
import { getNonce } from './Utils';

export class SidebarManager implements vscode.WebviewViewProvider {
    public static readonly viewType = 'ai-pair-extension.configView';

    private _service: AIPairService;
    private _logPanelManager: LogPanelManager;
    private _diffProvider: DiffProvider;

    constructor(
        private readonly _extensionUri: vscode.Uri,
    ) {
        this._service = AIPairService.getInstance();
        this._logPanelManager = new LogPanelManager(path.join(this._service.config?.tmpDir || '', 'ai-pair.log'));
        this._diffProvider = new DiffProvider();
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
                        `${data.logType}_${data.stage}.log`
                    );
                    await this._logPanelManager.viewLogFile(logPath);
                    break;
                }

                case 'viewDiff': {
                    const { cycleNumber, filePath } = data;
                    if (!cycleNumber || !filePath || !this._service.config) {
                        console.error('Missing required parameters or config for viewDiff:', data);
                        return;
                    }

                    try {
                        if (!this._service.config) {
                            throw new Error('Configuration not found');
                        }
                        await this._diffProvider.showDiff(
                            path.join(this._service.config.tmpDir, `generationCycle${cycleNumber}`, 'changes', `${filePath}.orig`),
                            path.join(this._service.config.tmpDir, `generationCycle${cycleNumber}`, 'changes', filePath),
                            `Changes to ${filePath}`
                        );
                    } catch (error) {
                        console.error('Error showing diff:', error);
                    }
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

    private async handleMessage(message: any): Promise<void> {
        switch (message.type) {
            case 'viewDiff': {
                const { cycleNumber, filePath } = message;
                if (!cycleNumber || !filePath) {
                    console.error('Missing required parameters for viewDiff:', message);
                    return;
                }

                try {
                    if (!this._service.config) {
                        throw new Error('Configuration not found');
                    }
                    await this._diffProvider.showDiff(
                        path.join(this._service.config.tmpDir, `generationCycle${cycleNumber}`, 'changes', `${filePath}.orig`),
                        path.join(this._service.config.tmpDir, `generationCycle${cycleNumber}`, 'changes', filePath),
                        `Changes to ${filePath}`
                    );
                } catch (error) {
                    console.error('Error showing diff:', error);
                }
                break;
            }
            // ... other message handlers ...
        }
    }
} 