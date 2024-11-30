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
    label: {
        color: 'var(--vscode-foreground)',
        marginBottom: '4px',
        display: 'block'
    },

    // Buttons
    button: {
        backgroundColor: 'var(--vscode-button-background)',
        color: 'var(--vscode-button-foreground)',
        border: 'none',
        padding: '4px 12px',
        borderRadius: '2px',
        cursor: 'pointer',
        height: '24px'
    },
    buttonHover: {
        backgroundColor: 'var(--vscode-button-hoverBackground)'
    },
    buttonSecondary: {
        backgroundColor: 'var(--vscode-button-secondaryBackground)',
        color: 'var(--vscode-button-secondaryForeground)'
    },

    // Text
    heading: {
        color: 'var(--vscode-foreground)',
        fontWeight: 600,
        fontSize: '1.2em',
        marginBottom: '12px'
    },
    text: {
        color: 'var(--vscode-foreground)',
        fontSize: '13px'
    },
    description: {
        color: 'var(--vscode-descriptionForeground)',
        fontSize: '12px',
        marginBottom: '8px'
    },

    // Status
    error: {
        color: 'var(--vscode-errorForeground)',
        fontSize: '12px',
        marginTop: '4px'
    },
    success: {
        color: 'var(--vscode-terminal-ansiGreen)',
        fontSize: '12px',
        marginTop: '4px'
    },

    // Lists
    list: {
        listStyle: 'none',
        padding: 0,
        margin: 0
    },
    listItem: {
        padding: '4px 0',
        borderBottom: '1px solid var(--vscode-widget-border)'
    },

    // Badges
    badge: {
        backgroundColor: 'var(--vscode-badge-background)',
        color: 'var(--vscode-badge-foreground)',
        padding: '2px 6px',
        borderRadius: '10px',
        fontSize: '11px'
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
    }
}; 