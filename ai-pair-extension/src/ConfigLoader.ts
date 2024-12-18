import * as vscode from 'vscode';
import * as path from 'path';
import { Config } from 'ai-pair-types';
import { loadPrompts } from 'ai-pair';

export class ConfigLoader {
    constructor(private context: vscode.ExtensionContext) {}

    private getConfigValue<T>(key: string, defaultValue: T): T {
        return vscode.workspace.getConfiguration('aiPair').get<T>(key) ?? defaultValue;
    }

    public async createConfig(settings: vscode.WorkspaceConfiguration): Promise<Config> {
        console.log('Creating configuration');
        const projectRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath || '';
        const tmpDir = path.join(projectRoot, '.ai-pair');
        
        // Get the ai-pair module path relative to the extension
        const extensionPath = this.context.extensionPath;
        const aiPairRoot = path.join(path.dirname(extensionPath), 'ai-pair');
        const promptsPath = path.join(aiPairRoot, 'src', 'prompts');
        
        console.log(`Extension path: ${extensionPath}`);
        console.log(`AI Pair module path: ${aiPairRoot}`);
        console.log(`Prompts directory: ${promptsPath}`);

        // Default configuration values
        const defaults = {
            model: 'gpt-4o',
            logLevel: 'info',
            anthropicApiKey: '',
            openaiApiKey: '',
            geminiApiKey: '',
            autoWatch: false,
            maxTokens: 2000,
            temperature: 0.7,
            numRetries: 2,
            escalateToPremiumModel: false,
            escalationModel: 'o1-preview'
        };

        // Check and save defaults for any missing values
        for (const [key, defaultValue] of Object.entries(defaults)) {
            if (settings.get(key) === undefined) {
                console.log(`Setting default value for ${key}`);
                await settings.update(key, defaultValue, vscode.ConfigurationTarget.Global);
            }
        }

        // Show notification if no API keys are set
        const hasApiKeys = settings.get('anthropicApiKey') || 
                         settings.get('openaiApiKey') || 
                         settings.get('geminiApiKey');
        if (!hasApiKeys) {
            console.log('No API keys configured');
            const action = 'Configure API Keys';
            const result = await vscode.window.showWarningMessage(
                'No API keys configured for AI Pair',
                action
            );
            if (result === action) {
                await vscode.commands.executeCommand('workbench.action.openSettings', 'aiPair');
            }
        }

        // Load prompts
        console.log(`Loading prompts from ${promptsPath}`);
        const prompts = loadPrompts(promptsPath);
        console.log('Prompts loaded successfully');

        return new Config({
            model: this.getConfigValue('model', defaults.model),
            projectRoot,
            srcDir: path.join(projectRoot, 'src'),
            testDir: path.join(projectRoot, 'build/test-results'),
            promptsPath,
            tmpDir,
            logLevel: this.getConfigValue('logLevel', defaults.logLevel),
            anthropicApiKey: this.getConfigValue('anthropicApiKey', defaults.anthropicApiKey),
            openaiApiKey: this.getConfigValue('openaiApiKey', defaults.openaiApiKey),
            geminiApiKey: this.getConfigValue('geminiApiKey', defaults.geminiApiKey),
            autoWatch: this.getConfigValue('autoWatch', defaults.autoWatch),
            maxTokens: this.getConfigValue('maxTokens', defaults.maxTokens),
            temperature: this.getConfigValue('temperature', defaults.temperature),
            numRetries: this.getConfigValue('numRetries', defaults.numRetries),
            escalateToPremiumModel: this.getConfigValue('escalateToPremiumModel', defaults.escalateToPremiumModel),
            escalationModel: this.getConfigValue('escalationModel', defaults.escalationModel),
            ...prompts
        });
    }

    public async updateConfig(key: string, value: any): Promise<void> {
        console.log(`Updating config: ${key}`);
        const settings = vscode.workspace.getConfiguration('aiPair');
        await settings.update(key, value, vscode.ConfigurationTarget.Global);
        console.log(`Config updated: ${key} = ${value}`);
    }
} 