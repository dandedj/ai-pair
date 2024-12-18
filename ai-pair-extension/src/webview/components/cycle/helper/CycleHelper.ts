import { GenerationCycleDetails, Status } from 'ai-pair-types';

export const isInitialBuildComplete = (cycle: GenerationCycleDetails): boolean => {
    return cycle.initialBuildState !== undefined;
};

export const isFinalBuildComplete = (cycle: GenerationCycleDetails): boolean => {
    return cycle.finalBuildState !== undefined;
};

export const areInitialTestsComplete = (cycle: GenerationCycleDetails): boolean => {
    return cycle.initialTestResults !== undefined;
};

export const areFinalTestsComplete = (cycle: GenerationCycleDetails): boolean => {
    return cycle.finalTestResults !== undefined;
};

export const getTotalTests = (cycle: GenerationCycleDetails, type: 'initial' | 'final'): number => {
    const initialResults = cycle.initialTestResults;
    const finalResults = cycle.finalTestResults;
    
    if (type === 'initial') {
        return (
            initialResults.passedTests.length +
            initialResults.failedTests.length +
            initialResults.erroredTests.length
        );
    }
    
    if (type === 'final') {
        return (
            finalResults.passedTests.length +
            finalResults.failedTests.length +
            finalResults.erroredTests.length
        );
    }
    
    return 0;
};

export const isSuccessful = (cycle: GenerationCycleDetails): boolean => {
    // Check initial state if not forced
    if (!cycle.wasForced) {
        return !!(
            cycle.initialBuildState?.compiledSuccessfully &&
            cycle.initialTestResults?.failedTests.length === 0 &&
            cycle.initialTestResults?.erroredTests.length === 0
        );
    }

    // Check final state
    return !!(
        cycle.finalBuildState?.compiledSuccessfully &&
        cycle.finalTestResults?.failedTests.length === 0 &&
        cycle.finalTestResults?.erroredTests.length === 0
    );
};

export const isCycleComplete = (cycle: GenerationCycleDetails): boolean => {
    return cycle.status === Status.COMPLETED;
};

export const getCycleDuration = (cycle: GenerationCycleDetails): number => {
    if (!cycle.timings) {
        return 0;
    }

    const startTime = cycle.timings.cycleStartTime ? new Date(cycle.timings.cycleStartTime).getTime() : 0;
    const endTime = cycle.timings.cycleEndTime ? new Date(cycle.timings.cycleEndTime).getTime() : Date.now();

    return endTime - startTime;
};

export const formatDuration = (duration: number): string => {
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes === 0) {
        return `${seconds}s`;
    }

    return `${minutes}m ${remainingSeconds}s`;
}; 