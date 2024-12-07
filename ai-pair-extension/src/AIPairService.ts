import * as vscode from 'vscode';
import * as path from 'path';
import { AIPair, RunningState, Config, Status, TestResults, BuildState, GenerationCycleDetails } from 'ai-pair';
import { ExtensionLogger } from './ExtensionLogger';
import * as fs from 'fs';

type SerializedRunningState = {
    status: Status;
    accumulatedHints: string[];
    generationCycleDetails: GenerationCycleDetails[];
    lastRunOutput: string;
    testResults: TestResults;
    buildState: BuildState;
    cycleStartTime: string | null;
    codeChanges: {
        lastChangeTime: string | null;
        newFiles: string[];
        deletedFiles: string[];
        modifiedFiles: string[];
    };
};

type WebviewMessage = 
    | { type: 'stateUpdate'; state: SerializedRunningState }
    | { type: 'configUpdate'; config: Config }
    | { type: 'logUpdate'; log: string }
    | { type: 'proposedChanges'; changes: { modifiedFiles: string[] } }
    | { type: 'viewFileDiff'; cycleNumber: number; filePath: string };

export class AIPairService {
    private static instance: AIPairService;
    private _aiPair?: AIPair;
    private _runningState: RunningState;
    private _config: Config;
    private _webviews: Set<vscode.Webview> = new Set();
    private _configurationChangeListener?: vscode.Disposable;
    private _context: vscode.ExtensionContext;
    private _stateChangeListeners: ((state: RunningState) => void)[] = [];
    private _logger: ExtensionLogger;
    private _lastLogPosition: number = 0;
    private _logPath: string;

