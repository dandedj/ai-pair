import * as React from 'react';
import { GenerationCycleDetails, Status, PhaseTimings } from 'ai-pair-types';

interface TimingDetailsProps {
    selectedCycle: GenerationCycleDetails;
    hideHeader?: boolean;
}

const formatDurationMs = (duration: number | undefined): string => {
    if (duration === undefined) return '-';
    return `${duration.toLocaleString()} ms`;
};

export const TimingDetails: React.FC<TimingDetailsProps> = ({ selectedCycle, hideHeader }) => {
    const timings = selectedCycle.timings;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {!hideHeader && <h4 style={{ marginBottom: '4px' }}>Timing Details</h4>}
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '4px' }}>
                <span style={{ opacity: 0.7 }}>Model:</span>
                <span>{selectedCycle.model || '-'}</span>
                
                {timings.phaseTimings.map((phase: PhaseTimings, index: number) => (
                    <React.Fragment key={index}>
                        <span style={{ opacity: 0.7 }}>{Status[phase.status]}:</span>
                        <span>{formatDurationMs(phase.endTime && phase.startTime ? phase.endTime - phase.startTime : undefined)}</span>
                    </React.Fragment>
                ))}

                <span style={{ opacity: 0.7, marginTop: '4px' }}>Total:</span>
                <span style={{ marginTop: '4px' }}>{formatDurationMs(timings.cycleEndTime && timings.cycleStartTime ? timings.cycleEndTime - timings.cycleStartTime : undefined)}</span>
            </div>
        </div>
    );
}; 