class RunningState {
    constructor() {
        this.accumulatedHints = [];
        this.generationCycles = 0;
        this.changesPerCycle = [];
        this.lastRunOutput = null,
        this.testResults = {
            testsPassed: false,
            totalTests: 0,
            failedTests: [],
            passedTests: [],
            erroredTests: [],
            lastRunTime: null,
        };
        this.buildState = {
            compiledSuccessfully: false,
            lastCompileTime: null,
        };

        this.codeChanges = {
            lastChangeTime: null,
            newFiles: [],
            deletedFiles: [],
            modifiedFiles: [],
            buildFiles: [],
        };
        
        this.cycleStartTime = null;
    }

    // Methods to update the state
    addHint(hint) {
        if (hint) {
            this.accumulatedHints.push(hint);
        }
    }

    clearHints() {
        this.accumulatedHints = [];
    }

    incrementGenerationCycles() {
        this.generationCycles += 1;
    }

    setCycleStartTime() {
        this.cycleStartTime = new Date();
    }

    resetState() {
        this.accumulatedHints = [];
        this.generationCycles = 0;
        this.changesPerCycle = [];
        this.lastRunOutput = null,
        this.testResults = {
            testsPassed: false,
            totalTests: 0,
            failedTests: [],
            passedTests: [],
            erroredTests: [],
            lastRunTime: null,
        };
        this.buildState = {
            compiledSuccessfully: false,
            lastCompileTime: null,
        };

        this.codeChanges = {
            lastChangeTime: null,
            newFiles: [],
            deletedFiles: [],
            modifiedFiles: [],
            buildFiles: [],
        };
        this.cycleStartTime = null;
    }

    // reset the current cycle state
    resetCycleState() {
        this.testResults = {
            testsPassed: false,
            totalTests: 0,
            failedTests: [],
            passedTests: [],
            erroredTests: [],
            lastRunTime: null,
        };
        this.buildState = {
            compiledSuccessfully: false,
            lastCompileTime: null,
        };
        this.lastRunOutput = null;
    }
}

module.exports = RunningState; 