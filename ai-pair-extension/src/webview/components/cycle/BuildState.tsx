import * as React from 'react';
import { componentStyles } from '../../styles/components';
import { LoadingDots } from '../common/LoadingDots';
import { LogViewer } from '../logging/LogViewer';
import { ViewLogsLink } from '../common/ViewLogsLink';

interface BuildStateProps {
    isCompiled: boolean;
    isLoading?: boolean;
    cycleNumber: number;
    isFinal: boolean;
    buildDuration?: number;
}

export const BuildState: React.FC<BuildStateProps> = ({ 
    isCompiled,
    isLoading = false,
    cycleNumber,
    isFinal,
    buildDuration
}) => {

    const formatDuration = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        return `${seconds}s`;
    };

    const getStatus = () => {
        if (isLoading) {
            return <LoadingDots label="Building" />;
        }
        if (isCompiled) {
            return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="codicon codicon-pass-filled" style={{ color: 'var(--vscode-testing-iconPassed)' }} />
                    <span>Build was successful</span>
                    {buildDuration !== undefined && (
                        <span style={{ opacity: 0.7, fontSize: '12px' }}>
                            ({formatDuration(buildDuration)})
                        </span>
                    )}
                </div>
            );
        }
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="codicon codicon-error" style={{ color: 'var(--vscode-testing-iconFailed)' }} />
                <span>Build failed</span>
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
            {getStatus()}
            <ViewLogsLink
                label="View Logs"
                cycleNumber={cycleNumber}
                logType="build"
                stage={isFinal ? 'final' : 'initial'}
            />
        </div>
    );
}; 