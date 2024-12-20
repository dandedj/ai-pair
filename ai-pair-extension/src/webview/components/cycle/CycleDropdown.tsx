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
    data?: string | null;
}

const getStepStates = (cycle: GenerationCycleDetails): StepState[] => {
    const shouldShowInitialState = !cycle.wasForced && 
        cycle.initialBuildState?.compiledSuccessfully && 
        cycle.initialTestResults?.failedTests.length === 0 && 
        cycle.initialTestResults?.erroredTests.length === 0;

    const steps: StepState[] = [
        // Initial Build
        {
            status: cycle.status === Status.BUILDING ? 'active' :
                cycle.initialBuildState 
                    ? (cycle.initialBuildState.compiledSuccessfully ? 'success' : 'error')
                    : 'pending',
            label: 'Build'
        },
        // Modified Initial Tests
        {
            status: cycle.status === Status.TESTING ? 'active' :
                !cycle.initialBuildState?.compiledSuccessfully 
                    ? 'skipped'
                    : cycle.initialTestResults
                        ? ((cycle.initialTestResults.failedTests.length === 0 && 
                           cycle.initialTestResults.erroredTests.length === 0 &&
                           cycle.initialTestResults.testsCompiledSuccessfully) 
                            ? 'success' 
                            : 'error')
                        : 'pending',
            label: 'Test',
            data: cycle.status === Status.TESTING 
                ? null  // Will trigger loading dots
                : cycle.initialTestResults 
                    ? `${cycle.initialTestResults.passedTests.length}/${getTotalTests(cycle, 'initial')}`
                    : undefined
        },
        // Code Generation
        {
            status: cycle.status === Status.GENERATING_CODE ? 'active' :
                shouldShowInitialState
                    ? 'skipped'
                    : cycle.codeChanges
                        ? 'success'
                        : 'pending',
            label: 'Generate',
            data: cycle.status === Status.GENERATING_CODE
                ? null  // Will trigger loading dots
                : cycle.codeChanges
                    ? `${(cycle.codeChanges.modifiedFiles?.length || 0) + 
                         (cycle.codeChanges.newFiles?.length || 0) + 
                         (cycle.codeChanges.deletedFiles?.length || 0)} changes`
                    : undefined
        },
        // Final Build
        {
            status: cycle.status === Status.REBUILDING ? 'active' :
                shouldShowInitialState
                    ? 'skipped'
                    : cycle.finalBuildState
                        ? (cycle.finalBuildState.compiledSuccessfully ? 'success' : 'error')
                        : 'pending',
            label: 'Rebuild'
        },
        // Modified Final Tests
        {
            status: cycle.status === Status.RETESTING ? 'active' :
                shouldShowInitialState || !cycle.finalBuildState?.compiledSuccessfully
                    ? 'skipped'
                    : cycle.finalTestResults
                        ? ((cycle.finalTestResults.failedTests.length === 0 && 
                           cycle.finalTestResults.erroredTests.length === 0 &&
                           cycle.finalTestResults.testsCompiledSuccessfully) 
                            ? 'success' 
                            : 'error')
                        : 'pending',
            label: 'Retest',
            data: cycle.finalTestResults
                ? `${cycle.finalTestResults.passedTests.length}/${getTotalTests(cycle, 'final')}`
                : undefined
        }
    ];

    return steps;
};

const getStatusColor = (status: StepState['status'], isCurrentStep: boolean): { text: string; background: string } => {
    if (!isCurrentStep) {
        return {
            text: 'var(--vscode-disabledForeground)',
            background: 'rgba(128, 128, 128, 0.05)'
        };
    }

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
                text: 'var(--vscode-editor-foreground)',
                background: 'rgba(255, 255, 255, 0.15)'
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
    
    const activeIndex = steps.findIndex(step => step.status === 'active');
    const currentStepIndex = activeIndex !== -1 ? activeIndex : 
        steps.reduce((lastCompleted, step, index) => 
            step.status === 'success' || step.status === 'error' ? index : lastCompleted, 
            -1
        );

    return (
        <tr
            className="cycle-dropdown-container"
            style={{
                width: '100%',
                margin: '0',
                padding: '0',
                boxSizing: 'border-box',
                cursor: 'pointer'
            }}
            onClick={onToggleExpand}
        >
            <td style={{ 
                ...componentStyles.tableCell, 
                width: '28px', 
                paddingRight: '4px'
            }}>
                <div style={{ 
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: complete ? 
                        (success ? 'var(--vscode-testing-iconPassed)' : 'var(--vscode-testing-iconFailed)') : 
                        'var(--vscode-badge-background)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    color: 'var(--vscode-badge-foreground)',
                    opacity: complete ? 0.2 : 1
                }}>
                    {cycle.cycleNumber}
                </div>
            </td>
            <td style={{ 
                ...componentStyles.tableCell, 
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px'
            }}>
                {steps.map((step, index) => {
                    const isCurrentStep = index <= currentStepIndex;
                    const colors = getStatusColor(step.status, isCurrentStep);
                    
                    return (
                        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '2px', height: '20px' }}>
                            {index > 0 && (
                                <span 
                                    className="codicon codicon-chevron-right"
                                    style={{ 
                                        color: 'var(--vscode-disabledForeground)',
                                        transform: 'scale(0.7)',
                                        opacity: isCurrentStep ? 0.8 : 0.3,
                                        margin: '0 -1px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                />
                            )}
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center',
                                opacity: step.status === 'skipped' ? 0.5 : 1,
                                height: '20px'
                            }}>
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '3px',
                                    background: colors.background,
                                    padding: '1px 6px',
                                    borderRadius: '10px',
                                    fontSize: '11px',
                                    height: '18px'
                                }}>
                                    <span style={{ 
                                        color: colors.text,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        lineHeight: '18px'
                                    }}>
                                        {step.label}
                                        {step.data !== undefined ? (
                                            step.data === null ? (
                                                <LoadingDots />
                                            ) : (
                                                <span style={{ 
                                                    fontSize: '10px',
                                                    opacity: 0.8,
                                                    lineHeight: '18px'
                                                }}>
                                                    ({step.data})
                                                </span>
                                            )
                                        ) : null}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </td>
            <td style={{ 
                ...componentStyles.tableCell, 
                width: '16px', 
                textAlign: 'right', 
                paddingLeft: '4px'
            }}>
                <span 
                    className={`codicon codicon-chevron-${isExpanded ? 'up' : 'down'}`}
                    style={{ cursor: 'pointer' }}
                />
            </td>
        </tr>
    );
}; 