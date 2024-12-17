import { RunningState } from 'ai-pair';
import * as vscode from 'vscode';
import { AIPairService } from './AIPairService';
import { ConfigLoader } from './ConfigLoader';
import { ExtensionLogger } from './ExtensionLogger';
import { FileWatcher } from './FileWatcher';
import { SidebarManager } from './SidebarManager';
import { StatusBarManager } from './StatusBarManager';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	console.log('Activating AI Pair Extension...');

	try {
		console.log('Creating configuration...');
		const configLoader = new ConfigLoader(context);
		const config = await configLoader.createConfig(vscode.workspace.getConfiguration('aiPair'));
		console.warn('Configuration created');

		console.log('Initializing logger...');
		ExtensionLogger.initialize(config.tmpDir, 'info');
		console.log('Logger initialized');

		console.log('Initializing AIPairService...');
		const runningState = new RunningState();
		await AIPairService.initialize(context, config, runningState);
		const aiPairService = AIPairService.getInstance();
		console.log('AIPairService initialized');

		// Initialize components
		const statusBar = new StatusBarManager();
		statusBar.update(runningState, config);
		const fileWatcher = new FileWatcher();
		const sidebarProvider = new SidebarManager(context.extensionUri);

		// Register the webview provider
		const disposable = vscode.window.registerWebviewViewProvider(
			SidebarManager.viewType,
			sidebarProvider
		);

		context.subscriptions.push(disposable, statusBar);

		// Register commands
		let commands = [

			vscode.commands.registerCommand('ai-pair-extension.updateStatusBar', (state: RunningState) => {
				statusBar.update(state, config);
			}),

			vscode.commands.registerCommand('ai-pair-extension.start', async () => {
				try {
					// Show the sidebar
					await vscode.commands.executeCommand('ai-pair-extension.configView.focus');
					
					// Start AI Pair
					await aiPairService.startAIPair();
				} catch (error) {
					vscode.window.showErrorMessage(`Failed to start AI Pair: ${error}`);
				}
			}),

			vscode.commands.registerCommand('ai-pair-extension.openConfig', () => {
				vscode.commands.executeCommand('workbench.action.openSettings', 'aiPair');
			}),

			vscode.commands.registerCommand('ai-pair-extension.startPairProgrammer', async () => {
				try {
					await aiPairService.startAIPair();
					vscode.window.showInformationMessage('AI Pair Programmer started');
				} catch (error) {
					console.error('Error starting pair programmer:', error);
					vscode.window.showErrorMessage('Failed to start AI Pair Programmer');
				}
			})
		];

		context.subscriptions.push(...commands, statusBar, fileWatcher);

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
