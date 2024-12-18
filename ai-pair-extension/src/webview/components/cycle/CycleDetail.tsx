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

interface CycleDetailProps {
    cycle: GenerationCycleDetails;
}

interface FileChange {
    filePath: string;
    changeType: 'add' | 'modify' | 'delete';
}

export const CycleDetail: React.FC<CycleDetailProps> = ({ cycle }) => {
    const vscodeApi = React.useMemo(() => getVSCodeAPI(), []);

    return (
        <DetailBox>
            <DetailSection title="Checking for problems" style={{ width: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                    <BuildState
                        isCompiled={cycle.initialBuildState?.compiledSuccessfully || false}
                        isLoading={cycle.status === Status.BUILDING}
                        buildDuration={cycle.timings?.initialBuildStartTime && cycle.timings?.initialBuildEndTime ? 
                            new Date(cycle.timings.initialBuildEndTime).getTime() - new Date(cycle.timings.initialBuildStartTime).getTime() : 
                            undefined}
                        cycleNumber={cycle.cycleNumber}
                        isFinal={false}
                    />
                    {cycle.initialBuildState?.compiledSuccessfully && (
                        <TestResults
                            passedTests={cycle.initialTestResults?.passedTests || []}
                            failedTests={cycle.initialTestResults?.failedTests || []}
                            erroredTests={cycle.initialTestResults?.erroredTests || []}
                            isLoading={cycle.status === Status.TESTING}
                            cycleNumber={cycle.cycleNumber}
                            isFinal={false}
                        />
                    )}
                </div>
            </DetailSection>

            {cycle.status >= Status.GENERATING_CODE && (
                <DetailSection 
                    title="Generating fixes"
                    headerActions={
                        <div style={{ display: 'flex', gap: '16px' }}>
                            <ViewLogsLink 
                                label="Request"
                                logType="generation"
                                cycleNumber={cycle.cycleNumber}
                                stage="initial"
                            />
                            <ViewLogsLink 
                                label="Response"
                                logType="generation"
                                cycleNumber={cycle.cycleNumber}
                                stage="response"
                            />
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

            {cycle.status >= Status.REBUILDING && (
                <DetailSection title="Validating">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <BuildState
                            isCompiled={cycle.finalBuildState?.compiledSuccessfully || false}
                            isLoading={cycle.status === Status.REBUILDING}
                            buildDuration={cycle.timings?.finalBuildStartTime && cycle.timings?.finalBuildEndTime ? 
                                new Date(cycle.timings.finalBuildEndTime).getTime() - new Date(cycle.timings.finalBuildStartTime).getTime() : 
                                undefined}
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
        </DetailBox>
    );
}; 