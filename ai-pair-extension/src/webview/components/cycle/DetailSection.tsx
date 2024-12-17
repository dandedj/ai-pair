import * as React from 'react';

interface DetailSectionProps {
    title: string;
    children: React.ReactNode;
    headerActions?: React.ReactNode;
    style?: React.CSSProperties;
}

export const DetailSection: React.FC<DetailSectionProps> = ({ 
    title, 
    children, 
    headerActions,
    style
}) => {
    return (
        <div style={{ ...style, marginBottom: '16px' }}>
            <div style={{ 
                padding: '4px 8px',
                backgroundColor: '#2D2D2D',
                borderBottom: '1px solid var(--vscode-panel-border)',
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <span style={{ 
                    fontSize: '11px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    color: 'white'
                }}>{title}</span>
                {headerActions}
            </div>
            <div style={{ padding: '8px' }}>
                {children}
            </div>
        </div>
    );
};