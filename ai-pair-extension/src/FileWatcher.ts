import * as vscode from 'vscode';
import * as path from 'path';

export class FileWatcher {
    private fileWatcher: vscode.FileSystemWatcher;
    private isWatching: boolean = false;

    constructor() {
        // Initialize but don't start watching until explicitly requested
        this.fileWatcher = vscode.workspace.createFileSystemWatcher(
            '**/*',  // Watch all files
            false,   // Don't ignore creates
            false,   // Don't ignore changes
            false    // Don't ignore deletes
        );

        // Set up event handlers
        this.setupEventHandlers();
    }

    /**
     * Start watching for file changes
     */
    public startWatching(): void {
        if (!this.isWatching) {
            this.isWatching = true;
            vscode.window.showInformationMessage('AI Pair: Started watching for file changes');
        }
    }

    /**
     * Stop watching for file changes
     */
    public stopWatching(): void {
        if (this.isWatching) {
            this.isWatching = false;
            vscode.window.showInformationMessage('AI Pair: Stopped watching for file changes');
        }
    }

    /**
     * Set up event handlers for file system changes
     */
    private setupEventHandlers(): void {
        // Handle file creation
        this.fileWatcher.onDidCreate((uri) => {
            if (!this.isWatching || this.shouldIgnoreFile(uri)) { return; }
            
            this.handleFileCreate(uri);
        });

        // Handle file changes
        this.fileWatcher.onDidChange((uri) => {
            if (!this.isWatching || this.shouldIgnoreFile(uri)) { return; }
            
            this.handleFileChange(uri);
        });

        // Handle file deletion
        this.fileWatcher.onDidDelete((uri) => {
            if (!this.isWatching || this.shouldIgnoreFile(uri)) { return; }
            
            this.handleFileDelete(uri);
        });
    }

    /**
     * Handle file creation events
     */
    private async handleFileCreate(uri: vscode.Uri): Promise<void> {
        const fileName = path.basename(uri.fsPath);
        console.log(`File created: ${fileName}`);

        // Check if it's a test file
        if (this.isTestFile(uri.fsPath)) {
            // TODO: Trigger AI analysis for new test file
            vscode.window.showInformationMessage(`New test file detected: ${fileName}`);
        }
    }

    /**
     * Handle file change events
     */
    private async handleFileChange(uri: vscode.Uri): Promise<void> {
        const fileName = path.basename(uri.fsPath);
        console.log(`File changed: ${fileName}`);

        // Check if it's a test file
        if (this.isTestFile(uri.fsPath)) {
            // TODO: Trigger AI analysis for modified test
            vscode.window.showInformationMessage(`Test file modified: ${fileName}`);
        }
    }

    /**
     * Handle file deletion events
     */
    private handleFileDelete(uri: vscode.Uri): void {
        const fileName = path.basename(uri.fsPath);
        console.log(`File deleted: ${fileName}`);

        if (this.isTestFile(uri.fsPath)) {
            vscode.window.showInformationMessage(`Test file deleted: ${fileName}`);
        }
    }

    /**
     * Check if a file should be ignored
     */
    private shouldIgnoreFile(uri: vscode.Uri): boolean {
        const fileName = path.basename(uri.fsPath);
        
        // Ignore node_modules, .git, and other common directories
        const ignoredPaths = [
            'node_modules',
            '.git',
            'dist',
            'out',
            '.vscode'
        ];

        // Ignore certain file extensions
        const ignoredExtensions = [
            '.log',
            '.map',
            '.lock'
        ];

        // Check if file is in ignored directory
        if (ignoredPaths.some(dir => uri.fsPath.includes(dir))) {
            return true;
        }

        // Check if file has ignored extension
        if (ignoredExtensions.some(ext => fileName.endsWith(ext))) {
            return true;
        }

        return false;
    }

    /**
     * Check if a file is a test file
     */
    private isTestFile(filePath: string): boolean {
        const fileName = path.basename(filePath);
        return (
            fileName.includes('.test.') ||
            fileName.includes('.spec.') ||
            filePath.includes('__tests__') ||
            filePath.includes('/test/')
        );
    }

    /**
     * Dispose of the file watcher
     */
    public dispose(): void {
        this.fileWatcher.dispose();
    }
} 