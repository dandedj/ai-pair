import * as React from 'react';
import { componentStyles } from '../styles/components';
import { GenerationCycleDetails } from 'ai-pair';
import { getVSCodeAPI } from '../vscodeApi';
import { TestResults } from './TestResults';
import { CodeChanges } from './CodeChanges';
import { TimingDetails } from './TimingDetails';

declare const vscode: any;

interface CycleDetailsProps {
    cycles: GenerationCycleDetails[];
    selectedCycle: GenerationCycleDetails | null;
    onCycleSelect: (cycle: GenerationCycleDetails) => void;
}

const LoadingDots: React.FC = () => {
    const dotStyle = (delay: string): React.CSSProperties => ({
        display: 'inline-block',
        width: '4px',
        height: '4px',
        margin: '0 2px',
        backgroundColor: 'var(--vscode-foreground)',
        borderRadius: '50%',
        opacity: 0.4,
        animation: 'pulse 1.4s infinite ease-in-out',
        animationDelay: delay
    });

    const keyframes = `
        @keyframes pulse {
            0%, 80%, 100% { opacity: 0.4; }
            40% { opacity: 1; }
        }
    `;

    return (
        <>
            <style>{keyframes}</style>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                <div style={dotStyle('0s')} />
                <div style={dotStyle('0.2s')} />
                <div style={dotStyle('0.4s')} />
            </div>
        </>
    );
};

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
    <div style={{
        padding: '4px 8px',
        backgroundColor: 'var(--vscode-sideBarSectionHeader-background)',
        color: 'var(--vscode-sideBarTitle-foreground)',
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
        borderBottom: '1px solid var(--vscode-panel-border)'
    }}>
        {title}
    </div>
);

const DetailBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div style={{
        backgroundColor: '#1e1e1e',
        border: '1px solid var(--vscode-panel-border)',
        borderRadius: '4px',
        overflow: 'hidden'
    }}>
        {children}
    </div>
);

const DetailSection: React.FC<{ 
    title: string; 
    children: React.ReactNode;
    headerActions?: React.ReactNode;
}> = ({ title, children, headerActions }) => (
    <div>
        <div style={{
            padding: '4px 8px',
            backgroundColor: '#2D2D2D',
            borderBottom: '1px solid var(--vscode-panel-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
        }}>
            <span style={{ 
                fontSize: '11px',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                color: 'white'
            }}>{title}</span>
            {headerActions}
        </div>
        <div style={{ padding: '8px' }}>
            {children}
        </div>
    </div>
);

const ViewLogsLink: React.FC<{ onClick: () => void, label: string }> = ({ onClick, label }) => (
    <span
        style={{
            cursor: 'pointer',
            color: 'var(--vscode-textLink-foreground)',
            textDecoration: 'none',
            fontSize: '11px'
        }}
        onClick={onClick}
    >
        {label}
    </span>
);

const SectionRow: React.FC<{ 
    title: string; 
    children: React.ReactNode;
    onViewLogs?: () => void;
    success?: boolean;
    loading?: boolean;
}> = ({ title, children, onViewLogs, success, loading }) => (
    <div>
        <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '8px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {!loading && success !== undefined && (
                    <span className={`codicon codicon-${success ? 'pass-filled' : 'error'}`} 
                          style={{ color: success ? 'var(--vscode-testing-iconPassed)' : 'var(--vscode-testing-iconFailed)' }}
                    />
                )}
                <h4 style={{ fontSize: '12px', margin: 0 }}>{title}</h4>
            </div>
            {onViewLogs && !loading && (
                <ViewLogsLink onClick={onViewLogs} label="View Logs" />
            )}
        </div>
        {loading ? <LoadingDots /> : children}
    </div>
);

