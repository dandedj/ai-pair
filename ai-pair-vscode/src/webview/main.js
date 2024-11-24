document.addEventListener('DOMContentLoaded', function () {
    const vscode = acquireVsCodeApi();
    console.log('Sidebar script loaded.');

    const accordionButtons = document.querySelectorAll('.accordion-button');
    accordionButtons.forEach(button => {
        button.addEventListener('click', function () {
            const content = this.nextElementSibling;
            content.classList.toggle('show');
        });
    });

    window.addEventListener('message', event => {
        const message = event.data;
        console.log('Message received in webview:', message);
        if (message.type === 'updateTestResults') {
            const tableBody = document.getElementById('testResultsTable').getElementsByTagName('tbody')[0];
            tableBody.innerHTML = ''; // Clear existing rows
            message.value.forEach(test => {
                const row = tableBody.insertRow();
                const nameCell = row.insertCell(0);
                const statusCell = row.insertCell(1);
                nameCell.textContent = test.name;
                statusCell.textContent = test.status;
            });
        }
    });
});