import * as vscode from 'vscode';
import { getNonce } from './utils';
import { AIPairService } from './AIPairService';
import * as path from 'path';
import { DiffProvider } from './DiffProvider';
import * as fs from 'fs';

type WebviewMessage = 
    | { type: 'viewGenerationLog'; command: string; cycleNumber: number; logType: string }
    | { type: 'viewDiff'; command: string; cycleNumber: number; originalPath: string; filePath: string }
    | { type: 'startWithHint'; command: string; hint: string }
    | { type: 'startAIPair'; command: string }
    | { type: 'stopAIPair'; command: string }
    | { type: 'viewTestLog'; command: string; logFile: string }
    | { type: 'viewLogs'; command: string; logPath: string }
    | { type: 'openSettings'; command: string }
    | { type: 'requestLogs'; command: string }
    | { type: 'requestState'; command: string }
    | { type: 'viewCompilationLog'; command: string; cycleNumber: number; isFinal: boolean };

export class SidebarManager implements vscode.WebviewViewProvider {
    public static readonly viewType = 'ai-pair-extension.configView';

    private _view?: vscode.WebviewView;
    private _service: AIPairService;
    private _diffProvider: DiffProvider;

    constructor(
        private readonly _extensionUri: vscode.Uri,
    ) {
        this._service = AIPairService.getInstance();
        this._diffProvider = new DiffProvider();
    }

    dispose() {
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        console.log('Resolving webview view');
        this._view = webviewView;

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
            console.log('Raw message received:', data);
            console.log('SidebarManager received message:', data);
            
            if (data.type === 'viewGenerationLog') {
                console.log('Handling viewGenerationLog message');
                if (this._service.config) {
                    try {
                        const logPath = path.join(
                            this._service.config.tmpDir,
                            `generationCycle${data.cycleNumber}`,
                            `${data.logType}.log`
                        );
                        console.log('Attempting to open log file:', logPath);
                        if (fs.existsSync(logPath)) {
                            await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(logPath));
                        } else {
                            console.error('Log file not found:', logPath);
                            vscode.window.showErrorMessage(`Log file not found: ${logPath}`);
                        }
                    } catch (error) {
                        console.error('Error handling viewGenerationLog:', error);
                        vscode.window.showErrorMessage(`Error opening log file: ${error}`);
                    }
                }
                return;
            }
            
            switch (data.type) {
                case 'viewDiff': {
                    if (this._service.config) {
                        const cycleDir = path.join(
                            this._service.config.tmpDir, 
                            `generationCycle${data.cycleNumber}`,
                            'changes'
                        );
                        
                        const originalPath = path.join(cycleDir, data.originalPath);
                        const modifiedPath = path.join(cycleDir, data.filePath);

                        await this._diffProvider.showDiff(
                            originalPath,
                            modifiedPath,
                            `Changes to ${data.filePath}`
                        );
                    }
                    break;
                }
                case 'openSettings': {
                    await vscode.commands.executeCommand('workbench.action.openSettings', 'aiPair');
                    break;
                }
                case 'startWithHint': {
                    await this._service.startWithHint(data.hint);
                    break;
                }
                case 'startAIPair': {
                    await this._service.startAIPair();
                    break;
                }
                case 'stopAIPair': {
                    await this._service.stopAIPair();
                    break;
                }
                case 'requestLogs': {
                    if (this._service.config) {
                        const logPath = path.join(this._service.config.tmpDir, 'ai-pair.log');
                        try {
                            // console.log('Reading logs from:', logPath); // Debug log
                            const logContent = await fs.promises.readFile(logPath, 'utf-8');
                            const logs = logContent.split('\n').filter(Boolean);
                            // console.log('Sending logs to webview:', logs.length, 'lines'); // Debug log
                            webviewView.webview.postMessage({
                                type: 'logUpdate',
                                logs: logs.slice(-1000) // Keep last 1000 lines
                            });
                        } catch (error) {
                            console.error('Error reading logs:', error);
                        }
                    } else {
                        console.warn('No config available for reading logs'); // Debug log
                    }
                    break;
                }
                case 'requestState': {
                    // Send current state and config to the webview
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
                }
                case 'viewCompilationLog': {
                    if (this._service.config) {
                        await this._service.handleWebviewMessage(data);
                    } else {
                        vscode.window.showErrorMessage('No configuration found');
                    }
                    break;
                }
                case 'viewTestLog': {
                    if (this._service.config) {
                        await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(data.logFile));
                    } else {
                        vscode.window.showErrorMessage('No configuration found');
                    }
                    break;
                }
                case 'viewLogs': {
                    if (this._service.config) {
                        try {
                            const logPath = path.join(this._service.config.tmpDir, data.logPath);
                            const uri = vscode.Uri.file(logPath);
                            await vscode.commands.executeCommand('vscode.open', uri);
                        } catch (error) {
                            console.error('Error viewing logs:', error);
                            vscode.window.showErrorMessage(`Failed to open log file: ${error}`);
                        }
                    } else {
                        vscode.window.showErrorMessage('No configuration found');
                    }
                    break;
                }
            }
        });

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        console.log('Webview HTML set');

        // Register webview
        console.log('Registering webview with AIPairService');
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