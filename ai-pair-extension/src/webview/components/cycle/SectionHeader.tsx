import * as React from 'react';

interface SectionHeaderProps {
    title: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title }) => (
    <div style={{
        padding: '4px 8px',
        backgroundColor: 'var(--vscode-sideBarSectionHeader-background)',
        color: 'var(--vscode-sideBarTitle-foreground)',
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
        borderBottom: '1px solid var(--vscode-panel-border)'
    }}>
        {title}
    </div>
);