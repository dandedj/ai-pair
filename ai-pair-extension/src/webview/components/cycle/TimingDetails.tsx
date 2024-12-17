import * as React from 'react';
import { componentStyles } from '../../styles/components';
import { GenerationCycleDetails } from 'ai-pair/types';

interface TimingDetailsProps {
    selectedCycle: GenerationCycleDetails | null;
    hideHeader?: boolean;
}

export const TimingDetails: React.FC<TimingDetailsProps> = ({ selectedCycle, hideHeader }) => {
    const formatDuration = (start: number | null, end: number | null): string => {
        if (!start || !end) return '...';
        const duration = end - start;
        if (isNaN(duration)) return '...';
        return `${(duration / 1000).toFixed(1)}s`;
    };

    if (!selectedCycle) return null;

    const timings = selectedCycle.timings;

    return (
        <div>
            {!hideHeader && (
                <div style={componentStyles.panelHeader}>
                    <h3 style={componentStyles.panelTitle}>Timing Details</h3>
                </div>
            )}
            <div style={{ 
                display: 'flex',
                gap: '16px',
                fontSize: '11px',
                opacity: 0.8,
                padding: '8px'
            }}>
                <div>
                    <span style={{ marginRight: '4px', opacity: 0.7 }}>Initial Build:</span>
                    {formatDuration(timings.initialBuildStartTime, timings.initialBuildEndTime)}
                </div>
                <div>
                    <span style={{ marginRight: '4px', opacity: 0.7 }}>Initial Tests:</span>
                    {formatDuration(timings.initialTestStartTime, timings.initialTestEndTime)}
                </div>
                {(selectedCycle.wasForced || 
                  !selectedCycle.initialBuildState?.compiledSuccessfully || 
                  selectedCycle.initialTestResults?.failedTests.length > 0 || 
                  selectedCycle.initialTestResults?.erroredTests.length > 0) && (
                    <>
                        <div>
                            <span style={{ marginRight: '4px', opacity: 0.7 }}>Generation:</span>
                            {formatDuration(timings.codeGenerationStartTime, timings.codeGenerationEndTime)}
                        </div>
                        <div>
                            <span style={{ marginRight: '4px', opacity: 0.7 }}>Final Build:</span>
                            {formatDuration(timings.finalBuildStartTime, timings.finalBuildEndTime)}
                        </div>
                        <div>
                            <span style={{ marginRight: '4px', opacity: 0.7 }}>Final Tests:</span>
                            {formatDuration(timings.finalTestStartTime, timings.finalTestEndTime)}
                        </div>
                    </>
                )}
                <div>
                    <span style={{ marginRight: '4px', opacity: 0.7 }}>Total:</span>
                    {formatDuration(timings.cycleStartTime, timings.cycleEndTime || null)}
                </div>
            </div>
        </div>
    );
}; 