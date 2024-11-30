import * as vscode from 'vscode';
import * as path from 'path';

export class DiffProvider {
    /**
     * Shows a diff between two pieces of content in the editor
     */
    public async showDiff(
        originalContent: string,
        modifiedContent: string,
        fileName: string,
        title: string = 'AI Pair Diff'
    ): Promise<void> {
        // Create URIs for the diff editor
        const originalUri = this.createTempFileUri(fileName, 'original');
        const modifiedUri = this.createTempFileUri(fileName, 'modified');

        // Create virtual documents for both versions
        const originalDoc = await this.createVirtualDocument(originalUri, originalContent);
        const modifiedDoc = await this.createVirtualDocument(modifiedUri, modifiedContent);

        // Show the diff editor
        await vscode.commands.executeCommand('vscode.diff',
            originalUri,
            modifiedUri,
            `${title} - ${path.basename(fileName)}`,
            {
                preview: true,
                preserveFocus: true
            }
        );

        // Store the documents to prevent garbage collection
        this._documents.set(originalUri.toString(), originalDoc);
        this._documents.set(modifiedUri.toString(), modifiedDoc);
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
        originalContent: string,
        proposedChanges: string,
        description: string = 'AI Proposed Changes'
    ): Promise<void> {
        const fileName = path.basename(filePath);
        await this.showDiff(
            originalContent,
            proposedChanges,
            fileName,
            description
        );
    }

    /**
     * Shows a preview of changes before applying them
     */
    public async previewChanges(
        changes: Array<{
            filePath: string;
            originalContent: string;
            modifiedContent: string;
        }>
    ): Promise<void> {
        // For multiple files, show them in sequence
        for (const change of changes) {
            await this.showProposedChanges(
                change.filePath,
                change.originalContent,
                change.modifiedContent
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