    private constructor(context: vscode.ExtensionContext, config: Config, runningState: RunningState) {
        this._context = context;
        this._runningState = runningState;
        this._config = config;
        this._logger = ExtensionLogger.getInstance();
        this._logPath = path.join(config.tmpDir, 'ai-pair.log');

        this._aiPair = new AIPair(config, runningState);
        
        // Subscribe to running state changes
        this._runningState.onChange((newState: RunningState) => {
            this._logger.debug(`RunningState changed: status=${newState.status}, webviews=${this._webviews.size}`);
            
            // Ensure immediate update to all webviews
            Promise.resolve().then(() => {
                this.notifyAllWebviews();
                vscode.commands.executeCommand('ai-pair-extension.updateStatusBar', newState, this._config);
            });
        });

        // Listen for configuration changes
        this._configurationChangeListener = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('aiPair')) {
                this._logger.info('Configuration changed, reinitializing...');
                AIPairService.initialize(this._context, this._config, this._runningState);
            }
        });
    }

    public static getInstance(): AIPairService {
        if (!AIPairService.instance) {
            throw new Error('Extension context required for initialization');
        }

        return AIPairService.instance;
    }

    public static async initialize(context: vscode.ExtensionContext, config: Config, runningState: RunningState) {
        try {
            console.log('Initializing AI Pair');
            const service = new AIPairService(context, config, runningState);

            AIPairService.instance = service;
            
            console.log('AIPairService instance created');
        } catch (error) {
            console.error('Failed to initialize AI Pair:', error);
            vscode.window.showErrorMessage('Failed to initialize AI Pair: ' + error);
        }
    }

    public get aiPair(): AIPair | undefined {
        return this._aiPair;
    }

    public get runningState(): RunningState {
        return this._runningState;
    }

    public get config(): Config | undefined {
        return this._config;
    }

    private notifyWebview(webview: vscode.Webview) {
        // Create a plain object copy of the state without class methods
        const serializedState = {
            status: this._runningState.status,
            accumulatedHints: this._runningState.accumulatedHints,
            generationCycleDetails: this._runningState.generationCycleDetails,
            lastRunOutput: this._runningState.lastRunOutput,
            testResults: this._runningState.testResults,
            buildState: this._runningState.buildState,
            codeChanges: {
                ...this._runningState.codeChanges,
                lastChangeTime: this._runningState.codeChanges.lastChangeTime?.toISOString() ?? null
            },
            cycleStartTime: this._runningState.cycleStartTime?.toISOString() ?? null
        };

        this._logger.debug(`Sending state update to webview, status: ${serializedState.status}, file changes: ${
            serializedState.codeChanges.newFiles.length + 
            serializedState.codeChanges.modifiedFiles.length + 
            serializedState.codeChanges.deletedFiles.length
        }`);

        const messages: WebviewMessage[] = [
            { type: 'stateUpdate', state: serializedState },
        ];
        
        if (this._config) {
            messages.push({ type: 'configUpdate', config: this._config });
        }

        messages.forEach(msg => {
            webview.postMessage(msg);
        });

        // Update status bar
        vscode.commands.executeCommand('ai-pair-extension.updateStatusBar', this._runningState, this._config);
    }

    private notifyAllWebviews() {
        this._logger.debug(`Notifying ${this._webviews.size} webviews of state change: ${this._runningState.status}`);
        this._webviews.forEach(webview => this.notifyWebview(webview));
    }

    public registerWebview(webview: vscode.Webview) {
        this._webviews.add(webview);
        this._logger.info('Webview registered');
        this.notifyWebview(webview);
    }

    public unregisterWebview(webview: vscode.Webview) {
        this._webviews.delete(webview);
        this._logger.info('Webview unregistered');
    }

    public dispose() {
        this._webviews.clear();
        this._configurationChangeListener?.dispose();
        this._logger.info('AIPairService disposed');
    }

    public async startAIPair(): Promise<void> {
        this._logger.info('Starting AI Pair');
        if (!this._aiPair) {
            throw new Error('AI Pair not initialized');
        }
        
        await this._aiPair.performCodeGenerationCyclesWithRetries();
        this.notifyAllWebviews();
    }

    public async stopAIPair(): Promise<void> {
        this._logger.info('Stopping AI Pair');
        if (!this._aiPair) {
            throw new Error('AI Pair not initialized');
        }
        this._runningState.resetState();
        this.notifyAllWebviews();
    }

    public async startWithHint(hint: string): Promise<void> {
        this._logger.info(`Starting AI Pair with hint: ${hint}`);
        if (!this._aiPair) {
            throw new Error('AI Pair not initialized');
        }
        this._runningState.addHint(hint);
        await this._aiPair.performCodeGenerationCyclesWithRetries();
        this.notifyAllWebviews();
    }

    private async readNewLogs(): Promise<string[]> {
        try {
            if (!fs.existsSync(this._logPath)) {
                return [];
            }

            const stats = fs.statSync(this._logPath);
            if (stats.size < this._lastLogPosition) {
                // Log file was truncated, reset position
                this._lastLogPosition = 0;
            }

            const fileHandle = await fs.promises.open(this._logPath, 'r');
            const buffer = Buffer.alloc(stats.size - this._lastLogPosition);
            
            await fileHandle.read(buffer, 0, buffer.length, this._lastLogPosition);
            await fileHandle.close();

            this._lastLogPosition = stats.size;

            const newContent = buffer.toString();
            return newContent.split('\n')
                .filter(line => {
                    const trimmed = line.trim();
                    return trimmed !== '' && 
                           (trimmed.includes('[DEBUG]') || trimmed.includes('[INFO]') || trimmed.includes('[ERROR]'));
                })
                .map(line => {
                    // Remove timestamp and log level pattern
                    return line.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\s+\[[^\]]+\]\s+/, '');
                });
        } catch (error) {
            console.error('Error reading logs:', error);
            return [];
        }
    }

    public async handleWebviewMessage(message: any): Promise<void> {
        if (!this.config) {
            vscode.window.showErrorMessage('Configuration not found');
            return;
        }

        this._logger.debug(`Handling webview message: ${JSON.stringify(message)}`);
        switch (message.type) {
            case 'viewGenerationLog': {
                console.log('AIPairService: Handling viewGenerationLog message:', message);
                const logPath = path.join(
                    this.config.tmpDir,
                    `generationCycle${message.cycleNumber}`,
                    `${message.logType}.log`
                );
                console.log('AIPairService: Attempting to open log file:', logPath);
                if (fs.existsSync(logPath)) {
                    console.log('AIPairService: Log file exists, opening...');
                    await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(logPath));
                } else {
                    console.error('AIPairService: Log file not found:', logPath);
                    vscode.window.showErrorMessage(`Log file not found: ${logPath}`);
                }
                break;
            }
            case 'viewCompilationLog': {
                const logPath = path.join(
                    this.config.tmpDir,
                    `generationCycle${message.cycleNumber}`,
                    message.isFinal ? 'final_build_result.log' : 'initial_build_result.log'
                );
                if (fs.existsSync(logPath)) {
                    await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(logPath));
                } else {
                    vscode.window.showErrorMessage(`Log file not found: ${logPath}`);
                }
                break;
            }
            case 'viewTestLog': {
                const logPath = path.join(
                    this.config.tmpDir,
                    `generationCycle${message.cycleNumber}`,
                    message.isFinal ? 'final_test_result.log' : 'initial_test_result.log'
                );
                if (fs.existsSync(logPath)) {
                    await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(logPath));
                } else {
                    vscode.window.showErrorMessage(`Log file not found: ${logPath}`);
                }
                break;
            }
            case 'requestLogs': {
                const newLogs = await this.readNewLogs();
                this._logger.debug(`Found ${newLogs.length} new logs`);
                newLogs.forEach(log => {
                    this._webviews.forEach(webview => {
                        webview.postMessage({
                            type: 'logUpdate',
                            log
                        });
                    });
                });
                break;
            }
            case 'proposedChanges': {
                // Handle proposed changes
                break;
            }
            case 'viewFileDiff': {
                const originalPath = path.join(
                    this.config.tmpDir,
                    `generationCycle${message.cycleNumber}`,
                    'changes',
                    `${message.filePath}.orig`
                );
                const modifiedPath = path.join(
                    this.config.tmpDir,
                    `generationCycle${message.cycleNumber}`,
                    'changes',
                    message.filePath
                );
                
                if (fs.existsSync(modifiedPath)) {
                    const title = `Changes to ${message.filePath} (Cycle ${message.cycleNumber})`;
                    await vscode.commands.executeCommand('vscode.diff',
                        vscode.Uri.file(originalPath),
                        vscode.Uri.file(modifiedPath),
                        title
                    );
                } else {
                    vscode.window.showErrorMessage(`File not found: ${modifiedPath}`);
                }
                break;
            }
        }
    }
} 