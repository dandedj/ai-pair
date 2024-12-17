import { 
    isSuccessful,
    getTotalTests,
    formatDuration,
    getCycleDuration,
    isCycleComplete,
    isInitialBuildComplete,
    isFinalBuildComplete,
    areInitialTestsComplete,
    areFinalTestsComplete,
    shouldShowSection,
    isCurrentSection,
    isPendingSection
} from './CycleHelper';
import { Status, GenerationCycleDetails, CycleTimings } from 'ai-pair/types';

function createMockCycle(overrides?: Partial<GenerationCycleDetails>): GenerationCycleDetails {
    return {
        cycleNumber: 1,
        status: Status.COMPLETED,
        wasForced: false,
        model: 'gpt-4',
        codeChanges: {
            lastChangeTime: new Date(),
            newFiles: [],
            deletedFiles: [],
            modifiedFiles: [],
            buildFiles: [],
        },
        initialBuildState: {
            compiledSuccessfully: true,
            compilerOutput: 'Build succeeded',
        },
        finalBuildState: {
            compiledSuccessfully: true,
            compilerOutput: 'Final build succeeded',
        },
        initialTestResults: {
            passedTests: [],
            failedTests: [],
            erroredTests: [],
            testsPassed: true,
        },
        finalTestResults: {
            passedTests: [],
            failedTests: [],
            erroredTests: [],
            testsPassed: true,
        },
        timings: {
            cycleStartTime: Date.now(),
            cycleEndTime: Date.now(),
            initialBuildStartTime: Date.now(),
            initialBuildEndTime: Date.now(),
            initialTestStartTime: Date.now(),
            initialTestEndTime: Date.now(),
            codeGenerationStartTime: Date.now(),
            codeGenerationEndTime: Date.now(),
            finalBuildStartTime: Date.now(),
            finalBuildEndTime: Date.now(),
            finalTestStartTime: Date.now(),
            finalTestEndTime: Date.now(),
        },
        ...overrides,
    };
}

