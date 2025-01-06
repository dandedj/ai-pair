import { AIPair } from 'ai-pair';
import { 
    BuildState, 
    Config, 
    GenerationCycleDetails, 
    RunningState, 
    Status,
    TestResults 
} from 'ai-pair-types';
import * as path from 'path';
import * as vscode from 'vscode';
import { ExtensionLogger } from './ExtensionLogger';
import { LogPanelManager } from './LogPanelManager';

type SerializedRunningState = {
    status: Status;
    accumulatedHints: string[];
    generationCycleDetails: GenerationCycleDetails[];
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
    private _logPanelManager: LogPanelManager;

    private constructor(context: vscode.ExtensionContext, config: Config, runningState: RunningState) {
        this._context = context;
        this._runningState = runningState;
        this._config = config;
        this._logger = ExtensionLogger.getInstance();
        this._logPath = path.join(config.tmpDir);
        this._logPanelManager = new LogPanelManager(this._logPath);

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

    public get extensionContext(): vscode.ExtensionContext {
        return this._context;
    }

    private notifyWebview(webview: vscode.Webview) {
        // Create a plain object copy of the state without class methods
        const serializedState = {
            status: this._runningState.status,
            accumulatedHints: this._runningState.accumulatedHints,
            generationCycleDetails: this._runningState.generationCycleDetails,
            testResults: this._runningState.testResults,
            buildState: this._runningState.buildState,
            codeChanges: {
                ...this._runningState.codeChanges,
                lastChangeTime: this._runningState.codeChanges.lastChangeTime?.toISOString() ?? null
            },
            cycleStartTime: this._runningState.currentCycle?.timings.cycleStartTime.toString() ?? null
        };

        webview.postMessage({
            type: 'stateUpdate',
            state: serializedState
        });
    }

    private notifyAllWebviews() {
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
        this._runningState.reset();
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
} 