import * as React from 'react';
import { componentStyles } from '../styles/components';
import { LoadingDots } from './LoadingDots';

export interface FileChange {
    filePath: string;
    changeType: 'add' | 'modify' | 'delete';
}

export interface ProposedChangesProps {
    changes: FileChange[];
    onViewDiff: (filePath: string) => void;
    isLoading?: boolean;
}

export const ProposedChanges: React.FC<ProposedChangesProps> = ({ 
    changes, 
    onViewDiff,
    isLoading = false 
}) => {
    return (
        <div style={componentStyles.panel}>
            <div style={componentStyles.panelHeader}>
                <h3 style={componentStyles.panelTitle}>Proposed Changes</h3>
                <span style={componentStyles.badge}>{isLoading ? '...' : changes.length}</span>
            </div>
            <div style={componentStyles.tableContainer}>
                {isLoading ? (
                    <LoadingDots />
                ) : (
                    <table style={componentStyles.table}>
                        <tbody>
                            {changes.map((change, index) => (
                                <tr key={index} style={componentStyles.tableRow}>
                                    <td style={componentStyles.tableCell}>
                                        {change.changeType === 'modify' ? '✎' : 
                                         change.changeType === 'add' ? '➕' : '➖'}
                                    </td>
                                    <td style={{...componentStyles.tableCell, width: '100%'}}>
                                        {change.filePath}
                                    </td>
                                    <td style={componentStyles.tableCell}>
                                        <button 
                                            style={{...componentStyles.linkButton, padding: '0 4px'}}
                                            onClick={() => onViewDiff(change.filePath)}
                                            title="View Diff"
                                        >
                                            ⇄
                                        </button>
                                    </td>
                                    <td style={componentStyles.tableCell}>{change.changeType}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}; 