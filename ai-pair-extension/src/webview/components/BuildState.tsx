import * as React from 'react';
import { componentStyles } from '../styles/components';
import { LoadingDots } from './LoadingDots';

const vscode = (window as any).vscode;

interface BuildStateProps {
    isCompiled: boolean;
    isLoading?: boolean;
    hideHeader?: boolean;
    logFile?: string;
    onViewLog?: (logFile: string) => void;
}

export const BuildState: React.FC<BuildStateProps> = ({ 
    isCompiled,
    isLoading = false,
    logFile,
    onViewLog
}) => {
    const handleViewLog = () => {
        if (logFile && onViewLog) {
            onViewLog(logFile);
        }
    };

    const getStatus = () => {
        if (isLoading) {
            return <LoadingDots />;
        }
        if (isCompiled) {
            return <span style={componentStyles.successBadge}>✓ Compiled</span>;
        }
        return <span style={{...componentStyles.badge, backgroundColor: 'var(--vscode-testing-iconFailed)'}}>Failed</span>;
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
            {getStatus()}
            {logFile && (
                <button 
                    onClick={handleViewLog}
                    style={componentStyles.linkButton}
                >
                    View Logs
                </button>
            )}
        </div>
    );
}; 