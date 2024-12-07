import { spawn } from 'child_process';
import { Config } from '../types/config';
import { RunningState, TestResults, CodeFile } from '../types/running-state';
import { logger } from './logger';
import * as fs from 'fs';
import * as path from 'path';
import * as xml2js from 'xml2js';

interface BuildCommand {
    command: string;
    args: string[];
}

function getBuildCommand(config: Config): BuildCommand {
    switch (config.extension) {
        case '.ts':
        case '.js':
            return {
                command: 'npm',
                args: ['run', 'build']
            };
        case '.java':
            if (fs.existsSync(path.join(config.projectRoot, 'build.gradle.kts'))) {
                return {
                    command: process.platform === 'win32' ? 'gradlew.bat' : './gradlew',
                    args: ['clean', 'build', '-x', 'test', '--stacktrace']
                };
            } else if (fs.existsSync(path.join(config.projectRoot, 'build.gradle'))) {
                return {
                    command: process.platform === 'win32' ? 'gradlew.bat' : './gradlew',
                    args: ['clean', 'build', '-x', 'test', '--stacktrace']
                };
            } else {
                return {
                    command: 'mvn',
                    args: ['compile']
                };
            }
        default:
            throw new Error(`Unsupported project type: ${config.extension}`);
    }
}

function getTestCommand(config: Config): BuildCommand {
    switch (config.extension) {
        case '.ts':
        case '.js':
            return {
                command: 'npm',
                args: ['test']
            };
        case '.java':
            if (fs.existsSync(path.join(config.projectRoot, 'build.gradle.kts')) || 
                fs.existsSync(path.join(config.projectRoot, 'build.gradle'))) {
                return {
                    command: process.platform === 'win32' ? 'gradlew.bat' : './gradlew',
                    args: ['test', '--stacktrace']
                };
            } else {
                return {
                    command: 'mvn',
                    args: ['test']
                };
            }
        default:
            throw new Error(`Unsupported project type: ${config.extension}`);
    }
}

