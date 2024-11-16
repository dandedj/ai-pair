const vscode = require('vscode');
const state = require('./src/core/State');

function activate(context) {
    const rootDirectory = vscode.workspace.workspaceFolders[0].uri.fsPath;
    const configData = loadConfiguration(rootDirectory);

    // Initialize Config and RunningState
    state.initialize(configData);

    // ... existing activation code ...
}

function loadConfiguration(rootDirectory) {
    // Load configuration data from settings or elsewhere
    return {
        model: "gpt-4o",
        projectRoot: rootDirectory,
        testDir: `${rootDirectory}/src/test`,
        extension: ".java",
        openaiApiKey: "your-openai-api-key",
        anthropicApiKey: "",
        geminiApiKey: "",
        logLevel: "debug",
        tmpDir: `${rootDirectory}/tmp`,
        
    };
}

exports.activate = activate; 