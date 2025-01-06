import { spawn } from 'child_process';
import { Config, GenerationCycleDetails } from 'ai-pair-types';
import { RunningState, TestResults, CodeFile } from 'ai-pair-types';
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
                    args: ['clean', 'build', '-x', 'test']
                };
            } else if (fs.existsSync(path.join(config.projectRoot, 'build.gradle'))) {
                return {
                    command: process.platform === 'win32' ? 'gradlew.bat' : './gradlew',
                    args: ['clean', 'build', '-x', 'test']
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
                    args: ['test']
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

export async function buildProject(config: Config, currentCycle: GenerationCycleDetails | null, isFinalBuild: boolean = false): Promise<boolean> {
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
                const cycleDir = path.join(config.tmpDir, `generationCycle${currentCycle?.cycleNumber || 0}`);
                if (!fs.existsSync(cycleDir)) {
                    fs.mkdirSync(cycleDir, { recursive: true });
                }
                const logFile = path.join(cycleDir, isFinalBuild ? 'build_final.log' : 'build_initial.log');
                fs.writeFileSync(logFile, output);

                const buildState = {
                    compiledSuccessfully: !output.includes('BUILD FAILED'),
                    compilerOutput: output,
                    lastCompileTime: new Date()
                };

                if (currentCycle) {
                    if (isFinalBuild) {
                        currentCycle.finalBuildState = buildState;
                    } else {
                        currentCycle.initialBuildState = buildState;
                    }
                }
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
            lastCompileTime: new Date()
        };

        if (currentCycle) {
            if (isFinalBuild) {
                currentCycle.finalBuildState = buildState;
            } else {
                currentCycle.initialBuildState = buildState;
            }
        }

        return false;
    }
}

export async function runTests(config: Config, currentCycle: GenerationCycleDetails | null, isFinalResults: boolean = false): Promise<void> {
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
                const cycleDir = path.join(config.tmpDir, `generationCycle${currentCycle?.cycleNumber || 0}`);
                if (!fs.existsSync(cycleDir)) {
                    fs.mkdirSync(cycleDir, { recursive: true });
                }
                const logFile = path.join(cycleDir, isFinalResults ? 'test_final.log' : 'test_initial.log');
                fs.writeFileSync(logFile, output);

                // Process test results
                const results = await processTestResults(config);
                // Add the test output to the results
                results.testOutput = output;

                const testBuildFailure = output.includes('Execution failed for task \':compileTestJava\'');
                if (testBuildFailure) {
                    results.testsPassed = false;
                }
                results.testsCompiledSuccessfully = !testBuildFailure;
                
                if (currentCycle) {
                    if (isFinalResults) {
                        currentCycle.finalTestResults = results;
                    } else {
                        currentCycle.initialTestResults = results;
                    }
                }
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
            testOutput: errorMessage,
            testsCompiledSuccessfully: false
        };
        if (currentCycle) {
            if (isFinalResults) {
                currentCycle.finalTestResults = failedResults;
            } else {
                currentCycle.initialTestResults = failedResults;
            }
        }
    }
}

export async function buildAndRunTests(config: Config, runningState: RunningState): Promise<void> {
    // First run the build
    const buildSuccess = await buildProject(config, runningState.currentCycle, false);
    if (!buildSuccess) {
        logger.debug('Build failed, skipping tests');
        return;
    }

    // If build succeeds, run the tests
    await runTests(config, runningState.currentCycle);
}

export function collectTestFiles(force: boolean, config: Config): CodeFile[] {
    const testFiles: CodeFile[] = [];

    if (!fs.existsSync(config.testSourceDir)) {
        logger.warn(`Test source directory not found: ${config.testSourceDir}`);
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

    readTestFiles(config.testSourceDir);
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
    const results: TestResults = {
        testsPassed: false,
        passedTests: [],
        failedTests: [],
        erroredTests: [],
        testOutput: "",
        testsCompiledSuccessfully: true
    };

    if (!fs.existsSync(config.testResultsDir)) {
        logger.warn('Test results directory not found');
        return results;
    }

    const files = fs.readdirSync(config.testResultsDir);
    files.forEach(file => {
        if (!file.endsWith('.xml')) return;

        const content = fs.readFileSync(path.join(config.testResultsDir, file), 'utf-8');
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