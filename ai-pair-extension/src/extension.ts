import * as vscode from 'vscode';
import * as path from 'path';
import { ExtensionLogger } from './ExtensionLogger';
import { StatusBarManager } from './StatusBarManager';
import { FileWatcher } from './FileWatcher';
import { SidebarManager } from './SidebarManager';
import { AIPairService } from './AIPairService';
import { ConfigLoader } from './ConfigLoader';
import { RunningState, Config } from 'ai-pair';

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
		statusBar.updateFromState(runningState);
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
			vscode.commands.registerCommand('ai-pair-extension.showConfig', () => {
				vscode.commands.executeCommand('workbench.view.extension.ai-pair-sidebar');
			}),

			vscode.commands.registerCommand('ai-pair-extension.updateStatusBar', (state: RunningState) => {
				statusBar.updateFromState(state);
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
			}),

			vscode.commands.registerCommand('ai-pair-extension.stopPairProgrammer', () => {
				vscode.window.showInformationMessage('AI Pair Programmer stopped');
			}),

			vscode.commands.registerCommand('ai-pair-extension.addHint', async () => {
				const hint = await vscode.window.showInputBox({
					prompt: 'Enter a hint for the AI Pair Programmer',
					placeHolder: 'e.g., Focus on improving test coverage'
				});

				if (hint) {
					// TODO: Send hint to AI system

					// Simulate processing
					setTimeout(() => {
						vscode.window.showInformationMessage('Hint added to AI Pair Programmer');
					}, 1000);
				}
			}),

			vscode.commands.registerCommand('extension.openWebview', () => {
				const panel = vscode.window.createWebviewPanel(
					'aiPairWebview',
					'AI Pair Webview',
					vscode.ViewColumn.One,
					{
						enableScripts: true,
					}
				);

				// Set the webview's HTML content
				panel.webview.html = getWebviewContent(panel, context);

				// Handle messages from the webview
				panel.webview.onDidReceiveMessage(
					async (message) => {
						switch (message.command) {
							case 'readFile':
								const uri = vscode.Uri.file(message.filePath);
								const fileData = await vscode.workspace.fs.readFile(uri);
								panel.webview.postMessage({
									command: 'fileData',
									data: fileData.toString(),
								});
								break;
							// Handle other commands...
						}
					},
					undefined,
					context.subscriptions
				);
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

// Add the getWebviewContent function
function getWebviewContent(panel: vscode.WebviewPanel, context: vscode.ExtensionContext): string {
	const scriptUri = panel.webview.asWebviewUri(
		vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview', 'sidebar.js')
	);

	const nonce = getNonce();

	return `<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">
		<!-- CSP to only allow resources from the extension -->
		<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}' ${panel.webview.cspSource}; style-src ${panel.webview.cspSource};">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
		<title>AI Pair Webview</title>
	</head>
	<body>
		<div id="root"></div>
		<script nonce="${nonce}" src="${scriptUri}"></script>
	</body>
	</html>`;
}

// Helper function to generate a nonce
function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}