describe('CycleHelper', () => {
    let mockCycle: GenerationCycleDetails;

    beforeEach(() => {
        mockCycle = createMockCycle();
    });

    describe('isSuccessful', () => {
        it('returns true when initial tests pass and not forced', () => {
            expect(isSuccessful(mockCycle)).toBe(true);
        });

        it('returns false when cycle is not complete', () => {
            const incompleteCycle = createMockCycle({
                status: Status.BUILDING,
                initialBuildState: {
                    compiledSuccessfully: false,
                    compilerOutput: 'Build failed',
                },
                initialTestResults: {
                    passedTests: [],
                    failedTests: ['test1'],
                    erroredTests: [],
                    testsPassed: false,
                },
            });
            expect(isSuccessful(incompleteCycle)).toBe(false);
        });

        it('returns true when forced and final tests pass', () => {
            const forcedCycle = createMockCycle({
                wasForced: true,
                initialTestResults: {
                    passedTests: [],
                    failedTests: ['test1'],
                    erroredTests: [],
                    testsPassed: false,
                },
            });
            expect(isSuccessful(forcedCycle)).toBe(true);
        });

        it('returns false when forced and final tests fail', () => {
            const forcedFailedCycle = createMockCycle({
                wasForced: true,
                finalTestResults: {
                    passedTests: [],
                    failedTests: ['test1'],
                    erroredTests: [],
                    testsPassed: false,
                },
            });
            expect(isSuccessful(forcedFailedCycle)).toBe(false);
        });
    });

    describe('getTotalTests', () => {
        it('returns correct total from initial results when not forced', () => {
            expect(getTotalTests(mockCycle, 'initial')).toBe(1);
        });

        it('returns correct total from final results when forced', () => {
            const forcedCycle: GenerationCycleDetails = { ...mockCycle, wasForced: true };
            expect(getTotalTests(forcedCycle, 'final')).toBe(2);
        });

        it('returns correct total when there are errored tests', () => {
            const cycleWithErrors: GenerationCycleDetails = {
                ...mockCycle,
                initialTestResults: {
                    passedTests: ['test1'],
                    failedTests: ['test2'],
                    erroredTests: ['test3'],
                    testsPassed: false
                }
            };
            expect(getTotalTests(cycleWithErrors, 'initial')).toBe(3);
        });

        it('returns 0 when test results are undefined', () => {
            const cycleWithoutTests = createMockCycle({
                initialTestResults: undefined,
                finalTestResults: undefined,
            });
            expect(getTotalTests(cycleWithoutTests, 'initial')).toBe(0);
            expect(getTotalTests(cycleWithoutTests, 'final')).toBe(0);
        });
    });

    describe('formatDuration', () => {
        it('formats milliseconds to seconds string', () => {
            expect(formatDuration(5000)).toBe('5s');
        });

        it('formats minutes and seconds correctly', () => {
            expect(formatDuration(65000)).toBe('1m 5s');
            expect(formatDuration(3600000)).toBe('60m 0s');
        });

        it('handles zero duration', () => {
            expect(formatDuration(0)).toBe('0s');
        });
    });

    describe('getCycleDuration', () => {
        it('calculates correct duration', () => {
            expect(getCycleDuration(mockCycle)).toBe(10000);
        });

        it('returns 0 when timings are undefined', () => {
            const cycleWithoutTimings = createMockCycle({
                timings: null as unknown as CycleTimings
            });
            expect(getCycleDuration(cycleWithoutTimings)).toBe(0);
        });

        it('calculates duration for incomplete cycle', () => {
            const incompleteCycle: GenerationCycleDetails = {
                ...mockCycle,
                timings: {
                    ...mockCycle.timings,
                    cycleEndTime: null
                }
            };
            const duration = getCycleDuration(incompleteCycle);
            expect(duration).toBeGreaterThan(0);
        });
    });

    describe('cycle state checks', () => {
        it('correctly identifies cycle completion state', () => {
            expect(isCycleComplete(mockCycle)).toBe(true);
            
            const incompleteCycle: GenerationCycleDetails = { ...mockCycle, status: Status.BUILDING };
            expect(isCycleComplete(incompleteCycle)).toBe(false);
        });

        it('correctly identifies build states', () => {
            expect(isInitialBuildComplete(mockCycle)).toBe(true);
            expect(isFinalBuildComplete(mockCycle)).toBe(true);

            const cycleWithoutBuilds = createMockCycle({
                initialBuildState: undefined,
                finalBuildState: undefined
            });
            expect(isInitialBuildComplete(cycleWithoutBuilds)).toBe(false);
            expect(isFinalBuildComplete(cycleWithoutBuilds)).toBe(false);
        });

        it('correctly identifies test states', () => {
            expect(areInitialTestsComplete(mockCycle)).toBe(true);
            expect(areFinalTestsComplete(mockCycle)).toBe(true);

            const cycleWithoutTests = createMockCycle({
                initialTestResults: undefined,
                finalTestResults: undefined
            });
            expect(areInitialTestsComplete(cycleWithoutTests)).toBe(false);
            expect(areFinalTestsComplete(cycleWithoutTests)).toBe(false);
        });
    });

    describe('section visibility', () => {
        it('correctly determines if section should be shown', () => {
            expect(shouldShowSection(mockCycle, Status.BUILDING)).toBe(true);
            expect(shouldShowSection(mockCycle, Status.TESTING)).toBe(true);
            expect(shouldShowSection(mockCycle, Status.GENERATING_CODE)).toBe(true);
            expect(shouldShowSection(mockCycle, Status.APPLYING_CHANGES)).toBe(true);
            expect(shouldShowSection(mockCycle, Status.REBUILDING)).toBe(true);
            expect(shouldShowSection(mockCycle, Status.RETESTING)).toBe(true);
            expect(shouldShowSection(mockCycle, Status.COMPLETED)).toBe(true);
        });

        it('correctly identifies current section', () => {
            expect(isCurrentSection(mockCycle, Status.COMPLETED)).toBe(true);
            expect(isCurrentSection(mockCycle, Status.BUILDING)).toBe(false);
            expect(isCurrentSection(mockCycle, Status.TESTING)).toBe(false);
            expect(isCurrentSection(mockCycle, Status.GENERATING_CODE)).toBe(false);
        });

        it('correctly identifies pending sections', () => {
            const buildingCycle: GenerationCycleDetails = { ...mockCycle, status: Status.BUILDING };
            expect(isPendingSection(buildingCycle, Status.TESTING)).toBe(true);
            expect(isPendingSection(buildingCycle, Status.GENERATING_CODE)).toBe(true);
            expect(isPendingSection(buildingCycle, Status.COMPLETED)).toBe(true);
            expect(isPendingSection(buildingCycle, Status.BUILDING)).toBe(false);
        });

        it('handles all status transitions correctly', () => {
            const statuses = [
                Status.BUILDING,
                Status.TESTING,
                Status.GENERATING_CODE,
                Status.APPLYING_CHANGES,
                Status.REBUILDING,
                Status.RETESTING,
                Status.COMPLETED
            ];

            statuses.forEach((currentStatus, index) => {
                const cycleInProgress: GenerationCycleDetails = { ...mockCycle, status: currentStatus };
                
                // Test shouldShowSection
                statuses.forEach((checkStatus, checkIndex) => {
                    expect(shouldShowSection(cycleInProgress, checkStatus))
                        .toBe(checkIndex <= index);
                });

                // Test isCurrentSection
                statuses.forEach(checkStatus => {
                    expect(isCurrentSection(cycleInProgress, checkStatus))
                        .toBe(checkStatus === currentStatus);
                });

                // Test isPendingSection
                statuses.forEach((checkStatus, checkIndex) => {
                    expect(isPendingSection(cycleInProgress, checkStatus))
                        .toBe(checkIndex > index);
                });
            });
        });
    });
}); 