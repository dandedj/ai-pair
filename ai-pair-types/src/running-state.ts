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

enum Status {
    IDLE = 0,
    BUILDING = 1,
    TESTING = 2,
    GENERATING_CODE = 3,
    APPLYING_CHANGES = 4,
    REBUILDING = 5,
    RETESTING = 6,
    COMPLETED = 7
}

export function getStatusDisplay(status: Status): string {
    switch (status) {
        case Status.IDLE: return 'idle';
        case Status.BUILDING: return 'building';
        case Status.TESTING: return 'testing';
        case Status.GENERATING_CODE: return 'generating_code';
        case Status.APPLYING_CHANGES: return 'applying_changes';
        case Status.REBUILDING: return 'rebuilding';
        case Status.RETESTING: return 'retesting';
        case Status.COMPLETED: return 'completed';
    }
}

export class RunningState {
    private _generationCycleDetails: GenerationCycleDetails[] = [];
    private _listeners: ((state: RunningState) => void)[] = [];
    private _accumulatedHints: string[] = [];

    constructor() {
        this._generationCycleDetails = [];
        this._accumulatedHints = [];
        this._listeners = [];
    }

    get currentCycle(): GenerationCycleDetails | null {
        return this._generationCycleDetails.length > 0 
            ? this._generationCycleDetails[this._generationCycleDetails.length - 1] 
            : null;
    }

    get status(): Status {
        return this.currentCycle?.status ?? Status.IDLE;
    }

    get generationCycleDetails(): GenerationCycleDetails[] {
        return this._generationCycleDetails;
    }

    get testResults(): TestResults {
        return this.currentCycle?.finalTestResults ?? {
            testsPassed: false,
            failedTests: [],
            passedTests: [],
            erroredTests: [],
            testOutput: "",
            testsCompiledSuccessfully: false
        };
    }

    set testResults(value: TestResults) {
        if (this.currentCycle) {
            this.currentCycle.finalTestResults = value;
            this.notifyListeners();
        }
    }

    get buildState(): BuildState {
        return this.currentCycle?.finalBuildState ?? {
            compiledSuccessfully: false,
            compilerOutput: ""
        };
    }

    set buildState(value: BuildState) {
        if (this.currentCycle) {
            this.currentCycle.finalBuildState = value;
            this.notifyListeners();
        }
    }

    get codeChanges(): CodeChangeSummary {
        return this.currentCycle?.codeChanges ?? {
            lastChangeTime: null,
            newFiles: [],
            deletedFiles: [],
            modifiedFiles: [],
            buildFiles: [],
            testFiles: []
        };
    }

    set codeChanges(value: CodeChangeSummary) {
        if (this.currentCycle) {
            this.currentCycle.codeChanges = value;
            this.notifyListeners();
        }
    }

    public startNewCycle(model: string): GenerationCycleDetails {
        const newCycle: GenerationCycleDetails = {
            model,
            cycleNumber: this._generationCycleDetails.length + 1,
            status: Status.IDLE,
            initialBuildState: { compiledSuccessfully: false, compilerOutput: "" },
            finalBuildState: { compiledSuccessfully: false, compilerOutput: "" },
            initialTestResults: { testsPassed: false, passedTests: [], failedTests: [], erroredTests: [], testOutput: "", testsCompiledSuccessfully: false },
            finalTestResults: { testsPassed: false, passedTests: [], failedTests: [], erroredTests: [], testOutput: "", testsCompiledSuccessfully: false },
            codeChanges: { lastChangeTime: null, newFiles: [], deletedFiles: [], modifiedFiles: [], buildFiles: [], testFiles: [] },
            timings: {
                cycleStartTime: Date.now(),
                cycleEndTime: null,
                phaseTimings: []
            },
            wasForced: false
        };
        this._generationCycleDetails.push(newCycle);
        this.notifyListeners();
        return newCycle;
    }

    public updateCurrentCycleStatus(status: Status): void {
        if (this.currentCycle) {
            this.currentCycle.status = status;
            this.notifyListeners();
        }
    }

    public endCurrentCycle(): void {
        if (this.currentCycle) {
            this.currentCycle.timings.cycleEndTime = Date.now();
            this.notifyListeners();
        }
    }

    private notifyListeners(): void {
        this._listeners.forEach(listener => listener(this));
    }

    public onChange(listener: (state: RunningState) => void): () => void {
        this._listeners.push(listener);
        return () => {
            this._listeners = this._listeners.filter(l => l !== listener);
        };
    }

    addHint(hint: string): void {
        if (hint) {
            this._accumulatedHints.push(hint);
            this.notifyListeners();
        }
    }

    clearHints(): void {
        this._accumulatedHints = [];
        this.notifyListeners();
    }

    resetCycleState(): void {
        if (this.currentCycle) {
            this.currentCycle.finalTestResults = {
                testsPassed: false,
                failedTests: [],
                passedTests: [],
                erroredTests: [],
                testOutput: "",
                testsCompiledSuccessfully: false
            };
            this.currentCycle.finalBuildState = {
                compiledSuccessfully: false,
                compilerOutput: "",
            };
            this.notifyListeners();
        }
    }

    reset(): void {
        this._generationCycleDetails = [];
        this._accumulatedHints = [];
        this.notifyListeners();
    }

    get accumulatedHints(): string[] {
        return this._accumulatedHints;
    }

    async withPhase<T>(status: Status, fn: () => Promise<T>): Promise<T> {
        console.log(`Starting phase with status: ${Status[status]}`);
        this.updateCurrentCycleStatus(status);
        
        if (this.currentCycle) {
            const phaseTiming: PhaseTimings = {
                status,
                startTime: Date.now(),
                endTime: null
            };
            this.currentCycle.timings.phaseTimings.push(phaseTiming);
        }

        try {
            const result = await fn();
            return result;
        } finally {
            if (this.currentCycle) {
                const phaseTiming = this.currentCycle.timings.phaseTimings.find(t => t.status === status);
                if (phaseTiming) {
                    phaseTiming.endTime = Date.now();
                }
            }
            console.log(`Finished phase with status: ${Status[status]}`);
        }
    }
}

export { 
    CodeFile, 
    CodeChangeSummary, 
    Status, 
    TestResults, 
    BuildState,
    GenerationCycleDetails,
    CycleTimings,
    PhaseTimings
};