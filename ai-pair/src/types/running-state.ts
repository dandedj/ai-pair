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
    lastRunTime: Date | null;
}

interface BuildState {
    compiledSuccessfully: boolean;
    compilerOutput: string;
    compilerErrors: string[];
    lastCompileTime: Date;
    compilationErrors: string[];
    logFile: string;
}

interface CodeFile {
    path: string;
    content: string;
}

interface CycleTimings {
    cycleStartTime: number;
    cycleEndTime: number | null;
    compilationStartTime: number;
    compilationEndTime: number;
    testingStartTime: number;
    testingEndTime: number;
    codeGenerationStartTime: number;
    codeGenerationEndTime: number;
    retestingStartTime: number;
    retestingEndTime: number;
}

interface GenerationCycleDetails {
    cycleNumber: number;
    model: string;
    initialBuildState: BuildState;
    finalBuildState: BuildState;
    initialTestResults: TestResults;
    finalTestResults: TestResults;
    codeChanges: CodeChangeSummary;
    timings: CycleTimings;
}

enum Status {
    IDLE = 'idle',
    COMPILING = 'compiling',
    TESTING = 'testing',
    GENERATING_CODE = 'generating_code',
    APPLYING_CHANGES = 'applying_changes',
    RECOMPILING = 'recompiling',
    RETESTING = 'retesting',
    COMPLETED = 'completed',
}

class RunningState {
    private _listeners: ((state: RunningState) => void)[] = [];
    private _status: Status;
    private _accumulatedHints: string[] = [];
    private _lastRunOutput: string = "";
    private _testResults: TestResults;
    private _buildState: BuildState;
    private _codeChanges: CodeChangeSummary;
    private _cycleStartTime: Date | null = null;
    private _currentCycleIndex: number = -1;
    private _generationCycleDetails: GenerationCycleDetails[] = [];

    constructor() {
        this._status = Status.IDLE;
        this._accumulatedHints = [];
        this._testResults = {
            testsPassed: false,
            failedTests: [],
            passedTests: [],
            erroredTests: [],
            lastRunTime: null,
        };
        this._buildState = {
            compiledSuccessfully: false,
            compilerOutput: "",
            compilerErrors: [],
            lastCompileTime: new Date(),
            compilationErrors: [],
            logFile: "",
        };
        this._codeChanges = {
            lastChangeTime: null,
            newFiles: [],
            deletedFiles: [],
            modifiedFiles: [],
            buildFiles: [],
        };
    }

    get status(): Status {
        return this._status;
    }

    set status(value: Status) {
        this._status = value;
        this.notifyListeners();
    }

    get accumulatedHints(): string[] {
        return this._accumulatedHints;
    }

    get generationCycleDetails(): GenerationCycleDetails[] {
        return this._generationCycleDetails;
    }

    get lastRunOutput(): string {
        return this._lastRunOutput;
    }

    set lastRunOutput(value: string) {
        this._lastRunOutput = value;
        this.notifyListeners();
    }

    get testResults(): TestResults {
        return this._testResults;
    }

    set testResults(value: TestResults) {
        this._testResults = value;
        if (this._currentCycleIndex >= 0) {
            this._generationCycleDetails[this._currentCycleIndex].finalTestResults = value;
        }
        this.notifyListeners();
    }

    get buildState(): BuildState {
        return this._buildState;
    }

    set buildState(value: BuildState) {
        this._buildState = value;
        if (this._currentCycleIndex >= 0) {
            this._generationCycleDetails[this._currentCycleIndex].initialBuildState = value;
        }
        this.notifyListeners();
    }

    get codeChanges(): CodeChangeSummary {
        return this._codeChanges;
    }

    set codeChanges(value: CodeChangeSummary) {
        this._codeChanges = value;
        if (this._currentCycleIndex >= 0) {
            this._generationCycleDetails[this._currentCycleIndex].codeChanges = value;
        }
        this.notifyListeners();
    }

    get cycleStartTime(): Date | null {
        return this._cycleStartTime;
    }

