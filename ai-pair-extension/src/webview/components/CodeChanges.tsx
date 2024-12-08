import * as React from 'react';
import { componentStyles } from '../styles/components';
import { LoadingDots } from './LoadingDots';
import { getVSCodeAPI } from '../vscodeApi';

export interface FileChange {
    filePath: string;
    changeType: 'add' | 'modify' | 'delete';
    cycleNumber?: number;
}

export interface CodeChangesProps {
    changes: Array<{
        filePath: string;
        changeType: 'add' | 'modify' | 'delete';
    }>;
    hideHeader?: boolean;
    onViewDiff?: (filePath: string) => void;
    isLoading?: boolean;
    logFile?: string;
    onViewLog?: (logFile: string) => void;
    cycleNumber?: number;
}

export const CodeChanges: React.FC<CodeChangesProps> = ({ 
    changes, 
    hideHeader, 
    onViewDiff, 
    isLoading = false,
    logFile,
    onViewLog,
    cycleNumber
}) => {
    // Get vscode API using React.useMemo to ensure it's only created once
    const vscodeApi = React.useMemo(() => getVSCodeAPI(), []);

    const handleViewLog = () => {
        if (logFile && onViewLog) {
            onViewLog(logFile);
        }
    };

    const handleViewDiff = (filePath: string) => {
        if (onViewDiff) {
            onViewDiff(filePath);
        } else if (vscodeApi) {
            // Send message to extension to view diff
            vscodeApi.postMessage({
                type: 'viewDiff',
                filePath,
                cycleNumber,
                originalPath: `${filePath}.orig`
            });
        } else {
            console.warn('VS Code API not available and no onViewDiff callback provided');
        }
    };

    const getChangeIcon = (type: FileChange['changeType']) => {
        switch (type) {
            case 'add': return '✚';
            case 'modify': return '✎';
            case 'delete': return '✖';
        }
    };

    return (
        <div>
            {!hideHeader && (
                <div style={componentStyles.panelHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={componentStyles.panelTitle}>Code Changes</h3>
                        {logFile && (
                            <button 
                                onClick={handleViewLog}
                                style={componentStyles.linkButton}
                            >
                                View Logs
                            </button>
                        )}
                    </div>
                    <span style={componentStyles.badge}>{changes.length}</span>
                </div>
            )}
            {changes.length > 0 && (
                <div style={componentStyles.tableContainer}>
                    <table style={componentStyles.table}>
                        <tbody>
                            {changes.map((change, index) => (
                                <tr key={index} style={componentStyles.tableRow}>
                                    <td style={{ ...componentStyles.tableCell, width: '20px' }}>
                                        {getChangeIcon(change.changeType)}
                                    </td>
                                    <td style={componentStyles.tableCell}>
                                        {change.filePath}
                                    </td>
                                    <td style={{ ...componentStyles.tableCell, width: '50px', textAlign: 'right' }}>
                                        <button
                                            onClick={() => handleViewDiff(change.filePath)}
                                            style={componentStyles.linkButton}
                                        >
                                            View Diff
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}; 