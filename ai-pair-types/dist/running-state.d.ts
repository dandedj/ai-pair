interface CodeChangeSummary {
    lastChangeTime: Date | null;
    newFiles: string[];
    deletedFiles: string[];
    modifiedFiles: string[];
    buildFiles: string[];
    testFiles: string[];
}
interface TestResults {
    testsPassed: boolean;
    failedTests: string[];
    passedTests: string[];
    erroredTests: string[];
    testOutput: string;
    testsCompiledSuccessfully: boolean;
}
interface BuildState {
    compiledSuccessfully: boolean;
    compilerOutput: string;
}
interface CodeFile {
    path: string;
    content: string;
}
interface PhaseTimings {
    status: Status;
    startTime: number | null;
    endTime: number | null;
}
interface CycleTimings {
    cycleStartTime: number;
    cycleEndTime: number | null;
    phaseTimings: PhaseTimings[];
}
interface GenerationCycleDetails {
    status: Status;
    cycleNumber: number;
    model: string;
    initialBuildState: BuildState;
    finalBuildState: BuildState;
    initialTestResults: TestResults;
    finalTestResults: TestResults;
    codeChanges: CodeChangeSummary;
    timings: CycleTimings;
    wasForced: boolean;
}
declare enum Status {
    IDLE = 0,
    BUILDING = 1,
    TESTING = 2,
    GENERATING_CODE = 3,
    APPLYING_CHANGES = 4,
    REBUILDING = 5,
    RETESTING = 6,
    COMPLETED = 7
}
export declare function getStatusDisplay(status: Status): string;
export declare class RunningState {
    private _generationCycleDetails;
    private _listeners;
    private _accumulatedHints;
    constructor();
    get currentCycle(): GenerationCycleDetails | null;
    get status(): Status;
    get generationCycleDetails(): GenerationCycleDetails[];
    get testResults(): TestResults;
    set testResults(value: TestResults);
    get buildState(): BuildState;
    set buildState(value: BuildState);
    get codeChanges(): CodeChangeSummary;
    set codeChanges(value: CodeChangeSummary);
    startNewCycle(model: string): GenerationCycleDetails;
    updateCurrentCycleStatus(status: Status): void;
    endCurrentCycle(): void;
    private notifyListeners;
    onChange(listener: (state: RunningState) => void): () => void;
    addHint(hint: string): void;
    clearHints(): void;
    resetCycleState(): void;
    reset(): void;
    get accumulatedHints(): string[];
    withPhase<T>(status: Status, fn: () => Promise<T>): Promise<T>;
}
export { CodeFile, CodeChangeSummary, Status, TestResults, BuildState, GenerationCycleDetails, CycleTimings, PhaseTimings };
