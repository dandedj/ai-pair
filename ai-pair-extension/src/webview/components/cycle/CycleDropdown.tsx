import * as React from 'react';
import { GenerationCycleDetails, Status } from 'ai-pair-types';
import { componentStyles } from '../../styles/components';
import { LoadingDots } from '../common/LoadingDots';
import {
    isSuccessful,
    isCycleComplete,
    isInitialBuildComplete,
    isFinalBuildComplete,
    areInitialTestsComplete,
    areFinalTestsComplete,
    getTotalTests,
    formatDuration,
    getCycleDuration
} from './helper/CycleHelper';

interface CycleDropdownProps {
    cycle: GenerationCycleDetails;
    isExpanded: boolean;
    onToggleExpand: () => void;
}

interface StepState {
    status: 'pending' | 'active' | 'success' | 'error' | 'skipped';
    label: string;
    data?: string;
}

const getStepStates = (cycle: GenerationCycleDetails): StepState[] => {
    const shouldShowInitialState = !cycle.wasForced && 
        cycle.initialBuildState?.compiledSuccessfully && 
        cycle.initialTestResults?.failedTests.length === 0 && 
        cycle.initialTestResults?.erroredTests.length === 0;

    const steps: StepState[] = [
        // Initial Build
        {
            status: cycle.initialBuildState 
                ? (cycle.initialBuildState.compiledSuccessfully ? 'success' : 'error')
                : cycle.status === Status.BUILDING ? 'active' : 'pending',
            label: 'Build'
        },
        // Initial Tests
        {
            status: !cycle.initialBuildState?.compiledSuccessfully 
                ? 'skipped'
                : cycle.initialTestResults
                    ? (cycle.initialTestResults.failedTests.length === 0 && cycle.initialTestResults.erroredTests.length === 0 ? 'success' : 'error')
                    : cycle.status === Status.TESTING ? 'active' : 'pending',
            label: 'Test',
            data: cycle.initialTestResults 
                ? `${cycle.initialTestResults.passedTests.length}/${getTotalTests(cycle, 'initial')}`
                : undefined
        },
        // Code Generation
        {
            status: shouldShowInitialState
                ? 'skipped'
                : cycle.codeChanges
                    ? 'success'
                    : cycle.status === Status.GENERATING_CODE ? 'active' : 'pending',
            label: 'Generate',
            data: cycle.codeChanges
                ? `${(cycle.codeChanges.modifiedFiles?.length || 0) + 
                     (cycle.codeChanges.newFiles?.length || 0) + 
                     (cycle.codeChanges.deletedFiles?.length || 0)} changes`
                : undefined
        },
        // Final Build
        {
            status: shouldShowInitialState
                ? 'skipped'
                : cycle.finalBuildState
                    ? (cycle.finalBuildState.compiledSuccessfully ? 'success' : 'error')
                    : cycle.status === Status.REBUILDING ? 'active' : 'pending',
            label: 'Rebuild'
        },
        // Final Tests
        {
            status: shouldShowInitialState || !cycle.finalBuildState?.compiledSuccessfully
                ? 'skipped'
                : cycle.finalTestResults
                    ? (cycle.finalTestResults.failedTests.length === 0 && cycle.finalTestResults.erroredTests.length === 0 ? 'success' : 'error')
                    : cycle.status === Status.RETESTING ? 'active' : 'pending',
            label: 'Retest',
            data: cycle.finalTestResults
                ? `${cycle.finalTestResults.passedTests.length}/${getTotalTests(cycle, 'final')}`
                : undefined
        }
    ];

    return steps;
};

const getStatusColor = (status: StepState['status']): { text: string; background: string } => {
    switch (status) {
        case 'success':
            return {
                text: 'var(--vscode-testing-iconPassed)',
                background: 'rgba(51, 153, 51, 0.1)'
            };
        case 'error':
            return {
                text: 'var(--vscode-testing-iconFailed)',
                background: 'rgba(204, 51, 51, 0.1)'
            };
        case 'active':
            return {
                text: 'var(--vscode-foreground)',
                background: 'rgba(255, 255, 255, 0.1)'
            };
        case 'skipped':
        case 'pending':
        default:
            return {
                text: 'var(--vscode-disabledForeground)',
                background: 'rgba(128, 128, 128, 0.1)'
            };
    }
};

export const CycleDropdown: React.FC<CycleDropdownProps> = ({
    cycle,
    isExpanded,
    onToggleExpand
}) => {
    const success = isSuccessful(cycle);
    const complete = isCycleComplete(cycle);
    const steps = getStepStates(cycle);

    return (
        <tr
            style={{
                ...componentStyles.tableRow,
                backgroundColor: complete ?
                    (success ? 'rgba(51, 153, 51, 0.1)' : 'rgba(204, 51, 51, 0.1)') :
                    undefined,
                cursor: 'pointer',
                width: '100%'
            }}
            onClick={onToggleExpand}
        >
            <td style={{ ...componentStyles.tableCell, width: '20px' }}>
                {complete ? (
                    <span className={`codicon codicon-${success ? 'pass-filled' : 'error'}`}
                        style={{ color: success ? 'var(--vscode-testing-iconPassed)' : 'var(--vscode-testing-iconFailed)' }}
                    />
                ) : (
                    <LoadingDots />
                )}
            </td>
            <td style={{ ...componentStyles.tableCell, width: '40px' }}>
                <div style={{ 
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--vscode-badge-background)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    color: 'var(--vscode-badge-foreground)',
                }}>
                    {cycle.cycleNumber}
                </div>
            </td>
            <td style={{ ...componentStyles.tableCell, width: '80px', opacity: 0.7 }}>
                {cycle.model || '-'}
            </td>
            <td style={{ ...componentStyles.tableCell, display: 'flex', alignItems: 'center', gap: '8px' }}>
                {steps.map((step, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {index > 0 && (
                            <span 
                                className="codicon codicon-chevron-right"
                                style={{ 
                                    color: 'var(--vscode-disabledForeground)',
                                    transform: 'scale(0.8)',
                                    opacity: step.status === 'skipped' ? 0.5 : 0.8
                                }}
                            />
                        )}
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center',
                            opacity: step.status === 'skipped' ? 0.5 : 1
                        }}>
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '4px',
                                background: getStatusColor(step.status).background,
                                padding: '2px 8px',
                                borderRadius: '12px',
                            }}>
                                {step.status === 'active' ? (
                                    <LoadingDots />
                                ) : null}
                                <span style={{ 
                                    fontSize: '12px',
                                    color: getStatusColor(step.status).text,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                    {step.label}
                                    {step.data && (
                                        <span style={{ 
                                            fontSize: '10px',
                                            opacity: 0.8
                                        }}>
                                            ({step.data})
                                        </span>
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </td>
            <td style={{ ...componentStyles.tableCell, width: '20px', textAlign: 'right' }}>
                <span className={`codicon codicon-chevron-${isExpanded ? 'up' : 'down'}`} />
            </td>
        </tr>
    );
}; 