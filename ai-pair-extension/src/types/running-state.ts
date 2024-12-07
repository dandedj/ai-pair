export interface BuildState {
    compiledSuccessfully: boolean;
}

export interface TestResults {
    passedTests: string[];
    failedTests: string[];
    erroredTests: string[];
}

export interface CodeChanges {
    modifiedFiles: string[];
    newFiles: string[];
}

export interface CycleTimings {
    cycleStartTime: number | null;
    cycleEndTime: number | null;
    compilationStartTime: number | null;
    compilationEndTime: number | null;
    testingStartTime: number | null;
    testingEndTime: number | null;
    codeGenerationStartTime: number | null;
    codeGenerationEndTime: number | null;
    retestingStartTime: number | null;
    retestingEndTime: number | null;
}

export interface GenerationCycleDetails {
    cycleNumber: number;
    initialBuildState: BuildState | null;
    initialTestResults: TestResults | null;
    finalBuildState: BuildState | null;
    finalTestResults: TestResults | null;
    codeChanges: CodeChanges | null;
    timings: CycleTimings;
    model?: string;
}

export interface RunningState {
    status: string;
    buildState: BuildState | null;
    testResults: TestResults | null;
    codeChanges: CodeChanges | null;
    generationCycleDetails: GenerationCycleDetails[];
} 