import * as React from 'react';
import { componentStyles } from '../styles/components';
import { LoadingDots } from './LoadingDots';

interface TestResult {
    name: string;
    status: 'passed' | 'failed' | 'skipped';
    duration: number;
    error?: string;
}

interface TestResultsProps {
    results: TestResult[];
    isLoading?: boolean;
}

export const TestResults: React.FC<TestResultsProps> = ({ 
    results,
    isLoading = false 
}) => {
    return (
        <div style={componentStyles.panel}>
            <div style={componentStyles.panelHeader}>
                <h3 style={componentStyles.panelTitle}>Test Results</h3>
                <span style={componentStyles.badge}>
                    {isLoading ? '...' : `${results.filter(r => r.status === 'passed').length}/${results.length}`}
                </span>
            </div>
            <div style={componentStyles.tableContainer}>
                {isLoading ? (
                    <LoadingDots />
                ) : (
                    <table style={componentStyles.table}>
                        <tbody>
                            {results.map((result, index) => (
                                <tr key={index} style={componentStyles.tableRow}>
                                    <td style={componentStyles.tableCell}>
                                        {result.status === 'passed' ? '✓' : 
                                         result.status === 'failed' ? '✕' : '○'}
                                    </td>
                                    <td style={{...componentStyles.tableCell, width: '100%'}}>
                                        {result.name}
                                    </td>
                                    <td style={componentStyles.tableCell}>
                                        {result.duration.toFixed(1)}s
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}; 