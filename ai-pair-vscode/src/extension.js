
const vscode = require("vscode");
const fs = require("fs");
const path = require("path");
const SidebarProvider = require("./core/sidebar-provider");
const AIPair = require("ai-pair");
const Config = require("ai-pair/src/models/config");
const RunningState = require("ai-pair/src/models/running-state");

// Default configuration values
const defaultConfig = {
    model: "gpt-4o",
    projectRoot: "",
    extension: ".java",
    srcDir: "src/main/java",
    testDir: "src/test",
    apiKeys: {
        anthropic: "", // Placeholder for the user's API key
        openai: "", // Placeholder for the user's API key
        gemini: "", // Placeholder for the user's API key
    },
    logLevel: "info",
    tmpDir: "tmp",
    numRetries: 3,
};

function activate(context) {
    const runningState = new RunningState();

    // Create default configuration file
    const configFileData = loadConfigFromFile();
    const config = new Config(configFileData);
    const runner = new AIPair.AIPair(config, runningState);

    console.log("AI Pair Programmer extension is now active!");
    console.log("Config : " + config);

    // Create status bar item
    const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    statusBarItem.text = "$(person) AI Pair Programmer";
    statusBarItem.tooltip = "Click to start a new cycle";
    statusBarItem.command = "ai-pair-programmer.startCycle";
    statusBarItem.show();

    const sidebarProvider = new SidebarProvider(
        context.extensionUri,
        statusBarItem,
        runner,
        config,
        runningState
    );

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            "aiPairProgrammerPanel",
            sidebarProvider
        )
    );

    let isSidebarVisible = true;

    let toggleDisposable = vscode.commands.registerCommand(
        "ai-pair-programmer.toggle",
        () => {
            console.log("Toggle command executed");
            if (isSidebarVisible) {
                vscode.commands.executeCommand("workbench.action.closeSidebar");
            } else {
                vscode.commands.executeCommand(
                    "workbench.view.extension.aiPairProgrammer"
                );
            }
            isSidebarVisible = !isSidebarVisible;
        }
    );

    let startCycleDisposable = vscode.commands.registerCommand(
        "ai-pair-programmer.startCycle",
        () => {
            console.log("Start cycle command executed");

            sidebarProvider.startNewCycle();
        }
    );

    context.subscriptions.push(
        statusBarItem,
        toggleDisposable,
        startCycleDisposable
    );
}

function loadConfigFromFile() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        vscode.window.showErrorMessage(
            "No workspace folder is open. Please open a folder to use AI Pair Programmer."
        );
        return;
    }

    const workspacePath = workspaceFolders[0].uri.fsPath;

    defaultConfig.projectRoot = workspacePath;

    const configFilePath = path.join(workspacePath, "ai-pair-config.json");

    if (!fs.existsSync(configFilePath)) {
        fs.writeFileSync(
            configFilePath,
            JSON.stringify(defaultConfig, null, 2)
        );
        vscode.window.showInformationMessage(
            "Default AI Pair Programmer configuration file created."
        );
    } 

    const configFileData = JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));

    console.log(configFileData);
    return configFileData;
}

function deactivate() {
    console.log("AI Pair Programmer extension is now deactivated.");
}

module.exports = {
    activate,
    deactivate,
};
