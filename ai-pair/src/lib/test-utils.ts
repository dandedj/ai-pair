import fs from 'fs';
import path from 'path';
import xml2js from 'xml2js';
import { execSync } from 'child_process';
import { ensureDirectoryExists, clearFile } from './file-utils';
import { logger } from './logger';
import { Config } from '../models/config';
import { RunningState } from '../models/running-state';
import { CodeFile } from '../ai-pair';
import { collectFilesWithExtension } from './file-utils';

function runInitialTests(config: Config, runningState: RunningState, force: boolean): boolean {
    logger.debug('Running initial tests');
    const testsPassed = runTests(config, runningState);
    if (!force && testsPassed) {
        logger.info('Initial tests passed, no changes needed.');
    }
    return testsPassed;
}

function runFinalTests(config: Config, runningState: RunningState): boolean {
    logger.debug('Running final tests after code generation');
    return runTests(config, runningState);
}

function runTests(config: Config, runningState: RunningState): boolean {
    ensureDirectoryExists(config.tmpDir);

    const testOutputPath = path.join(config.tmpDir, 'test_output.txt');
    clearFile(testOutputPath);

    runningState.resetCycleState();

    try {
        logger.debug('Running tests with Gradle using command: gradle clean test');
        const result = execSync('gradle clean test', { cwd: config.projectRoot });
        runningState.lastRunOutput = result.toString();

        // write the output to the test output file
        logger.debug('Writing test output to file: ', testOutputPath);
        fs.writeFileSync(testOutputPath, result.toString());

        appendXmlTestResults(config, runningState);

        logger.debug('Compilation and tests passed successfully');
        runningState.buildState.compiledSuccessfully = true;
        runningState.buildState.lastCompileTime = new Date();
        runningState.testResults.lastRunTime = new Date();
        runningState.testResults.testsPassed = true;

        return runningState.testResults.testsPassed;
    } catch (error: any) {
        console.log('Compilation and tests failed');
        const stdout = error.stdout ? error.stdout.toString() : '';
        const stderr = error.stderr ? error.stderr.toString() : '';
        logger.debug('stdout: ', stdout);
        logger.debug('stderr: ', stderr);
        fs.writeFileSync(testOutputPath, stdout + stderr);
        runningState.lastRunOutput = stdout + stderr;
        appendXmlTestResults(config, runningState);

        // TODO: this needs to change depending on the project type
        if (runningState.lastRunOutput.includes('Compilation failed')) {
            logger.error('Compilation failed. Tests not run.');
            runningState.buildState.compiledSuccessfully = false;
        } else {
            runningState.buildState.compiledSuccessfully = true;
        }

        return false;
    }
}

function appendXmlTestResults(config: Config, runningState: RunningState): void {
    const testResultsDir = path.resolve(config.projectRoot, 'build/test-results/test');
    const testOutputPath = path.join(config.tmpDir, 'test_output.txt');

    const parser = new xml2js.Parser();

    console.log('Processing test results from directory: ', testResultsDir);

    if (fs.existsSync(testResultsDir)) {
        fs.readdirSync(testResultsDir).forEach(file => {
            if (file.endsWith('.xml')) {
                const filePath = path.join(testResultsDir, file);
                const xmlContent = fs.readFileSync(filePath, 'utf-8');
                parser.parseString(xmlContent, (err: any, result: any) => {
                    if (err) {
                        logger.error(`Error parsing XML file ${file}:`, err);
                    } else {
                        const testCases = result.testsuite.testcase || [];
                        testCases.forEach((testCase: any) => {
                            const { name: testName, classname: className } = testCase.$;
                            const failure = testCase.failure ? testCase.failure[0]._ : null;
                            const error = testCase.error ? testCase.error[0]._ : null;
                            const status = failure ? 'FAILED' : error ? 'ERROR' : 'PASSED';
                            const message = failure || error || 'Test passed successfully.';
                            const output = `Test: ${className}.${testName} - ${status}\n${message}\n\n`;
                            console.log('Appending test output to file: ', testOutputPath);
                            fs.appendFileSync(testOutputPath, output);

                            // Update RunningState
                            if (failure) {
                                runningState.testResults.testsPassed = false;
                                runningState.testResults.failedTests.push(`${className}.${testName}`);
                            } else if (error) {
                                runningState.testResults.testsPassed = false;
                                runningState.testResults.erroredTests.push(`${className}.${testName}`);
                            } else {
                                runningState.testResults.passedTests.push(`${className}.${testName}`);
                            }
                        });
                    }
                });
            }
        });
    }
}

function getTestOutput(config: Config): string {
    const testOutputPath = path.join(config.tmpDir, 'test_output.txt');
    if (fs.existsSync(testOutputPath)) {
        return fs.readFileSync(testOutputPath, 'utf-8');
    }
    return 'No test output available.';
}

function extractClassNameFromTest(test: string): string {
    let className = '';

    if (test.includes('(')) {
        const match = test.match(/\(([^)]+)\)/);
        className = match ? match[1] : test;
    } else {
        className = test;
    }

    const parts = className.split('.');
    const lastPart = parts[parts.length - 1];
    if (lastPart && lastPart[0] === lastPart[0].toLowerCase()) {
        className = parts.slice(0, -1).join('.');
    }

    return className;
}

function collectTestFiles(force: boolean, config: Config, runningState: RunningState): CodeFile[] {
    let testFiles: CodeFile[] = [];

    if (runningState.buildState.compiledSuccessfully === false) {
        testFiles = collectFilesWithExtension(
            [config.testDir],
            config.extension
        );
    } else if (!runningState.testResults.testsPassed) {
        testFiles = runningState.testResults.failedTests.map((test) => {
            const className = extractClassNameFromTest(test);
            const testFilePath = path.join(
                config.testDir,
                className.replace(/\./g, '/') + config.extension
            );
            logger.debug(`Constructed test file path: ${testFilePath}`);

            return {
                path: testFilePath,
                content: fs.existsSync(testFilePath)
                    ? fs.readFileSync(testFilePath, 'utf-8')
                    : '',
            };
        });
    } else if (force) {
        testFiles = collectFilesWithExtension(
            [path.join(config.testDir)],
            config.extension
        );
    }

    return testFiles;
}

export { runInitialTests, runFinalTests, runTests, appendXmlTestResults, extractClassNameFromTest, getTestOutput, collectTestFiles };