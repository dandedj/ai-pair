import * as React from 'react';
import { Status, getStatusDisplay } from 'ai-pair';
import { LoadingDots } from './common/LoadingDots';

interface StatusIndicatorProps {
    status: Status;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
    const getStatusColor = () => {
        switch (status) {
            case Status.IDLE: return 'var(--vscode-foreground)';
            case Status.BUILDING: return 'var(--vscode-charts-yellow)';
            case Status.TESTING: return 'var(--vscode-testing-run-icon)';
            case Status.GENERATING_CODE: return 'var(--vscode-charts-blue)';
            case Status.APPLYING_CHANGES: return 'var(--vscode-charts-purple)';
            case Status.REBUILDING: return 'var(--vscode-charts-yellow)';
            case Status.RETESTING: return 'var(--vscode-testing-iconQueued)';
            case Status.COMPLETED: return 'var(--vscode-testing-iconPassed)';
            default: return 'var(--vscode-foreground)';
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: getStatusColor(), fontWeight: 600 }}>
                {getStatusDisplay(status)}
            </span>
            {status !== Status.IDLE && status !== Status.COMPLETED && <LoadingDots />}
        </div>
    );
}; 