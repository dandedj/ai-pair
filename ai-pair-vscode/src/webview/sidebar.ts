function getWebviewContent(stylesUri: string, scriptUri: string): string {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>AI Pair Programmer</title>
            <link rel="stylesheet" type="text/css" href="${stylesUri}">
        </head>
        <body>
            <h1>AI Pair Programmer</h1>
            <div class="accordion">
                <div class="accordion-item">
                    <button class="accordion-button">Overview</button>
                    <div class="accordion-content">
                        <div id="testResultsContainer">
                            <h2>Test Results</h2>
                            <table id="testResultsTable">
                                <thead>
                                    <tr>
                                        <th>Test Name</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <!-- Test results will be inserted here -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                <div class="accordion-item">
                    <button class="accordion-button">Configuration</button>
                    <div class="accordion-content">
                        <p>Configuration details will be displayed here.</p>
                    </div>
                </div>
                <div class="accordion-item">
                    <button class="accordion-button">Help</button>
                    <div class="accordion-content">
                        <p>Help information will be displayed here.</p>
                    </div>
                </div>
            </div>

            <script src="${scriptUri}"></script>
        </body>
        </html>
    `;
}

export { getWebviewContent }; 