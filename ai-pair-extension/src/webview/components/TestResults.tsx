import * as React from 'react';
import { componentStyles } from '../styles/components';
import { LoadingDots } from './LoadingDots';

const vscode = (window as any).vscode;

interface TestResultsProps {
    passedTests: string[];
    failedTests: string[];
    erroredTests: string[];
    isLoading: boolean;
    hideHeader?: boolean;
    logFile?: string;
    onViewLog?: (logFile: string) => void;
}

export const TestResults: React.FC<TestResultsProps> = ({ 
    passedTests = [],
    failedTests = [],
    erroredTests = [],
    isLoading = false,
    hideHeader,
    logFile,
    onViewLog,
}) => {
    const totalTests = passedTests.length + failedTests.length + erroredTests.length;

    const handleViewLog = () => {
        if (logFile && onViewLog) {
            onViewLog(logFile);
        } else {
            vscode.postMessage({ /* ... */ });
        }
    };

    return (
        <div>
            {!hideHeader && (
                <div style={componentStyles.panelHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={componentStyles.panelTitle}>Test Results</h3>
                        {logFile && (
                            <button 
                                onClick={handleViewLog}
                                style={componentStyles.linkButton}
                            >
                                View Logs
                            </button>
                        )}
                    </div>
                    <span style={componentStyles.badge}>
                        {isLoading ? '...' : `${passedTests.length}/${totalTests}`}
                    </span>
                </div>
            )}
            <div style={componentStyles.tableContainer}>
                {isLoading ? (
                    <LoadingDots />
                ) : (
                    <table style={componentStyles.table}>
                        <tbody>
                            {passedTests.map((test, index) => (
                                <tr key={`pass-${index}`} style={componentStyles.tableRow}>
                                    <td style={componentStyles.tableCell}>✓</td>
                                    <td style={{...componentStyles.tableCell, width: '100%'}}>{test}</td>
                                </tr>
                            ))}
                            {failedTests.map((test, index) => (
                                <tr key={`fail-${index}`} style={componentStyles.tableRow}>
                                    <td style={componentStyles.tableCell}>✕</td>
                                    <td style={{...componentStyles.tableCell, width: '100%'}}>{test}</td>
                                </tr>
                            ))}
                            {erroredTests.map((test, index) => (
                                <tr key={`error-${index}`} style={componentStyles.tableRow}>
                                    <td style={componentStyles.tableCell}>⚠</td>
                                    <td style={{...componentStyles.tableCell, width: '100%'}}>{test}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}; 