export const CycleDetails: React.FC<CycleDetailsProps> = ({
    cycles,
    selectedCycle,
    onCycleSelect
}) => {
    const [expandedCycles, setExpandedCycles] = React.useState<Set<number>>(new Set());

    const toggleExpand = (cycleNumber: number) => {
        const newExpanded = new Set(expandedCycles);
        if (newExpanded.has(cycleNumber)) {
            newExpanded.delete(cycleNumber);
        } else {
            newExpanded.add(cycleNumber);
        }
        setExpandedCycles(newExpanded);
    };

    const isSuccessful = (cycle: GenerationCycleDetails) => {
        if (!cycle.timings?.cycleEndTime) return null; // Still in progress
        
        // Success if initial tests passed and not forced
        if (!cycle.wasForced && 
            cycle.initialBuildState?.compiledSuccessfully && 
            cycle.initialTestResults?.failedTests.length === 0 && 
            cycle.initialTestResults?.erroredTests.length === 0) {
            return true;
        }

        // Or if final tests passed
        return cycle.finalBuildState?.compiledSuccessfully && 
               cycle.finalTestResults?.failedTests.length === 0 &&
               cycle.finalTestResults?.erroredTests.length === 0;
    };

    const getTotalTests = (cycle: GenerationCycleDetails) => {
        // Use initial results if cycle wasn't forced and initial tests passed
        if (!cycle.wasForced && 
            cycle.initialBuildState?.compiledSuccessfully && 
            cycle.initialTestResults?.failedTests.length === 0 && 
            cycle.initialTestResults?.erroredTests.length === 0) {
            const initial = cycle.initialTestResults;
            return (initial?.passedTests.length || 0) + 
                   (initial?.failedTests.length || 0) + 
                   (initial?.erroredTests.length || 0);
        }
        // Otherwise use final results
        const final = cycle.finalTestResults;
        return (final?.passedTests.length || 0) + 
               (final?.failedTests.length || 0) + 
               (final?.erroredTests.length || 0);
    };

    const formatDuration = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        return `${seconds}s`;
    };

    const getCycleDuration = (cycle: GenerationCycleDetails) => {
        if (!cycle.timings?.cycleStartTime || !cycle.timings?.cycleEndTime) return 0;
        return new Date(cycle.timings.cycleEndTime).getTime() - 
               new Date(cycle.timings.cycleStartTime).getTime();
    };

    const isCycleComplete = (cycle: GenerationCycleDetails) => {
        return !!cycle.timings?.cycleEndTime;
    };

    const isBuildComplete = (cycle: GenerationCycleDetails) => {
        if (!cycle.wasForced && 
            cycle.initialBuildState?.compiledSuccessfully && 
            cycle.initialTestResults?.failedTests.length === 0 && 
            cycle.initialTestResults?.erroredTests.length === 0) {
            return !!cycle.initialBuildState;
        }
        return !!cycle.finalBuildState;
    };

    const areTestsComplete = (cycle: GenerationCycleDetails) => {
        if (!cycle.wasForced && 
            cycle.initialBuildState?.compiledSuccessfully && 
            cycle.initialTestResults?.failedTests.length === 0 && 
            cycle.initialTestResults?.erroredTests.length === 0) {
            return !!cycle.initialTestResults;
        }
        return !!cycle.finalTestResults;
    };

    // Get vscode API using React.useMemo to ensure it's only created once
    const vscodeApi = React.useMemo(() => {
        const api = getVSCodeAPI();
        console.log('VS Code API instance:', api ? 'available' : 'not available');
        return api;
    }, []);

    React.useEffect(() => {
        if (!vscodeApi) {
            console.error('VS Code API not available in CycleDetails component');
        }
    }, [vscodeApi]);

    return (
        <div style={componentStyles.panel}>
            <div style={componentStyles.panelHeader}>
                <h3 style={componentStyles.panelTitle}>Generation Cycles</h3>
                <span style={componentStyles.badge}>{cycles.length}</span>
            </div>
            <div style={{ ...componentStyles.tableContainer, width: '100%' }}>
                <table style={{ ...componentStyles.table, width: '100%', tableLayout: 'fixed' }}>
                    <tbody>
                        {cycles.map((cycle) => {
                            const success = isSuccessful(cycle);
                            const complete = isCycleComplete(cycle);
                            return (
                                <React.Fragment key={cycle.cycleNumber}>
                                    <tr 
                                        style={{
                                            ...componentStyles.tableRow,
                                            backgroundColor: complete ? 
                                                (success ? 'rgba(51, 153, 51, 0.1)' : 'rgba(204, 51, 51, 0.1)') :
                                                undefined,
                                            cursor: 'pointer',
                                            width: '100%'
                                        }}
                                        onClick={() => toggleExpand(cycle.cycleNumber)}
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
                                            {isBuildComplete(cycle) ? (
                                                <>
                                                    <span className={`codicon codicon-${
                                                        (!cycle.wasForced && 
                                                         cycle.initialBuildState?.compiledSuccessfully && 
                                                         cycle.initialTestResults?.failedTests.length === 0 && 
                                                         cycle.initialTestResults?.erroredTests.length === 0)
                                                            ? cycle.initialBuildState?.compiledSuccessfully
                                                            : cycle.finalBuildState?.compiledSuccessfully 
                                                            ? 'check' 
                                                            : 'x'}`} 
                                                          style={{ color: ((!cycle.wasForced && 
                                                                          cycle.initialBuildState?.compiledSuccessfully && 
                                                                          cycle.initialTestResults?.failedTests.length === 0 && 
                                                                          cycle.initialTestResults?.erroredTests.length === 0)
                                                                            ? cycle.initialBuildState?.compiledSuccessfully
                                                                            : cycle.finalBuildState?.compiledSuccessfully)
                                                                    ? 'var(--vscode-testing-iconPassed)' 
                                                                    : 'var(--vscode-testing-iconFailed)' }}
                                                    />
                                                    <span>build</span>
                                                </>
                                            ) : (
                                                <>
                                                    <LoadingDots />
                                                    <span>build</span>
                                                </>
                                            )}
                                        </td>
                                        <td style={componentStyles.tableCell}>
                                            {areTestsComplete(cycle) ? (
                                                `${(!cycle.wasForced && 
                                                    cycle.initialBuildState?.compiledSuccessfully && 
                                                    cycle.initialTestResults?.failedTests.length === 0 && 
                                                    cycle.initialTestResults?.erroredTests.length === 0)
                                                        ? cycle.initialTestResults?.passedTests.length
                                                        : cycle.finalTestResults?.passedTests.length || 0}/${getTotalTests(cycle)} tests`
                                            ) : (
                                                <LoadingDots />
                                            )}
                                        </td>
                                        <td style={componentStyles.tableCell}>
                                            {complete ? formatDuration(getCycleDuration(cycle)) : <LoadingDots />}
                                        </td>
                                        <td style={{ ...componentStyles.tableCell, width: '20px', textAlign: 'right' }}>
                                            <span className={`codicon codicon-chevron-${expandedCycles.has(cycle.cycleNumber) ? 'up' : 'down'}`} />
                                        </td>
                                    </tr>
                                    {expandedCycles.has(cycle.cycleNumber) && (
                                        <tr>
                                            <td colSpan={6} style={{ padding: '0', width: '100%' }}>
                                                <DetailBox>
                                                    <DetailSection title="Initial State">
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                            <SectionRow 
                                                                title="Build Status" 
                                                                success={cycle.initialBuildState?.compiledSuccessfully}
                                                                loading={!cycle.initialBuildState}
                                                                onViewLogs={() => {
                                                                    vscode?.postMessage({
                                                                        type: 'viewCompilationLog',
                                                                        cycleNumber: cycle.cycleNumber,
                                                                        isFinal: false
                                                                    });
                                                                }}
                                                            >
                                                                <></>
                                                            </SectionRow>
                                                            <SectionRow 
                                                                title="Test Results" 
                                                                success={cycle.initialTestResults?.failedTests.length === 0 && cycle.initialTestResults?.erroredTests.length === 0}
                                                                onViewLogs={() => {
                                                                    vscode?.postMessage({
                                                                        type: 'viewTestLog',
                                                                        cycleNumber: cycle.cycleNumber,
                                                                        isFinal: false
                                                                    });
                                                                }}
                                                            >
                                                                <TestResults
                                                                    passedTests={cycle.initialTestResults?.passedTests || []}
                                                                    failedTests={cycle.initialTestResults?.failedTests || []}
                                                                    erroredTests={cycle.initialTestResults?.erroredTests || []}
                                                                    isLoading={false}
                                                                    hideHeader
                                                                />
                                                            </SectionRow>
                                                        </div>
                                                    </DetailSection>

                                                    {(!cycle.initialBuildState?.compiledSuccessfully || 
                                                      cycle.initialTestResults?.failedTests.length > 0 || 
                                                      cycle.initialTestResults?.erroredTests.length > 0 || 
                                                      cycle.wasForced) && (
                                                        <>
                                                            <DetailSection 
                                                                title="Changes"
                                                                headerActions={
                                                                    <div style={{ display: 'flex', gap: '16px' }}>
                                                                        <ViewLogsLink 
                                                                            label="Request"
                                                                            onClick={() => {
                                                                                console.log('Clicking request log for cycle:', cycle.cycleNumber);
                                                                                if (!vscodeApi) {
                                                                                    console.error('VS Code API not available for request log');
                                                                                    return;
                                                                                }
                                                                                const message = {
                                                                                    command: 'viewGenerationLog',
                                                                                    type: 'viewGenerationLog',
                                                                                    cycleNumber: cycle.cycleNumber,
                                                                                    logType: 'request'
                                                                                };
                                                                                console.log('Sending message:', message);
                                                                                try {
                                                                                    vscodeApi.postMessage(message);
                                                                                    console.log('Message sent successfully');
                                                                                } catch (error) {
                                                                                    console.error('Failed to send message:', error);
                                                                                }
                                                                            }} 
                                                                        />
                                                                        <ViewLogsLink 
                                                                            label="Response"
                                                                            onClick={() => {
                                                                                console.log('Clicking response log for cycle:', cycle.cycleNumber);
                                                                                if (!vscodeApi) {
                                                                                    console.error('VS Code API not available for response log');
                                                                                    return;
                                                                                }
                                                                                const message = {
                                                                                    command: 'viewGenerationLog',
                                                                                    type: 'viewGenerationLog',
                                                                                    cycleNumber: cycle.cycleNumber,
                                                                                    logType: 'response'
                                                                                };
                                                                                console.log('Sending message:', message);
                                                                                try {
                                                                                    vscodeApi.postMessage(message);
                                                                                    console.log('Message sent successfully');
                                                                                } catch (error) {
                                                                                    console.error('Failed to send message:', error);
                                                                                }
                                                                            }} 
                                                                        />
                                                                    </div>
                                                                }
                                                            >
                                                                <CodeChanges
                                                                    changes={[
                                                                        ...(cycle.codeChanges?.modifiedFiles || []).map(file => ({
                                                                            filePath: file,
                                                                            changeType: 'modify' as const,
                                                                        })),
                                                                        ...(cycle.codeChanges?.newFiles || []).map(file => ({
                                                                            filePath: file,
                                                                            changeType: 'add' as const,
                                                                        }))
                                                                    ]}
                                                                    cycleNumber={cycle.cycleNumber}
                                                                    hideHeader
                                                                />
                                                            </DetailSection>

                                                            <DetailSection title="Final State">
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                                    <SectionRow 
                                                                        title="Build Status"
                                                                        success={cycle.finalBuildState?.compiledSuccessfully}
                                                                        loading={!cycle.finalBuildState}
                                                                        onViewLogs={() => {
                                                                            vscodeApi?.postMessage({
                                                                                type: 'viewCompilationLog',
                                                                                cycleNumber: cycle.cycleNumber,
                                                                                isFinal: true
                                                                            });
                                                                        }}
                                                                    >
                                                                        <></>
                                                                    </SectionRow>
                                                                    <SectionRow 
                                                                        title="Test Results"
                                                                        success={cycle.finalTestResults?.failedTests.length === 0 && cycle.finalTestResults?.erroredTests.length === 0}
                                                                        onViewLogs={() => {
                                                                            vscode?.postMessage({
                                                                                type: 'viewTestLog',
                                                                                cycleNumber: cycle.cycleNumber,
                                                                                isFinal: true
                                                                            });
                                                                        }}
                                                                    >
                                                                        <TestResults
                                                                            passedTests={cycle.finalTestResults?.passedTests || []}
                                                                            failedTests={cycle.finalTestResults?.failedTests || []}
                                                                            erroredTests={cycle.finalTestResults?.erroredTests || []}
                                                                            isLoading={false}
                                                                            hideHeader
                                                                        />
                                                                    </SectionRow>
                                                                </div>
                                                            </DetailSection>
                                                        </>
                                                    )}

                                                    <DetailSection title="Timing Details">
                                                        <TimingDetails 
                                                            selectedCycle={cycle}
                                                            hideHeader
                                                        />
                                                    </DetailSection>
                                                </DetailBox>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
