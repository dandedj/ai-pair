import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class DiffProvider {
    /**
     * Shows a diff between two pieces of content in the editor
     */
    public async showDiff(
        originalFile: string,
        modifiedFile: string,
        title: string
    ): Promise<void> {
        try {
            const originalUri = vscode.Uri.file(originalFile);
            const modifiedUri = vscode.Uri.file(modifiedFile);

            // Get the language ID from the original file (without .orig)
            const languageId = this.getLanguageId(originalFile.replace(/\.orig$/, ''));

            await vscode.commands.executeCommand('vscode.diff',
                originalUri,
                modifiedUri,
                title,
                {
                    preview: true,
                    originalLanguageId: languageId,
                    modifiedLanguageId: languageId
                }
            );
        } catch (error) {
            console.error('Error showing diff:', error);
            vscode.window.showErrorMessage(`Failed to show diff: ${error}`);
        }
    }

    /**
     * Get the VS Code language ID based on file extension
     */
    private getLanguageId(filePath: string): string {
        const ext = path.extname(filePath).toLowerCase();
        const languageMap: { [key: string]: string } = {
            '.ts': 'typescript',
            '.tsx': 'typescriptreact',
            '.js': 'javascript',
            '.jsx': 'javascriptreact',
            '.py': 'python',
            '.java': 'java',
            '.cpp': 'cpp',
            '.c': 'c',
            '.cs': 'csharp',
            '.go': 'go',
            '.rs': 'rust',
            '.swift': 'swift',
            '.rb': 'ruby',
            '.php': 'php',
            '.html': 'html',
            '.css': 'css',
            '.scss': 'scss',
            '.less': 'less',
            '.json': 'json',
            '.md': 'markdown',
            '.yaml': 'yaml',
            '.yml': 'yaml',
            '.xml': 'xml',
            '.sh': 'shellscript',
            '.bash': 'shellscript',
            '.zsh': 'shellscript',
            '.gradle': 'gradle',
            '.kt': 'kotlin',
            '.kts': 'kotlin'
        };

        return languageMap[ext] || 'plaintext';
    }

    private _documents = new Map<string, vscode.TextDocument>();

    /**
     * Creates a URI for a temporary file
     */
    private createTempFileUri(fileName: string, suffix: string): vscode.Uri {
        const extension = path.extname(fileName);
        const baseName = path.basename(fileName, extension);
        return vscode.Uri.parse(
            `untitled:${baseName}-${suffix}${extension}`
        );
    }

    /**
     * Creates a virtual document with the given content
     */
    private async createVirtualDocument(
        uri: vscode.Uri,
        content: string
    ): Promise<vscode.TextDocument> {
        let doc = await vscode.workspace.openTextDocument(uri);
        
        // If the document is empty, populate it with content
        if (doc.getText() === '') {
            const edit = new vscode.WorkspaceEdit();
            edit.insert(uri, new vscode.Position(0, 0), content);
            await vscode.workspace.applyEdit(edit);
            doc = await vscode.workspace.openTextDocument(uri);
        }
        
        return doc;
    }

    /**
     * Shows proposed changes for a file
     */
    public async showProposedChanges(
        filePath: string,
        config: { tmpDir: string },
        description: string = 'AI Proposed Changes'
    ): Promise<void> {
        try {
            // Get the most recent archive directory
            const archiveDir = path.join(config.tmpDir, 'archive');
            const timestamps = await fs.promises.readdir(archiveDir);
            const latestTimestamp = timestamps.sort().reverse()[0];
            const latestDir = path.join(archiveDir, latestTimestamp);

            // Get the original and modified file paths
            const originalPath = path.join(latestDir, `${filePath}.orig`);
            const modifiedPath = path.join(latestDir, filePath);

            await this.showDiff(
                originalPath,
                modifiedPath,
                description
            );
        } catch (error) {
            console.error('Error showing proposed changes:', error);
            vscode.window.showErrorMessage(`Failed to show diff: ${error}`);
        }
    }

    /**
     * Shows a preview of changes before applying them
     */
    public async previewChanges(
        changes: Array<{
            filePath: string;
        }>,
        config: { tmpDir: string }
    ): Promise<void> {
        // For multiple files, show them in sequence
        for (const change of changes) {
            await this.showProposedChanges(
                change.filePath,
                config
            );
        }
    }

    /**
     * Apply changes to a file
     */
    public async applyChanges(
        filePath: string,
        newContent: string
    ): Promise<boolean> {
        try {
            const uri = vscode.Uri.file(filePath);
            const edit = new vscode.WorkspaceEdit();
            
            // Ensure parent directories exist
            const parentDir = path.dirname(filePath);
            if (!fs.existsSync(parentDir)) {
                fs.mkdirSync(parentDir, { recursive: true });
            }

            // Create the file if it doesn't exist
            if (!fs.existsSync(filePath)) {
                fs.writeFileSync(filePath, '');
            }
            
            // Read the current content
            const document = await vscode.workspace.openTextDocument(uri);
            const fullRange = new vscode.Range(
                document.positionAt(0),
                document.positionAt(document.getText().length)
            );

            // Replace the entire content
            edit.replace(uri, fullRange, newContent);
            
            // Apply the edit
            const success = await vscode.workspace.applyEdit(edit);
            
            if (success) {
                // Save the document
                const doc = await vscode.workspace.openTextDocument(uri);
                await doc.save();
            }

            return success;
        } catch (error) {
            console.error('Error applying changes:', error);
            return false;
        }
    }

    /**
     * Clean up any temporary documents
     */
    public dispose(): void {
        this._documents.clear();
    }
} 