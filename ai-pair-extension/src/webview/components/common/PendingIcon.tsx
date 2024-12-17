import * as React from 'react';

export const PendingIcon: React.FC = () => (
    <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px',
        color: 'var(--vscode-disabledForeground)',
        fontSize: '12px' 
    }}>
        <span className="codicon codicon-circle-outline" />
        <span>Pending</span>
    </div>
); 