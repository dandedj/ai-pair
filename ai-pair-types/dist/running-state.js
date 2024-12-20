"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Status = exports.RunningState = exports.getStatusDisplay = void 0;
var Status;
(function (Status) {
    Status[Status["IDLE"] = 0] = "IDLE";
    Status[Status["BUILDING"] = 1] = "BUILDING";
    Status[Status["TESTING"] = 2] = "TESTING";
    Status[Status["GENERATING_CODE"] = 3] = "GENERATING_CODE";
    Status[Status["APPLYING_CHANGES"] = 4] = "APPLYING_CHANGES";
    Status[Status["REBUILDING"] = 5] = "REBUILDING";
    Status[Status["RETESTING"] = 6] = "RETESTING";
    Status[Status["COMPLETED"] = 7] = "COMPLETED";
})(Status || (Status = {}));
exports.Status = Status;
function getStatusDisplay(status) {
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
exports.getStatusDisplay = getStatusDisplay;
class RunningState {
    constructor() {
        this._generationCycleDetails = [];
        this._listeners = [];
        this._accumulatedHints = [];
        this._generationCycleDetails = [];
        this._accumulatedHints = [];
        this._listeners = [];
    }
    get currentCycle() {
        return this._generationCycleDetails.length > 0
            ? this._generationCycleDetails[this._generationCycleDetails.length - 1]
            : null;
    }
    get status() {
        return this.currentCycle?.status ?? Status.IDLE;
    }
    get generationCycleDetails() {
        return this._generationCycleDetails;
    }
    get testResults() {
        return this.currentCycle?.finalTestResults ?? {
            testsPassed: false,
            failedTests: [],
            passedTests: [],
            erroredTests: [],
            testOutput: "",
            testsCompiledSuccessfully: false
        };
    }
    set testResults(value) {
        if (this.currentCycle) {
            this.currentCycle.finalTestResults = value;
            this.notifyListeners();
        }
    }
    get buildState() {
        return this.currentCycle?.finalBuildState ?? {
            compiledSuccessfully: false,
            compilerOutput: ""
        };
    }
    set buildState(value) {
        if (this.currentCycle) {
            this.currentCycle.finalBuildState = value;
            this.notifyListeners();
        }
    }
    get codeChanges() {
        return this.currentCycle?.codeChanges ?? {
            lastChangeTime: null,
            newFiles: [],
            deletedFiles: [],
            modifiedFiles: [],
            buildFiles: [],
            testFiles: []
        };
    }
    set codeChanges(value) {
        if (this.currentCycle) {
            this.currentCycle.codeChanges = value;
            this.notifyListeners();
        }
    }
    startNewCycle(model) {
        const newCycle = {
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
    updateCurrentCycleStatus(status) {
        if (this.currentCycle) {
            this.currentCycle.status = status;
            this.notifyListeners();
        }
    }
    endCurrentCycle() {
        if (this.currentCycle) {
            this.currentCycle.timings.cycleEndTime = Date.now();
            this.notifyListeners();
        }
    }
    notifyListeners() {
        this._listeners.forEach(listener => listener(this));
    }
    onChange(listener) {
        this._listeners.push(listener);
        return () => {
            this._listeners = this._listeners.filter(l => l !== listener);
        };
    }
    addHint(hint) {
        if (hint) {
            this._accumulatedHints.push(hint);
            this.notifyListeners();
        }
    }
    clearHints() {
        this._accumulatedHints = [];
        this.notifyListeners();
    }
    resetCycleState() {
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
    reset() {
        this._generationCycleDetails = [];
        this._accumulatedHints = [];
        this.notifyListeners();
    }
    get accumulatedHints() {
        return this._accumulatedHints;
    }
    async withPhase(status, fn) {
        console.log(`Starting phase with status: ${Status[status]}`);
        this.updateCurrentCycleStatus(status);
        if (this.currentCycle) {
            const phaseTiming = {
                status,
                startTime: Date.now(),
                endTime: null
            };
            this.currentCycle.timings.phaseTimings.push(phaseTiming);
        }
        try {
            const result = await fn();
            return result;
        }
        finally {
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
exports.RunningState = RunningState;
