import * as React from 'react';
import { GenerationCycleDetails, Status } from 'ai-pair-types';
import { DetailBox } from './DetailBox';
import { DetailSection } from './DetailSection';
import { BuildState } from './BuildState';
import { TestResults } from './TestResults';
import { CodeChanges } from './CodeChanges';
import { TimingDetails } from './TimingDetails';
import { ViewLogsLink } from '../common/ViewLogsLink';
import { LoadingDots } from '../common/LoadingDots';
import { getVSCodeAPI } from '../../vscodeApi';
import { CycleTimings } from 'ai-pair-types';
import { shouldShowInitialTests, shouldShowValidation, shouldShowGeneratingCode } from './helper/CycleHelper';

interface CycleDetailProps {
    cycle: GenerationCycleDetails;
}

const getBuildDuration = (timings: CycleTimings, status: Status): number | undefined => {
    const phase = timings.phaseTimings.find(p => p.status === status);
    return phase?.startTime && phase?.endTime ? phase.endTime - phase.startTime : undefined;
};

export const CycleDetail: React.FC<CycleDetailProps> = ({ cycle }) => {
    const vscodeApi = React.useMemo(() => getVSCodeAPI(), []);

    return (
        <div
            className="cycle-detail-container"
            style={{
                width: '100%',
                overflowX: 'hidden',
                margin: '0',
                boxSizing: 'border-box'
            }}
        >
            <DetailSection title="Checking for problems" style={{ width: '100%' }}>
                <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: cycle.initialBuildState?.compiledSuccessfully && cycle.status !== Status.BUILDING ? '12px' : '0', 
                    width: '100%' 
                }}>
                    <BuildState
                        isCompiled={cycle.initialBuildState?.compiledSuccessfully || false}
                        isLoading={cycle.status === Status.BUILDING}
                        buildDuration={getBuildDuration(cycle.timings, Status.BUILDING)}
                        cycleNumber={cycle.cycleNumber}
                        isFinal={false}
                    />
                    {shouldShowInitialTests(cycle) && (
                        <TestResults
                            passedTests={cycle.initialTestResults?.passedTests || []}
                            failedTests={cycle.initialTestResults?.failedTests || []}
                            erroredTests={cycle.initialTestResults?.erroredTests || []}
                            isLoading={cycle.status === Status.TESTING}
                            cycleNumber={cycle.cycleNumber}
                            isFinal={false}
                            testsCompiledSuccessfully={cycle.initialTestResults?.testsCompiledSuccessfully ?? true}
                        />
                    )}
                </div>
            </DetailSection>

            {shouldShowGeneratingCode(cycle) && (
                <DetailSection 
                    title="Generating fixes"
                    headerActions={
                        <div style={{ display: 'flex', gap: '16px' }}>
                            {cycle.timings.phaseTimings.some(p => 
                                p.status === Status.GENERATING_CODE && p.endTime !== undefined
                            ) && (
                                <ViewLogsLink 
                                    label="Request"
                                    logType="generation"
                                    cycleNumber={cycle.cycleNumber}
                                    stage="request"
                                />
                            )}
                            {cycle.timings.phaseTimings.some(p => 
                                p.status === Status.GENERATING_CODE && p.endTime !== undefined
                            ) && cycle.codeChanges && (
                                <ViewLogsLink 
                                    label="Response"
                                    logType="generation"
                                    cycleNumber={cycle.cycleNumber}
                                    stage="response"
                                />
                            )}
                        </div>
                    }
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {cycle.status === Status.GENERATING_CODE || cycle.status === Status.APPLYING_CHANGES ? (
                            <LoadingDots label="Generating" />
                        ) : (
                            <CodeChanges
                                changes={[
                                    ...(cycle.codeChanges?.modifiedFiles || []).map((file: string) => ({
                                        filePath: file,
                                        changeType: 'modify' as const,
                                    })),
                                    ...(cycle.codeChanges?.newFiles || []).map((file: string) => ({
                                        filePath: file,
                                        changeType: 'add' as const,
                                    })),
                                    ...(cycle.codeChanges?.deletedFiles || []).map((file: string) => ({
                                        filePath: file,
                                        changeType: 'delete' as const,
                                    })),
                                    ...(cycle.codeChanges?.testFiles || []).map((file: string) => ({
                                        filePath: file,
                                        changeType: 'test' as const,
                                    }))
                                ]}
                                onViewDiff={(filePath) => {
                                    vscodeApi?.postMessage({
                                        type: 'viewDiff',
                                        cycleNumber: cycle.cycleNumber,
                                        filePath
                                    });
                                }}
                            />
                        )}
                    </div>
                </DetailSection>
            )}

            {shouldShowValidation(cycle) && (
                <DetailSection title="Validating">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <BuildState
                            isCompiled={cycle.finalBuildState?.compiledSuccessfully || false}
                            isLoading={cycle.status === Status.REBUILDING}
                            buildDuration={getBuildDuration(cycle.timings, Status.REBUILDING)}
                            cycleNumber={cycle.cycleNumber}
                            isFinal={true}
                        />
                        {cycle.finalBuildState?.compiledSuccessfully && (
                            <TestResults
                                passedTests={cycle.finalTestResults?.passedTests || []}
                                failedTests={cycle.finalTestResults?.failedTests || []}
                                erroredTests={cycle.finalTestResults?.erroredTests || []}
                                isLoading={cycle.status === Status.RETESTING}
                                cycleNumber={cycle.cycleNumber}
                                isFinal={true}
                                testsCompiledSuccessfully={cycle.finalTestResults?.testsCompiledSuccessfully ?? true}
                            />
                        )}
                    </div>
                </DetailSection>
            )}

            {cycle.status === Status.COMPLETED && (
                <DetailSection title="Timing Details">
                    <TimingDetails selectedCycle={cycle} hideHeader />
                </DetailSection>
            )}
        </div>
    );
}; 