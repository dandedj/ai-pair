import * as React from 'react';
import { componentStyles } from '../styles/components';
import { LoadingDots } from './LoadingDots';

interface StatusBarProps {
    status?: 'idle' | 'thinking' | 'generating' | 'error';
    message?: string;
    isLoading?: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({ 
    status = 'idle',
    message = 'AI pair programmer is ready',
    isLoading = false
}) => {
    const getStatusColor = () => {
        if (isLoading) return 'var(--vscode-statusBarItem-prominentBackground)';
        switch (status) {
            case 'thinking':
                return 'var(--vscode-statusBarItem-warningBackground)';
            case 'generating':
                return 'var(--vscode-statusBarItem-prominentBackground)';
            case 'error':
                return 'var(--vscode-statusBarItem-errorBackground)';
            default:
                return 'var(--vscode-statusBarItem-activeBackground)';
        }
    };

    return (
        <div style={componentStyles.panel}>
            <div style={{
                ...componentStyles.panelHeader,
                backgroundColor: getStatusColor(),
                color: 'var(--vscode-statusBarItem-foreground)',
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                {isLoading ? (
                    <LoadingDots />
                ) : (
                    <>
                        <span>{status === 'thinking' ? '🤔' : 
                              status === 'generating' ? '⚡' : 
                              status === 'error' ? '❌' : '✓'}</span>
                        <span style={{ flex: 1 }}>{message}</span>
                    </>
                )}
            </div>
        </div>
    );
}; 