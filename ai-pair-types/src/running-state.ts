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
    private _currentCycle: GenerationCycleDetails | null = null;
    private _changeListeners: ((state: RunningState) => void)[] = [];

    private _buildState: BuildState;
    private _testResults: TestResults;
    private _codeChanges: CodeChangeSummary;
    private _accumulatedHints: string[];
    private _cycleStartTime: Date | null;
    private _listeners: ((state: RunningState) => void)[] = [];
    private _currentCycleIndex: number;

    constructor() {
        this._buildState = {
            compiledSuccessfully: false,
            compilerOutput: ""
        };
        this._testResults = {
            passedTests: [],
            failedTests: [],
            erroredTests: [],
            testsPassed: false,
        };
        this._codeChanges = {
            lastChangeTime: null,
            newFiles: [],
            deletedFiles: [],
            modifiedFiles: [],
            buildFiles: [],
        };
        this._accumulatedHints = [];
        this._cycleStartTime = null;
        this._changeListeners = [];
        this._listeners = [];
        this._currentCycleIndex = -1;
    }

    get currentCycle(): GenerationCycleDetails | null {
        return this._generationCycleDetails.length > 0 
            ? this._generationCycleDetails[this._generationCycleDetails.length - 1] 
            : null;
    }

    get currentCycleIndex(): number {
        return this._currentCycleIndex;
    }

    get status(): Status {
        if (!this.currentCycle) {
            return Status.IDLE;
        }
        return this.currentCycle.status;
    }

    get generationCycleDetails(): GenerationCycleDetails[] {
        return this._generationCycleDetails;
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

    private updateState(updater: (state: RunningState) => void) {
        updater(this);
        this.notifyChangeListeners();
    }

    public resetState(): void {
        this.updateState(state => {
            state._generationCycleDetails = [];
            state._currentCycle = null;
        });
    }

    public startNewCycle(model: string): void {
        this.updateState(state => {
            const newCycle: GenerationCycleDetails = {
                model,
                cycleNumber: state._generationCycleDetails.length + 1,
                status: Status.IDLE,
                initialBuildState: { compiledSuccessfully: false, compilerOutput: "" },
                finalBuildState: { compiledSuccessfully: false, compilerOutput: "" },
                initialTestResults: { testsPassed: false, passedTests: [], failedTests: [], erroredTests: [] },
                finalTestResults: { testsPassed: false, passedTests: [], failedTests: [], erroredTests: [] },
                codeChanges: { lastChangeTime: null, newFiles: [], deletedFiles: [], modifiedFiles: [], buildFiles: [] },
                timings: { cycleStartTime: Date.now(), cycleEndTime: null, initialBuildStartTime: null, initialBuildEndTime: null, initialTestStartTime: null, initialTestEndTime: null, codeGenerationStartTime: null, codeGenerationEndTime: null, finalBuildStartTime: null, finalBuildEndTime: null, finalTestStartTime: null, finalTestEndTime: null },
                wasForced: false
            };
            state._currentCycle = newCycle;
            state._generationCycleDetails.push(newCycle);
        });
    }

    public updateCurrentCycleStatus(status: Status): void {
        console.log(`Updating cycle status from ${Status[this.status]} to ${Status[status]}`);
        this.updateState(state => {
            if (state._currentCycle) {
                state._currentCycle.status = status;
                this.notifyListeners();
            }
        });
    }

    public endCurrentCycle(): void {
        this.updateState(state => {
            if (state._currentCycle) {
                state._currentCycle.timings.cycleEndTime = Date.now();
            }
        });
    }

    updateTimings(phase: keyof CycleTimings, isStart: boolean): void {
        if (this._currentCycleIndex >= 0) {
            const timingKey = isStart ? phase : phase.replace('Start', 'End') as keyof CycleTimings;
            this._generationCycleDetails[this._currentCycleIndex].timings[timingKey] = new Date().getTime();
            this.notifyListeners();
        }
    }

    private notifyChangeListeners(): void {
        this._changeListeners.forEach(listener => listener(this));
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
        this._testResults = {
            testsPassed: false,
            failedTests: [],
            passedTests: [],
            erroredTests: []
        };
        this._buildState = {
            compiledSuccessfully: false,
            compilerOutput: "",
        };
        this.notifyListeners();
    }

    reset(): void {
        this._buildState = {
            compiledSuccessfully: false,
            compilerOutput: "",
        };
        this._testResults = {
            passedTests: [],
            failedTests: [],
            erroredTests: [],
            testsPassed: false
        };
        this._codeChanges = {
            lastChangeTime: null,
            newFiles: [],
            deletedFiles: [],
            modifiedFiles: [],
            buildFiles: [],
        };
        this._generationCycleDetails = [];
        this._accumulatedHints = [];
        this._cycleStartTime = null;
        this._changeListeners = [];
        this.notifyListeners();
    }

    get accumulatedHints(): string[] {
        return this._accumulatedHints;
    }

    async withPhase<T>(status: Status, phase: 'initialBuild' | 'initialTest' | 'codeGeneration' | 'finalBuild' | 'finalTest', fn: () => Promise<T>): Promise<T> {
        console.log(`Starting phase: ${phase} with status: ${Status[status]}`);
        this.updateCurrentCycleStatus(status);
        this.updateTimings(`${phase}StartTime` as keyof CycleTimings, true);
        try {
            const result = await fn();
            return result;
        } finally {
            this.updateTimings(`${phase}EndTime` as keyof CycleTimings, false);
            console.log(`Finished phase: ${phase} with status: ${Status[this.status]}`);
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
    CycleTimings 
};