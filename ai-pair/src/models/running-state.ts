interface CodeChangeSummary {
    lastChangeTime: Date | null;
    newFiles: string[];
    deletedFiles: string[];
    modifiedFiles: string[];
    buildFiles: string[];
}

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

interface CodeFile {
    path: string;
    content: string;
}

class RunningState {
    accumulatedHints: string[];
    generationCycles: number;
    lastRunOutput: string; // Replace 'any' with a more specific type if possible
    testResults: TestResults;
    buildState: BuildState;
    codeChanges: CodeChangeSummary;
    cycleStartTime: Date | null;

    constructor() {
        this.accumulatedHints = [];
        this.generationCycles = 0;
        this.lastRunOutput = "";
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
        this.lastRunOutput = "";
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
        this.lastRunOutput = "";
    }
}

export { RunningState, CodeFile, CodeChangeSummary };