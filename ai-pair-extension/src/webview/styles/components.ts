export const componentStyles = {
    panel: {
        backgroundColor: 'var(--vscode-editor-background)',
        border: '1px solid var(--vscode-widget-border)',
        borderRadius: '3px',
        marginBottom: '8px',
        overflow: 'hidden'
    },
    panelHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '4px 8px',
        backgroundColor: 'var(--vscode-sideBar-background)',
        borderBottom: '1px solid var(--vscode-widget-border)'
    },
    panelTitle: {
        margin: 0,
        fontSize: '11px',
        fontWeight: 600,
        color: 'var(--vscode-foreground)',
        textTransform: 'uppercase' as const
    },
    tableContainer: {
        maxHeight: '200px',
        overflow: 'auto',
        padding: '4px'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse' as const,
        fontSize: '12px'
    },
    tableRow: {
        borderBottom: '1px solid var(--vscode-widget-border)'
    },
    tableCell: {
        padding: '2px 4px',
        color: 'var(--vscode-foreground)'
    },
    linkButton: {
        background: 'none',
        border: 'none',
        padding: '0',
        color: 'var(--vscode-textLink-foreground)',
        cursor: 'pointer',
        fontSize: 'inherit',
        textDecoration: 'none'
    },
    successBadge: {
        backgroundColor: 'var(--vscode-testing-iconPassed)',
        color: 'var(--vscode-testing-runAction)',
        padding: '1px 4px',
        borderRadius: '3px',
        fontSize: '10px'
    },
    badge: {
        backgroundColor: 'var(--vscode-badge-background)',
        color: 'var(--vscode-badge-foreground)',
        padding: '1px 4px',
        borderRadius: '3px',
        fontSize: '10px'
    },
    loadingDot: {
        display: 'inline-block',
        width: '4px',
        height: '4px',
        margin: '0 2px',
        backgroundColor: 'var(--vscode-foreground)',
        borderRadius: '50%',
        opacity: 0.4,
        animation: 'loadingDotPulse 1.4s infinite ease-in-out'
    },
    loadingContainer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '8px',
        color: 'var(--vscode-descriptionForeground)'
    },
    '@keyframes loadingDotPulse': {
        '0%, 80%, 100%': { opacity: 0.4 },
        '40%': { opacity: 1 }
    }
} as const; 