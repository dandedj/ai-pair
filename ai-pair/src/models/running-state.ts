interface TestResults {
    testsPassed: boolean;
    totalTests: number;
    failedTests: string[];
    passedTests: string[];
    erroredTests: string[];
    lastRunTime: Date | null;
}

interface BuildState {
    compiledSuccessfully: boolean;
    lastCompileTime: Date | null;
}

interface CodeChanges {
    lastChangeTime: Date | null;
    newFiles: string[];
    deletedFiles: string[];
    modifiedFiles: string[];
    buildFiles: string[];
}

class RunningState {
    accumulatedHints: string[];
    generationCycles: number;
    changesPerCycle: any[]; // Replace 'any' with a more specific type if possible
    lastRunOutput: any; // Replace 'any' with a more specific type if possible
    testResults: TestResults;
    buildState: BuildState;
    codeChanges: CodeChanges;
    cycleStartTime: Date | null;

    constructor() {
        this.accumulatedHints = [];
        this.generationCycles = 0;
        this.changesPerCycle = [];
        this.lastRunOutput = null;
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

    addHint(hint: string): void {
        if (hint) {
            this.accumulatedHints.push(hint);
        }
    }

    clearHints(): void {
        this.accumulatedHints = [];
    }

    incrementGenerationCycles(): void {
        this.generationCycles += 1;
    }

    setCycleStartTime(): void {
        this.cycleStartTime = new Date();
    }

    resetState(): void {
        this.accumulatedHints = [];
        this.generationCycles = 0;
        this.changesPerCycle = [];
        this.lastRunOutput = null;
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

    resetCycleState(): void {
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

export default RunningState; 