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
            <h1>AI Pair Programmer</h1>
            <p>Click the "Activate" button to start the AI Pair Programmer.</p>
            <button class="button" id="activateButton">Activate</button>
            <div class="loading" id="loadingIndicator">Loading...</div>

            <div class="pane">
                <h2>Test Status</h2>
                <div id="testResults">No tests run yet.</div>
            </div>

            <div class="pane">
                <h2>Changes</h2>
                <div id="changedFiles">No changes detected.</div>
            </div>

            <div class="pane">
                <h2>Progress</h2>
                <div class="progress-bar-container">
                    <div class="progress-bar" id="progressBar"></div>
                </div>
            </div>

            <script>
                const vscode = acquireVsCodeApi();
                console.log('Sidebar script loaded.');

                document.getElementById('activateButton').addEventListener('click', () => {
                    console.log('Activate button clicked');
                    document.getElementById('loadingIndicator').style.display = 'block';
                    vscode.postMessage({ command: 'activate' });
                });

                window.addEventListener('message', event => {
                    const message = event.data;
                    console.log('Message received in webview:', message);
                    switch (message.type) {
                        case 'updateProgress':
                            document.getElementById('progressBar').style.width = message.value + '%';
                            break;
                        case 'updateTestResults':
                            document.getElementById('testResults').innerText = message.value;
                            break;
                        case 'updateChangedFiles':
                            document.getElementById('changedFiles').innerText = message.value;
                            break;
                        case 'hideLoading':
                            document.getElementById('loadingIndicator').style.display = 'none';
                            break;
                    }
                });
            </script>
        </body>
        </html>
    `;
}

module.exports = { getWebviewContent }; 