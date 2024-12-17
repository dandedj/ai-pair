import * as React from 'react';
import { componentStyles } from '../../styles/components';
import { LoadingDots } from '../common/LoadingDots';
import { LogViewer } from '../logging/LogViewer';
import { ViewLogsLink } from '../common/ViewLogsLink';

interface TestResultsProps {
    passedTests: string[];
    failedTests: string[];
    erroredTests: string[];
    isLoading: boolean;
    cycleNumber: number;
    isFinal: boolean;
}

export const TestResults: React.FC<TestResultsProps> = ({ 
    passedTests = [],
    failedTests = [],
    erroredTests = [],
    isLoading = false,
    cycleNumber,
    isFinal
}) => {
    const totalTests = passedTests.length + failedTests.length + erroredTests.length;
    const allPassed = failedTests.length === 0 && erroredTests.length === 0;

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isLoading ? (
                        <>
                            <LoadingDots label="Running tests" />
                        </>
                    ) : (
                        <>
                            <span className={`codicon codicon-${allPassed ? 'pass-filled' : 'error'}`} 
                                  style={{ color: allPassed ? 'var(--vscode-testing-iconPassed)' : 'var(--vscode-testing-iconFailed)' }}
                            />
                            <span>Tests</span>
                        </>
                    )}
                </div>
                <ViewLogsLink
                    label="View Logs"
                    cycleNumber={cycleNumber}
                    logType="test"
                    stage={isFinal ? 'final' : 'initial'}
                />
            </div>
            {!isLoading && (
                <div style={componentStyles.tableContainer}>
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
                </div>
            )}
        </div>
    );
}; 