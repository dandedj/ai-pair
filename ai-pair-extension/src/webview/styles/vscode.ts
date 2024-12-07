export const vscodeStyles = {
    // Layout
    container: {
        padding: '10px 5px',
        height: '100%',
        overflow: 'auto'
    },
    section: {
        marginBottom: '15px',
        padding: '4px'
    },
    row: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: '8px'
    },

    // Form Elements
    input: {
        flex: 1,
        backgroundColor: 'var(--vscode-input-background)',
        color: 'var(--vscode-input-foreground)',
        border: '1px solid var(--vscode-input-border)',
        padding: '4px 8px',
        borderRadius: '2px',
        height: '24px'
    },
    select: {
        flex: 1,
        backgroundColor: 'var(--vscode-dropdown-background)',
        color: 'var(--vscode-dropdown-foreground)',
        border: '1px solid var(--vscode-dropdown-border)',
        padding: '2px 6px',
        borderRadius: '2px',
        height: '24px'
    },
    checkbox: {
        margin: 0,
        padding: 0,
        height: '18px',
        width: '18px'
    },
    formGroup: {
        display: 'flex',
        alignItems: 'center',
        marginBottom: '12px',
        gap: '8px'
    },
    labelContainer: {
        flex: '0 0 80px',
        color: 'var(--vscode-foreground)',
        fontSize: '13px'
    },

    label: {
        color: 'var(--vscode-foreground)',
        fontSize: '13px',
        marginBottom: '4px',
        display: 'block'
    },

    button: {
        backgroundColor: 'var(--vscode-button-background)',
        color: 'var(--vscode-button-foreground)',
        border: 'none',
        padding: '4px 12px',
        borderRadius: '2px',
        cursor: 'pointer'
    }
}; 