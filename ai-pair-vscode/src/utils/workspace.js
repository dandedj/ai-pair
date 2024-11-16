const vscode = require('vscode');

function getRootDirectory() {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    
    if (workspaceFolders && workspaceFolders.length > 0) {
        const rootDirectory = workspaceFolders[0].uri.fsPath;
        console.log("Root Directory:", rootDirectory);
        return rootDirectory;
    } else {
        console.log("No folder is open in the workspace.");
        return null;
    }
}

module.exports = { getRootDirectory }; 