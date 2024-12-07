export const componentStyles = {
    statusBar: {
        backgroundColor: 'var(--vscode-sideBar-background)',
        padding: '4px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--vscode-panel-border)'
    },
    panel: {
        backgroundColor: '#212121',
        border: '1px solid var(--vscode-panel-border)',
        borderRadius: '4px',
        overflow: 'hidden',
        marginBottom: 0
    },
    panelHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 8px',
        backgroundColor: 'var(--vscode-sideBarSectionHeader-background)',
        borderBottom: '1px solid var(--vscode-panel-border)'
    },
    panelTitle: {
        margin: 0,
        fontSize: '11px',
        fontWeight: 600,
        color: 'var(--vscode-foreground)',
        textTransform: 'uppercase' as const
    },
    tableContainer: {
        overflowX: 'auto',
        width: '100%',
        maxWidth: '100%'
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '12px',
        tableLayout: 'fixed'
    },
    tableRow: {
        borderBottom: '1px solid var(--vscode-panel-border)',
        transition: 'background-color 0.2s',
        '&:hover': {
            backgroundColor: 'var(--vscode-list-hoverBackground)',
        }
    },
    tableCell: {
        padding: '4px 8px',
        textAlign: 'left',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
    },
    linkButton: {
        background: 'none',
        backgroundColor: 'transparent',
        border: 'none',
        padding: '2px 4px',
        color: 'var(--vscode-textLink-foreground)',
        cursor: 'pointer',
        fontSize: 'inherit',
        textDecoration: 'none',
        ':hover': {
            color: 'var(--vscode-textLink-activeForeground)'
        }
    },
    successBadge: {
        backgroundColor: 'var(--vscode-testing-iconPassed)',
        color: 'var(--vscode-editor-background)',
        padding: '1px 4px',
        borderRadius: '3px',
        fontSize: '10px',
        fontWeight: 600
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
    },
    button: {
        backgroundColor: 'var(--vscode-button-background)',
        color: 'var(--vscode-button-foreground)',
        border: 'none',
        padding: '4px 12px',
        borderRadius: '2px',
        cursor: 'pointer',
        fontSize: '13px',
        ':disabled': {
            opacity: 0.5,
            cursor: 'not-allowed'
        },
        ':hover:not(:disabled)': {
            backgroundColor: 'var(--vscode-button-hoverBackground)'
        }
    },
    select: {
        backgroundColor: 'var(--vscode-dropdown-background)',
        color: 'var(--vscode-dropdown-foreground)',
        border: '1px solid var(--vscode-dropdown-border)',
        padding: '4px 8px',
        borderRadius: '2px',
        fontSize: '12px'
    },
    iconButton: {
        backgroundColor: 'transparent',
        color: 'var(--vscode-foreground)',
        border: 'none',
        padding: '4px 8px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        fontSize: '13px',
        ':hover': {
            backgroundColor: 'var(--vscode-toolbar-hoverBackground)'
        }
    }
} as const; 