import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { SidebarProvider } from './core/sidebar-provider';
import { AIPair, Config, configureLogger, RunningState, LoggerOptions } from 'ai-pair';

// Default configuration values
const defaultConfig = {
    model: 'gpt-4o',
    projectRoot: '',
    extension: '.java',
    srcDir: 'src/main/java',
    testDir: 'src/test',
    anthropicApiKey: '',
    openaiApiKey: '',
    geminiApiKey: '',
    logLevel: 'debug',
    tmpDir: 'tmp',
    numRetries: 3,
};

export function activate(context: vscode.ExtensionContext): void {
    const runningState = new RunningState();

    // Create default configuration file
    const configFileData = loadConfigFromFile();
    const config = new Config(configFileData);
    const runner = new AIPair(config, runningState);

    console.log('Starting logger with level: ', config.logLevel, 'and directory: ', config.tmpDir); 
    const loggerOptions: LoggerOptions = {
        logLevel: config.logLevel,
        logDirectory: config.tmpDir,
    };

    configureLogger(loggerOptions);

    console.log('AI Pair Programmer extension is now active!');
    console.log('Config : ', config);

    // Create status bar item
    const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    statusBarItem.text = '$(person) AI Pair Programmer';
    statusBarItem.tooltip = 'Click to start a new cycle';
    statusBarItem.command = 'ai-pair-programmer.startCycle';
    statusBarItem.show();

    console.log('Status bar item created');

    const sidebarProvider = new SidebarProvider(context.extensionUri);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('aiPairProgrammerPanel', sidebarProvider)
    );

    let isSidebarVisible = true;

    // open the sidebar
    vscode.commands.executeCommand('workbench.view.extension.aiPairProgrammer');

    // Register commands
    const toggleDisposable = vscode.commands.registerCommand(
        'ai-pair-programmer.toggle',
        () => {
            console.log('Toggle command executed');
            if (isSidebarVisible) {
                vscode.commands.executeCommand('workbench.action.closeSidebar');
            } else {
                vscode.commands.executeCommand('workbench.view.extension.aiPairProgrammer');
            }
            isSidebarVisible = !isSidebarVisible;
        }
    );

    const startCycleDisposable = vscode.commands.registerCommand(
        'ai-pair-programmer.startCycle',
        async () => {
            console.log('Start cycle command executed');
            await startNewCycle(runner, config, runningState, statusBarItem, sidebarProvider);
        }
    );

    context.subscriptions.push(statusBarItem, toggleDisposable, startCycleDisposable);
}

// Function to start a new AI Pair cycle
async function startNewCycle(
    runner: AIPair,
    config: Config,
    runningState: RunningState,
    statusBarItem: vscode.StatusBarItem,
    sidebarProvider: SidebarProvider
): Promise<void> {
    const rootDirectory = config.projectRoot;

    if (!rootDirectory) {
        console.error('No workspace folder is open.');
        return;
    }

    console.log('Root directory:', rootDirectory);

    runningState.resetCycleState();

    // Update status bar to show loading
    statusBarItem.text = '$(sync~spin) AI Pair Programmer Running...';
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    statusBarItem.tooltip = `Model: ${config.model}\nProject Root: ${config.projectRoot}\nTest Directory: ${config.testDir}\nExtension: ${config.extension}`;
    statusBarItem.show();

    // Start the loading animation in the sidebar
    sidebarProvider.updateStatus('Running...');
    sidebarProvider.updateProgress(0); // You can update progress as needed

    // Run the AI Pair cycle
    await runner.runWithoutInteraction();

    const results = runningState.testResults;

    console.log('Results: ', results);
    for (const [key, value] of Object.entries(results)) {
        console.log(`${key}: ${value}`);
    }

    const testResultsMessage = `${results.testsPassed} tests passed, ${
        runningState.buildState.compiledSuccessfully ? 'compilation succeeded' : 'compilation failed'
    }, ${results.failedTests.length} failed tests`;

    // Update the sidebar with results
    sidebarProvider.updateTestResults(testResultsMessage);
    sidebarProvider.updateChangedFiles(runningState.codeChanges.modifiedFiles);

    // Stop the loading animation
    sidebarProvider.updateStatus('Idle');
    sidebarProvider.updateProgress(100); // Assuming the task is complete

    // log the running state
    console.log('Running state: ', runningState);

    // Update status bar based on test results
    if (results.testsPassed) {
        statusBarItem.text = '$(check) AI Pair Programmer $(configure)';
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.successBackground');
    } else {
        statusBarItem.text = '$(error) AI Pair Programmer $(configure)';
        statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    }
    statusBarItem.tooltip = `Model: ${config.model}\n`;
}

function loadConfigFromFile() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage(
            'No workspace folder is open. Please open a folder to use AI Pair Programmer.'
        );
        return null;
    }

    const workspacePath = workspaceFolders[0].uri.fsPath;

    const configFilePath = path.join(workspacePath, 'ai-pair-config.json');

    if (!fs.existsSync(configFilePath)) {
        fs.writeFileSync(configFilePath, JSON.stringify(defaultConfig, null, 2));
        vscode.window.showInformationMessage(
            'Default AI Pair Programmer configuration file created.',
            { modal: true, detail: JSON.stringify(defaultConfig, null, 2) }
        );
    }

    const configFileData = JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));

    console.log("From config file : " + configFileData);
    return configFileData;
}

export function deactivate(): void {
    console.log('AI Pair Programmer extension is now deactivated.');
} 