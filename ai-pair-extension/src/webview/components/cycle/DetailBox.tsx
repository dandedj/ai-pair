import * as React from 'react';

interface DetailBoxProps {
    children: React.ReactNode;
    style?: React.CSSProperties;
}

export const DetailBox: React.FC<DetailBoxProps> = ({ children, style }) => (
    <div style={{
        backgroundColor: '#1e1e1e',
        border: '1px solid var(--vscode-panel-border)',
        borderRadius: '4px',
        overflow: 'hidden',
        ...style
    }}>
        {children}
    </div>
);