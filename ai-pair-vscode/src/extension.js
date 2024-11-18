const vscode = require('vscode');
const SidebarProvider = require('./core/sidebar-provider');

function activate(context) {
    console.log('AI Pair Programmer extension is now active!');

    // Create status bar item
    const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );
    statusBarItem.text = "$(person) AI Pair Programmer";
    statusBarItem.tooltip = "Click to start a new cycle";
    statusBarItem.command = 'ai-pair-programmer.startCycle';
    statusBarItem.show();

    const sidebarProvider = new SidebarProvider(context.extensionUri, statusBarItem);

    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            "aiPairProgrammerPanel",
            sidebarProvider
        )
    );

    let isSidebarVisible = true;

    let toggleDisposable = vscode.commands.registerCommand('ai-pair-programmer.toggle', () => {
        console.log('Toggle command executed');
        if (isSidebarVisible) {
            vscode.commands.executeCommand('workbench.action.closeSidebar');
        } else {
            vscode.commands.executeCommand('workbench.view.extension.aiPairProgrammer');
        }
        isSidebarVisible = !isSidebarVisible;
    });

    let startCycleDisposable = vscode.commands.registerCommand('ai-pair-programmer.startCycle', () => {
        console.log('Start cycle command executed');
        sidebarProvider.startNewCycle();
    });

    context.subscriptions.push(statusBarItem, toggleDisposable, startCycleDisposable);
}

function deactivate() {
    console.log('AI Pair Programmer extension is now deactivated.');
}

module.exports = {
    activate,
    deactivate
}; 