    set cycleStartTime(value: Date | null) {
        this._cycleStartTime = value;
        this.notifyListeners();
    }

    get currentCycle(): GenerationCycleDetails | null {
        return this._currentCycleIndex >= 0 ? this._generationCycleDetails[this._currentCycleIndex] : null;
    }

    startNewCycle(model: string): void {
        const newCycle: GenerationCycleDetails = {
            cycleNumber: this._generationCycleDetails.length + 1,
            model,
            initialBuildState: { ...this._buildState },
            finalBuildState: { ...this._buildState },
            initialTestResults: { ...this._testResults },
            finalTestResults: { ...this._testResults },
            codeChanges: { ...this._codeChanges },
            timings: {
                cycleStartTime: Date.now(),
                cycleEndTime: 0,
                compilationStartTime: 0,
                compilationEndTime: 0,
                testingStartTime: 0,
                testingEndTime: 0,
                codeGenerationStartTime: 0,
                codeGenerationEndTime: 0,
                retestingStartTime: 0,
                retestingEndTime: 0
            }
        };
        this._generationCycleDetails.push(newCycle);
        this._currentCycleIndex = this._generationCycleDetails.length - 1;
        this.notifyListeners();
    }

    endCurrentCycle(): void {
        if (this._currentCycleIndex >= 0) {
            this._generationCycleDetails[this._currentCycleIndex].timings.cycleEndTime = new Date().getTime();
            this._currentCycleIndex = -1;
        }
        this.notifyListeners();
    }

    updateTimings(phase: keyof CycleTimings, isStart: boolean): void {
        if (this._currentCycleIndex >= 0) {
            const timingKey = isStart ? phase : phase.replace('Start', 'End') as keyof CycleTimings;
            this._generationCycleDetails[this._currentCycleIndex].timings[timingKey] = new Date().getTime();
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

    resetState(): void {
        this._status = Status.IDLE;
        this._accumulatedHints = [];
        this._lastRunOutput = "";
        this._testResults = {
            testsPassed: false,
            failedTests: [],
            passedTests: [],
            erroredTests: [],
            lastRunTime: null,
        };
        this._buildState = {
            compiledSuccessfully: false,
            compilerOutput: "",
            compilerErrors: [],
            lastCompileTime: new Date(),
            compilationErrors: [],
            logFile: "",
        };
        this._codeChanges = {
            lastChangeTime: null,
            newFiles: [],
            deletedFiles: [],
            modifiedFiles: [],
            buildFiles: [],
        };
        this._cycleStartTime = null;
        this._currentCycleIndex = -1;
        this.notifyListeners();
    }

    resetCycleState(): void {
        this._testResults = {
            testsPassed: false,
            failedTests: [],
            passedTests: [],
            erroredTests: [],
            lastRunTime: null,
        };
        this._buildState = {
            compiledSuccessfully: false,
            compilerOutput: "",
            compilerErrors: [],
            lastCompileTime: new Date(),
            compilationErrors: [],
            logFile: "",
        };
        this._lastRunOutput = "";
        this.notifyListeners();
    }

    reset(): void {
        this._status = Status.IDLE;
        this._accumulatedHints = [];
        this._lastRunOutput = "";
        this._testResults = {
            testsPassed: false,
            failedTests: [],
            passedTests: [],
            erroredTests: [],
            lastRunTime: null
        };
        this._buildState = {
            compiledSuccessfully: false,
            compilerOutput: "",
            compilerErrors: [],
            lastCompileTime: new Date(),
            compilationErrors: [],
            logFile: "",
        };
        this._codeChanges = {
            lastChangeTime: null,
            newFiles: [],
            deletedFiles: [],
            modifiedFiles: [],
            buildFiles: []
        };
        this._cycleStartTime = null;
        this._currentCycleIndex = -1;
        this.notifyListeners();
    }
}

export { 
    RunningState, 
    CodeFile, 
    CodeChangeSummary, 
    Status, 
    TestResults, 
    BuildState,
    GenerationCycleDetails,
    CycleTimings 
};