function getWebviewContent(stylesUri, scriptUri, config) {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>AI Pair Programmer</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    color: #d4d4d4;
                    padding: 20px;
                    background-color: #1e1e1e;
                }
                h1 {
                    font-size: 1.5em;
                    margin-bottom: 0.5em;
                }
                p {
                    margin-bottom: 1em;
                }
                .button {
                    background-color: #007acc;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    text-align: center;
                    text-decoration: none;
                    display: inline-block;
                    font-size: 16px;
                    margin: 4px 2px;
                    cursor: pointer;
                    border-radius: 4px;
                }
                .pane {
                    background-color: #252526;
                    border-radius: 5px;
                    padding: 15px;
                    margin-top: 15px;
                }
                .progress-bar-container {
                    width: 100%;
                    background-color: #3c3c3c;
                    border-radius: 5px;
                    overflow: hidden;
                    margin-top: 10px;
                }
                .progress-bar {
                    width: 0%;
                    height: 20px;
                    background-color: #0e70c0;
                    transition: width 0.5s ease;
                }
                .loading {
                    display: none;
                    margin-top: 10px;
                }
            </style>
        </head>
        <body>
            <h1>AI Pair Programmer - Setup</h1>
            <p>The Pair Programmer needs a selected model and API Key to work properly. </p>
            <button class="button" id="saveButton">Get Started</button>

            <script>
                const vscode = acquireVsCodeApi();
                console.log('Sidebar config script loaded.');

                document.getElementById('saveButton').addEventListener('click', () => {
                    console.log('Save button clicked');
                    vscode.postMessage({ command: 'config' });
                });

                window.addEventListener('message', event => {
                    const message = event.data;
                    console.log('Message received in webview:', message);
                    switch (message.type) {
                        case 'saveConfig':
                            document.getElementById('progressBar').style.width = message.value + '%';
                            break;
                    }
                });
            </script>
        </body>
        </html>
    `;
}

module.exports = { getWebviewContent }; 