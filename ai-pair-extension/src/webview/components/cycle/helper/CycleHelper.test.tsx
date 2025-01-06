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
} from './CycleHelper';
import { GenerationCycleDetails, Status, CycleTimings } from 'ai-pair-types';

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
            testFiles: []
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
            testOutput: '',
            testsCompiledSuccessfully: true
        },
        finalTestResults: {
            passedTests: [],
            failedTests: [],
            erroredTests: [],
            testsPassed: true,
            testOutput: '',
            testsCompiledSuccessfully: true
        },
        timings: {
            cycleStartTime: Date.now(),
            cycleEndTime: Date.now(),
            phaseTimings: [
                { status: Status.BUILDING, startTime: Date.now(), endTime: Date.now() },
                { status: Status.TESTING, startTime: Date.now(), endTime: Date.now() },
                { status: Status.GENERATING_CODE, startTime: Date.now(), endTime: Date.now() },
                { status: Status.REBUILDING, startTime: Date.now(), endTime: Date.now() },
                { status: Status.RETESTING, startTime: Date.now(), endTime: Date.now() }
            ]
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
                    testOutput: '',
                    testsCompiledSuccessfully: true
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
                    testOutput: '',
                    testsCompiledSuccessfully: true
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
                    testOutput: '',
                    testsCompiledSuccessfully: true
                },
            });
            expect(isSuccessful(forcedFailedCycle)).toBe(false);
        });
    });

    describe('getTotalTests', () => {
        it('returns correct total from initial results when not forced', () => {
            expect(getTotalTests(mockCycle, 'initial')).toBe(0);
        });

        it('returns correct total from final results when forced', () => {
            const forcedCycle: GenerationCycleDetails = { ...mockCycle, wasForced: true };
            expect(getTotalTests(forcedCycle, 'final')).toBe(0);
        });

        it('returns correct total when there are errored tests', () => {
            const cycleWithErrors: GenerationCycleDetails = {
                ...mockCycle,
                initialTestResults: {
                    passedTests: ['test1'],
                    failedTests: ['test2'],
                    erroredTests: ['test3'],
                    testsPassed: false,
                    testOutput: '',
                    testsCompiledSuccessfully: true
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
            const duration = getCycleDuration(mockCycle);
            expect(duration).toBeGreaterThanOrEqual(0);
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
            const completedCycle = createMockCycle();
            expect(isCycleComplete(completedCycle)).toBe(true);
            
            const incompleteCycle = createMockCycle({ status: Status.BUILDING });
            expect(isCycleComplete(incompleteCycle)).toBe(false);

            // Test with undefined cycle
            expect(isCycleComplete(undefined as unknown as GenerationCycleDetails)).toBe(false);
        });

        it('correctly identifies build states', () => {
            const cycleWithBuilds = createMockCycle();
            expect(isInitialBuildComplete(cycleWithBuilds)).toBe(true);
            expect(isFinalBuildComplete(cycleWithBuilds)).toBe(true);

            const cycleWithoutBuilds = createMockCycle({
                initialBuildState: undefined,
                finalBuildState: undefined
            });
            expect(isInitialBuildComplete(cycleWithoutBuilds)).toBe(false);
            expect(isFinalBuildComplete(cycleWithoutBuilds)).toBe(false);

            // Test with undefined cycle
            expect(isInitialBuildComplete(undefined as unknown as GenerationCycleDetails)).toBe(false);
            expect(isFinalBuildComplete(undefined as unknown as GenerationCycleDetails)).toBe(false);
        });

        it('correctly identifies test states', () => {
            const cycleWithTests = createMockCycle();
            expect(areInitialTestsComplete(cycleWithTests)).toBe(true);
            expect(areFinalTestsComplete(cycleWithTests)).toBe(true);

            const cycleWithoutTests = createMockCycle({
                initialTestResults: undefined,
                finalTestResults: undefined
            });
            expect(areInitialTestsComplete(cycleWithoutTests)).toBe(false);
            expect(areFinalTestsComplete(cycleWithoutTests)).toBe(false);

            // Test with undefined cycle
            expect(areInitialTestsComplete(undefined as unknown as GenerationCycleDetails)).toBe(false);
            expect(areFinalTestsComplete(undefined as unknown as GenerationCycleDetails)).toBe(false);
        });
    });
}); 