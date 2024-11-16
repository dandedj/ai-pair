class RunningState {
    constructor() {
        this.accumulatedHints = [];
        this.generationCycles = 0;
        this.changesPerCycle = [];
        this.testResults = {
            totalTests: 0,
            failedTests: 0,
            successfulTests: 0,
            lastRun: null,
        };
        this.buildState = {
            compiledSuccessfully: false,
            lastCompileTime: null,
        };
        this.cycleStartTime = null;
    }

    // Methods to update the state
    addHint(hint) {
        this.accumulatedHints.push(hint);
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
        this.testResults = {
            totalTests: 0,
            failedTests: 0,
            successfulTests: 0,
        };
        this.buildState = {
            compiledSuccessfully: false,
            lastCompileTime: null,
        };
        this.cycleStartTime = null;
    }
}

module.exports = RunningState; 