interface CodeChangeSummary {
    lastChangeTime: Date | null;
    newFiles: string[];
    deletedFiles: string[];
    modifiedFiles: string[];
    buildFiles: string[];
}
interface TestResults {
    testsPassed: boolean;
    failedTests: string[];
    passedTests: string[];
    erroredTests: string[];
}
interface BuildState {
    compiledSuccessfully: boolean;
    compilerOutput: string;
}
interface CodeFile {
    path: string;
    content: string;
}
interface CycleTimings {
    cycleStartTime: number;
    cycleEndTime: number | null;
    initialBuildStartTime: number | null;
    initialBuildEndTime: number | null;
    initialTestStartTime: number | null;
    initialTestEndTime: number | null;
    codeGenerationStartTime: number | null;
    codeGenerationEndTime: number | null;
    finalBuildStartTime: number | null;
    finalBuildEndTime: number | null;
    finalTestStartTime: number | null;
    finalTestEndTime: number | null;
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
    private _currentCycle;
    private _changeListeners;
    private _buildState;
    private _testResults;
    private _codeChanges;
    private _accumulatedHints;
    private _cycleStartTime;
    private _listeners;
    private _currentCycleIndex;
    constructor();
    get currentCycle(): GenerationCycleDetails | null;
    get currentCycleIndex(): number;
    get status(): Status;
    get generationCycleDetails(): GenerationCycleDetails[];
    get testResults(): TestResults;
    set testResults(value: TestResults);
    get buildState(): BuildState;
    set buildState(value: BuildState);
    get codeChanges(): CodeChangeSummary;
    set codeChanges(value: CodeChangeSummary);
    get cycleStartTime(): Date | null;
    set cycleStartTime(value: Date | null);
    private updateState;
    resetState(): void;
    startNewCycle(model: string): void;
    updateCurrentCycleStatus(status: Status): void;
    endCurrentCycle(): void;
    updateTimings(phase: keyof CycleTimings, isStart: boolean): void;
    private notifyChangeListeners;
    private notifyListeners;
    onChange(listener: (state: RunningState) => void): () => void;
    addHint(hint: string): void;
    clearHints(): void;
    resetCycleState(): void;
    reset(): void;
    get accumulatedHints(): string[];
    withPhase<T>(status: Status, phase: 'initialBuild' | 'initialTest' | 'codeGeneration' | 'finalBuild' | 'finalTest', fn: () => Promise<T>): Promise<T>;
}
export { CodeFile, CodeChangeSummary, Status, TestResults, BuildState, GenerationCycleDetails, CycleTimings };
