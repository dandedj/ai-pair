const vscode = require('vscode');
const state = require('./src/core/State');

function activate(context) {
    const rootDirectory = vscode.workspace.workspaceFolders[0].uri.fsPath;

    // Load configuration data from the extension's settings
    const configData = loadConfiguration(rootDirectory);

    // Initialize Config and RunningState
    state.initialize(configData);

    // Register a listener for configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('ai-pair')) {
                // Reload the extension when AI Pair configuration changes
                vscode.window.showInformationMessage('AI Pair configuration changed. Reloading extension...');
                vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
        })
    );

    // ... existing activation code, such as registering commands and views ...
}

function loadConfiguration(rootDirectory) {
    const configuration = vscode.workspace.getConfiguration('ai-pair');

    return {
        model: configuration.get('model'),
        projectRoot: rootDirectory,
        testDir: `${rootDirectory}/${configuration.get('testDir')}`,
        extension: configuration.get('extension'),
        openaiApiKey: configuration.get('openaiApiKey'),
        anthropicApiKey: configuration.get('anthropicApiKey'),
        geminiApiKey: configuration.get('geminiApiKey'),
        logLevel: configuration.get('logLevel'),
        tmpDir: `${rootDirectory}/tmp`,
        numRetries: configuration.get('numRetries'),

        // Prompts path (assuming prompts are located within the extension)
        promptsPath: context.extensionPath + '/prompts'
    };
}

exports.activate = activate; 