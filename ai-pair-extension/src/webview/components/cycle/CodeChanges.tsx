import * as React from 'react';
import { componentStyles } from '../../styles/components';
import { getVSCodeAPI } from '../../vscodeApi';
import { ViewLogsLink } from '../common/ViewLogsLink';

export interface FileChange {
    filePath: string;
    changeType: 'add' | 'modify' | 'delete' | 'test';
    cycleNumber?: number;
}

export interface CodeChangesProps {
    changes: {
        filePath: string;
        changeType: 'add' | 'modify' | 'delete' | 'test';
    }[];
    onViewDiff?: (filePath: string) => void;
    onViewLog?: () => void;
    cycleNumber?: number;
}

const isTestFile = (filePath: string): boolean => {
    return filePath.includes('.test.') || filePath.includes('.spec.') || filePath.includes('__tests__');
};

export const CodeChanges: React.FC<CodeChangesProps> = ({
    changes,
    onViewDiff,
    cycleNumber
}) => {
    // Get vscode API using React.useMemo to ensure it's only created once
    const vscodeApi = React.useMemo(() => getVSCodeAPI(), []);

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
            case 'test': return '⚠️';
        }
    };

    return (
        <div>
            <div style={componentStyles.panelHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={componentStyles.panelTitle}>Code Changes</h3>
                </div>
                <span style={componentStyles.badge}>{changes.length}</span>
            </div>
            {changes.length > 0 && (
                <div style={componentStyles.tableContainer}>
                    <table style={componentStyles.table}>
                        <tbody>
                            {changes.map((change, index) => (
                                <React.Fragment key={index}>
                                    <tr style={componentStyles.tableRow}>
                                        <td style={{ ...componentStyles.tableCell, width: '20px' }}>
                                            {getChangeIcon(change.changeType)}
                                        </td>
                                        <td style={componentStyles.tableCell}>
                                            {change.filePath}
                                        </td>
                                        <td style={{ 
                                            ...componentStyles.tableCell, 
                                            width: '50px', 
                                            textAlign: 'right',
                                            padding: '4px 0',
                                            whiteSpace: 'nowrap',
                                            overflow: 'visible'
                                        }}>
                                            <button
                                                onClick={() => {
                                                    if (change.filePath) {
                                                        handleViewDiff(change.filePath);
                                                    }
                                                }}
                                                style={{
                                                    ...componentStyles.linkButton,
                                                    fontSize: '11px',
                                                    color: 'var(--vscode-textLink-foreground)',
                                                    textDecoration: 'none',
                                                    cursor: 'pointer',
                                                    border: 'none',
                                                    background: 'none',
                                                    padding: 0,
                                                    margin: 0,
                                                    display: 'inline',
                                                    lineHeight: 1,
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                View Diff
                                            </button>
                                        </td>
                                    </tr>
                                    {change.changeType === 'test' && (
                                        <tr>
                                            <td colSpan={3} style={{
                                                ...componentStyles.tableCell,
                                                color: 'var(--vscode-testing-iconFailed)',
                                                fontSize: '11px',
                                                paddingTop: 0
                                            }}>
                                                Change suggested in test file {change.filePath}, but not made. Please review
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}; 