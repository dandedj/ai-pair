import { GenerationCycleDetails } from 'ai-pair-types';
import * as React from 'react';
import { componentStyles } from '../../styles/components';
import { CycleDropdown } from './CycleDropdown';
import { CycleDetail } from './CycleDetail';

interface CycleDetailsProps {
    cycles: GenerationCycleDetails[];
    selectedCycle: GenerationCycleDetails | null;
    onCycleSelect: (cycle: GenerationCycleDetails) => void;
}

export const CycleDetails: React.FC<CycleDetailsProps> = ({
    cycles
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

    return (
        <div style={componentStyles.panel}>
            <div style={componentStyles.panelHeader}>
                <h3 style={componentStyles.panelTitle}>Generation Cycles</h3>
                <span style={componentStyles.badge}>{cycles.length}</span>
            </div>
            <div style={{ ...componentStyles.tableContainer, width: '100%' }}>
                <table style={{ ...componentStyles.table, width: '100%', tableLayout: 'fixed' }}>
                    <tbody>
                        {cycles.map((cycle) => (
                            <React.Fragment key={cycle.cycleNumber}>
                                <CycleDropdown
                                    cycle={cycle}
                                    isExpanded={expandedCycles.has(cycle.cycleNumber)}
                                    onToggleExpand={() => toggleExpand(cycle.cycleNumber)}
                                />
                                {expandedCycles.has(cycle.cycleNumber) && (
                                    <tr>
                                        <td colSpan={6} style={{ padding: '0', width: '100%' }}>
                                            <CycleDetail cycle={cycle} />
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