export async function buildProject(config: Config, runningState: RunningState, isFinalBuild: boolean = false): Promise<boolean> {
    try {
        const { command, args } = getBuildCommand(config);
        let output = '';

        const child = spawn(command, args, {
            cwd: config.projectRoot,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        child.stdout.on('data', (data: Buffer) => {
            output += data.toString();
        });

        child.stderr.on('data', (data: Buffer) => {
            output += data.toString();
        });

        const success = await new Promise<boolean>((resolve) => {
            child.on('close', (code: number) => {
                const cycleDir = path.join(config.tmpDir, `generationCycle${runningState.currentCycle?.cycleNumber || 0}`);
                if (!fs.existsSync(cycleDir)) {
                    fs.mkdirSync(cycleDir, { recursive: true });
                }
                const logFile = path.join(cycleDir, isFinalBuild ? 'final_build_result.log' : 'initial_build_result.log');
                fs.writeFileSync(logFile, output);

                const buildState = {
                    compiledSuccessfully: code === 0,
                    compilerOutput: output,
                    compilerErrors: [],
                    lastCompileTime: new Date(),
                    compilationErrors: code === 0 ? [] : [output],
                    logFile
                };

                if (runningState.currentCycle) {
                    if (isFinalBuild) {
                        runningState.currentCycle.finalBuildState = buildState;
                    } else {
                        runningState.currentCycle.initialBuildState = buildState;
                    }
                }
                runningState.buildState = buildState;
                resolve(code === 0);
            });
        });

        return success;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Build failed: ' + errorMessage);
        const buildState = {
            compiledSuccessfully: false,
            compilerOutput: errorMessage,
            compilerErrors: [],
            lastCompileTime: new Date(),
            compilationErrors: [errorMessage],
            logFile: ''
        };

        if (runningState.currentCycle) {
            if (isFinalBuild) {
                runningState.currentCycle.finalBuildState = buildState;
            } else {
                runningState.currentCycle.initialBuildState = buildState;
            }
        }
        runningState.buildState = buildState;

        return false;
    }
}

export async function runTests(config: Config, runningState: RunningState, isFinalResults: boolean = false): Promise<void> {
    try {
        const { command, args } = getTestCommand(config);
        let output = '';

        const child = spawn(command, args, {
            cwd: config.projectRoot,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        child.stdout.on('data', (data: Buffer) => {
            output += data.toString();
        });

        child.stderr.on('data', (data: Buffer) => {
            output += data.toString();
        });

        await new Promise<void>((resolve) => {
            child.on('close', async () => {
                // Save test output to log file
                const cycleDir = path.join(config.tmpDir, `generationCycle${runningState.currentCycle?.cycleNumber || 0}`);
                if (!fs.existsSync(cycleDir)) {
                    fs.mkdirSync(cycleDir, { recursive: true });
                }
                const logFile = path.join(cycleDir, isFinalResults ? 'after-tests.log' : 'before-tests.log');
                fs.writeFileSync(logFile, output);

                // Process test results
                const results = await processTestResults(config);
                if (runningState.currentCycle) {
                    if (isFinalResults) {
                        runningState.currentCycle.finalTestResults = results;
                    } else {
                        runningState.currentCycle.initialTestResults = results;
                    }
                }
                runningState.testResults = results;
                resolve();
            });
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Tests failed: ' + errorMessage);
        const failedResults = {
            testsPassed: false,
            passedTests: [],
            failedTests: [],
            erroredTests: [errorMessage],
            lastRunTime: new Date()
        };
        if (runningState.currentCycle) {
            if (isFinalResults) {
                runningState.currentCycle.finalTestResults = failedResults;
            } else {
                runningState.currentCycle.initialTestResults = failedResults;
            }
        }
        runningState.testResults = failedResults;
    }
}

export async function buildAndRunTests(config: Config, runningState: RunningState): Promise<void> {
    // First run the build
    const buildSuccess = await buildProject(config, runningState, false);
    if (!buildSuccess) {
        logger.debug('Build failed, skipping tests');
        return;
    }

    // If build succeeds, run the tests
    await runTests(config, runningState);
}

export function collectTestFiles(force: boolean, config: Config): CodeFile[] {
    const testFiles: CodeFile[] = [];

    if (!fs.existsSync(config.testDir)) {
        logger.warn(`Test directory not found: ${config.testDir}`);
        return testFiles;
    }

    function readTestFiles(dir: string): void {
        const items = fs.readdirSync(dir);
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                readTestFiles(fullPath);
            } else if (item.endsWith(config.extension)) {
                const content = fs.readFileSync(fullPath, 'utf-8');
                testFiles.push({ path: fullPath, content });
            }
        }
    }

    readTestFiles(config.testDir);
    return testFiles;
}

interface XmlTestCase {
    $: {
        name: string;
        classname: string;
    };
    failure?: unknown;
    error?: unknown;
}

export function processTestResults(config: Config): TestResults {
    const testReportPath = path.join(config.projectRoot, 'build', 'test-results', 'test');
    const results: TestResults = {
        testsPassed: true,
        passedTests: [],
        failedTests: [],
        erroredTests: [],
        lastRunTime: new Date()
    };

    if (!fs.existsSync(testReportPath)) {
        logger.warn('Test report directory not found');
        return results;
    }

    const files = fs.readdirSync(testReportPath);
    files.forEach(file => {
        if (!file.endsWith('.xml')) return;

        const content = fs.readFileSync(path.join(testReportPath, file), 'utf-8');
        const parser = new xml2js.Parser();
        parser.parseString(content, (err, result) => {
            if (err) {
                logger.error(`Failed to parse test results: ${err}`);
                return;
            }

            const testsuite = result.testsuite;
            const testcases = testsuite.testcase || [];

            testcases.forEach((testcase: XmlTestCase) => {
                const testName = `${testcase.$.name} - ${testcase.$.classname}`;
                if (testcase.failure || testcase.error) {
                    results.testsPassed = false;
                    results.failedTests.push(testName);
                } else {
                    results.passedTests.push(testName);
                }
            });
        });
    });

    return results;
}