// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { SidebarManager } from './SidebarManager';
import { StatusBarManager } from './StatusBarManager';
import { FileWatcher } from './FileWatcher';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('Activating AI Pair Extension...');

	try {
		// Initialize components
		const statusBar = new StatusBarManager();
		const fileWatcher = new FileWatcher();
		const sidebarProvider = new SidebarManager(context.extensionUri);

		// Register the webview provider
		const disposable = vscode.window.registerWebviewViewProvider(
			SidebarManager.viewType,
			sidebarProvider
		);

		context.subscriptions.push(disposable);

		// Register commands
		let commands = [
			vscode.commands.registerCommand('ai-pair-extension.showConfig', () => {
				vscode.commands.executeCommand('workbench.view.extension.ai-pair-sidebar');
				statusBar.updateStatus('success');
			}),

			vscode.commands.registerCommand('ai-pair-extension.startPairProgrammer', async () => {
				try {
					statusBar.updateStatus('working');
					fileWatcher.startWatching();
					vscode.window.showInformationMessage('AI Pair Programmer started');
					statusBar.updateStatus('success');
				} catch (error) {
					console.error('Error starting pair programmer:', error);
					statusBar.updateStatus('error');
					vscode.window.showErrorMessage('Failed to start AI Pair Programmer');
				}
			}),

			vscode.commands.registerCommand('ai-pair-extension.stopPairProgrammer', () => {
				fileWatcher.stopWatching();
				statusBar.updateStatus('ready');
				vscode.window.showInformationMessage('AI Pair Programmer stopped');
			}),

			vscode.commands.registerCommand('ai-pair-extension.addHint', async () => {
				const hint = await vscode.window.showInputBox({
					prompt: 'Enter a hint for the AI Pair Programmer',
					placeHolder: 'e.g., Focus on improving test coverage'
				});

				if (hint) {
					// TODO: Send hint to AI system
					statusBar.updateStatus('working');
					// Simulate processing
					setTimeout(() => {
						statusBar.updateStatus('success');
						vscode.window.showInformationMessage('Hint added to AI Pair Programmer');
					}, 1000);
				}
			}),

			vscode.commands.registerCommand('ai-pair-extension.changeModel', async () => {
				const models = [
					'gpt-4',
					'gpt-3.5-turbo',
					'claude-2',
					'gemini-pro'
				];

				const selectedModel = await vscode.window.showQuickPick(models, {
					placeHolder: 'Select AI Model'
				});

				if (selectedModel) {
					// TODO: Update model in configuration
					statusBar.updateStatus('working');
					// Simulate processing
					setTimeout(() => {
						statusBar.updateStatus('success');
						vscode.window.showInformationMessage(`AI Model changed to ${selectedModel}`);
					}, 1000);
				}
			})
		];

		context.subscriptions.push(...commands, statusBar, fileWatcher);

		// Set initial status
		statusBar.updateStatus('ready');

		console.log('AI Pair Extension activated successfully');
	} catch (error) {
		console.error('Error activating AI Pair Extension:', error);
		vscode.window.showErrorMessage('Failed to activate AI Pair Extension');
	}
}

// This method is called when your extension is deactivated
export function deactivate() {
	console.log('AI Pair Extension deactivated');
}
