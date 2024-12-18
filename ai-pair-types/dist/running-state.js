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
        this._currentCycle = null;
        this._changeListeners = [];
        this._listeners = [];
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
    get currentCycle() {
        return this._generationCycleDetails.length > 0
            ? this._generationCycleDetails[this._generationCycleDetails.length - 1]
            : null;
    }
    get currentCycleIndex() {
        return this._currentCycleIndex;
    }
    get status() {
        if (!this.currentCycle) {
            return Status.IDLE;
        }
        return this.currentCycle.status;
    }
    get generationCycleDetails() {
        return this._generationCycleDetails;
    }
    get testResults() {
        return this._testResults;
    }
    set testResults(value) {
        this._testResults = value;
        if (this._currentCycleIndex >= 0) {
            this._generationCycleDetails[this._currentCycleIndex].finalTestResults = value;
        }
        this.notifyListeners();
    }
    get buildState() {
        return this._buildState;
    }
    set buildState(value) {
        this._buildState = value;
        if (this._currentCycleIndex >= 0) {
            this._generationCycleDetails[this._currentCycleIndex].initialBuildState = value;
        }
        this.notifyListeners();
    }
    get codeChanges() {
        return this._codeChanges;
    }
    set codeChanges(value) {
        this._codeChanges = value;
        if (this._currentCycleIndex >= 0) {
            this._generationCycleDetails[this._currentCycleIndex].codeChanges = value;
        }
        this.notifyListeners();
    }
    get cycleStartTime() {
        return this._cycleStartTime;
    }
    set cycleStartTime(value) {
        this._cycleStartTime = value;
        this.notifyListeners();
    }
    updateState(updater) {
        updater(this);
        this.notifyChangeListeners();
    }
    resetState() {
        this.updateState(state => {
            state._generationCycleDetails = [];
            state._currentCycle = null;
        });
    }
    startNewCycle(model) {
        this.updateState(state => {
            const newCycle = {
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
    updateCurrentCycleStatus(status) {
        console.log(`Updating cycle status from ${Status[this.status]} to ${Status[status]}`);
        this.updateState(state => {
            if (state._currentCycle) {
                state._currentCycle.status = status;
                this.notifyListeners();
            }
        });
    }
    endCurrentCycle() {
        this.updateState(state => {
            if (state._currentCycle) {
                state._currentCycle.timings.cycleEndTime = Date.now();
            }
        });
    }
    updateTimings(phase, isStart) {
        if (this._currentCycleIndex >= 0) {
            const timingKey = isStart ? phase : phase.replace('Start', 'End');
            this._generationCycleDetails[this._currentCycleIndex].timings[timingKey] = new Date().getTime();
            this.notifyListeners();
        }
    }
    notifyChangeListeners() {
        this._changeListeners.forEach(listener => listener(this));
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
    reset() {
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
    get accumulatedHints() {
        return this._accumulatedHints;
    }
    async withPhase(status, phase, fn) {
        console.log(`Starting phase: ${phase} with status: ${Status[status]}`);
        this.updateCurrentCycleStatus(status);
        this.updateTimings(`${phase}StartTime`, true);
        try {
            const result = await fn();
            return result;
        }
        finally {
            this.updateTimings(`${phase}EndTime`, false);
            console.log(`Finished phase: ${phase} with status: ${Status[this.status]}`);
        }
    }
}
exports.RunningState = RunningState;
