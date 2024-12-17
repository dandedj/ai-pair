import * as React from 'react';
import { GenerationCycleDetails, Status } from 'ai-pair/types';
import { componentStyles } from '../../styles/components';
import { LoadingDots } from '../common/LoadingDots';
import {
    isSuccessful,
    isCycleComplete,
    isInitialBuildComplete,
    isFinalBuildComplete,
    isCurrentSection,
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

export const CycleDropdown: React.FC<CycleDropdownProps> = ({
    cycle,
    isExpanded,
    onToggleExpand
}) => {
    const success = isSuccessful(cycle);
    const complete = isCycleComplete(cycle);

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
            <td style={componentStyles.tableCell}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>
                        Cycle {cycle.cycleNumber}
                        {cycle.model && (
                            <span style={{
                                opacity: 0.7,
                                marginLeft: '6px',
                            }}>
                                ({cycle.model})
                            </span>
                        )}
                    </span>
                </div>
            </td>
            <td style={{ ...componentStyles.tableCell, display: 'flex', alignItems: 'center', gap: '4px' }}>
                {(!cycle.wasForced &&
                    cycle.initialBuildState?.compiledSuccessfully &&
                    cycle.initialTestResults?.failedTests.length === 0 &&
                    cycle.initialTestResults?.erroredTests.length === 0) ? (
                    isInitialBuildComplete(cycle) ? (
                        <>
                            <span className={`codicon codicon-${cycle.initialBuildState?.compiledSuccessfully ? 'check' : 'x'}`}
                                style={{
                                    color: cycle.initialBuildState?.compiledSuccessfully
                                        ? 'var(--vscode-testing-iconPassed)'
                                        : 'var(--vscode-testing-iconFailed)'
                                }}
                            />
                            <span>build</span>
                        </>
                    ) : (
                        <>
                            <LoadingDots />
                            <span>build</span>
                        </>
                    )
                ) : (
                    isFinalBuildComplete(cycle) ? (
                        <>
                            <span className={`codicon codicon-${cycle.finalBuildState?.compiledSuccessfully ? 'check' : 'x'}`}
                                style={{
                                    color: cycle.finalBuildState?.compiledSuccessfully
                                        ? 'var(--vscode-testing-iconPassed)'
                                        : 'var(--vscode-testing-iconFailed)'
                                }}
                            />
                            <span>build</span>
                        </>
                    ) : (
                        <>
                            <LoadingDots />
                            <span>build</span>
                        </>
                    )
                )}
            </td>
            <td style={componentStyles.tableCell}>
                {(!cycle.wasForced &&
                    cycle.initialBuildState?.compiledSuccessfully &&
                    cycle.initialTestResults?.failedTests.length === 0 &&
                    cycle.initialTestResults?.erroredTests.length === 0) ? (
                    isCurrentSection(cycle, Status.TESTING) ? (
                        <LoadingDots />
                    ) : (
                        areInitialTestsComplete(cycle) ? (
                            `${cycle.initialTestResults?.passedTests.length || 0}/${getTotalTests(cycle, 'initial')} tests`
                        ) : (
                            <LoadingDots />
                        )
                    )
                ) : (
                    isCurrentSection(cycle, Status.RETESTING) ? (
                        <LoadingDots />
                    ) : (
                        areFinalTestsComplete(cycle) ? (
                            `${cycle.finalTestResults?.passedTests.length || 0}/${getTotalTests(cycle, 'final')} tests`
                        ) : (
                            <LoadingDots />
                        )
                    )
                )}
            </td>
            <td style={componentStyles.tableCell}>
                {complete ? formatDuration(getCycleDuration(cycle)) : <LoadingDots />}
            </td>
            <td style={{ ...componentStyles.tableCell, width: '20px', textAlign: 'right' }}>
                <span className={`codicon codicon-chevron-${isExpanded ? 'up' : 'down'}`} />
            </td>
        </tr>
    );
}; 