import * as React from 'react';
import { componentStyles } from '../styles/components';
import { GenerationCycleDetails } from '../../types/running-state';

interface TimingDetailsProps {
    selectedCycle: GenerationCycleDetails | null;
    hideHeader?: boolean;
}

export const TimingDetails: React.FC<TimingDetailsProps> = ({ selectedCycle, hideHeader }) => {
    const formatDuration = (start: number | null, end: number | null): string => {
        if (!start || !end) return '...';
        const duration = end - start;
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
                    <span style={{ marginRight: '4px', opacity: 0.7 }}>Build:</span>
                    {formatDuration(timings.compilationStartTime, timings.compilationEndTime)}
                </div>
                <div>
                    <span style={{ marginRight: '4px', opacity: 0.7 }}>Tests:</span>
                    {formatDuration(timings.testingStartTime, timings.testingEndTime)}
                </div>
                <div>
                    <span style={{ marginRight: '4px', opacity: 0.7 }}>Generation:</span>
                    {formatDuration(timings.codeGenerationStartTime, timings.codeGenerationEndTime)}
                </div>
                <div>
                    <span style={{ marginRight: '4px', opacity: 0.7 }}>Retesting:</span>
                    {formatDuration(timings.retestingStartTime, timings.retestingEndTime)}
                </div>
                <div>
                    <span style={{ marginRight: '4px', opacity: 0.7 }}>Total:</span>
                    {formatDuration(timings.cycleStartTime, timings.cycleEndTime || null)}
                </div>
            </div>
        </div>
    );
}; 