const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const { execSync } = require('child_process');
const { ensureDirectoryExists, clearFile } = require('./FileUtils');
const logger = require('./logger');

/**
 * Runs unit tests using Gradle and captures the output.
 * @param {string} projectRoot - The root directory of the project.
 * @param {string} tmpDir - The temporary directory for test outputs.
 * @returns {boolean} - True if tests passed; otherwise, false.
 */
function runTests(projectRoot, tmpDir) {
    ensureDirectoryExists(tmpDir);
    const testOutputPath = path.join(tmpDir, 'test_output.txt');
    clearFile(testOutputPath);

    try {
        const result = execSync('gradle --warning-mode all clean test', { cwd: projectRoot });
        fs.writeFileSync(testOutputPath, result.toString());
        appendXmlTestResults(projectRoot, tmpDir);
        summarizeAllTests(projectRoot, tmpDir);
        return true;
    } catch (error) {
        const stdout = error.stdout ? error.stdout.toString() : '';
        const stderr = error.stderr ? error.stderr.toString() : '';
        fs.writeFileSync(testOutputPath, stdout + stderr);
        appendXmlTestResults(projectRoot, tmpDir);
        return false;
    }
}

/**
 * Appends XML test results to the test output file.
 * @param {string} projectRoot - The root directory of the project.
 * @param {string} tmpDir - The temporary directory for test outputs.
 */
function appendXmlTestResults(projectRoot, tmpDir) {
    const testResultsDir = path.resolve(projectRoot, 'build/test-results/test');
    const testOutputPath = path.join(tmpDir, 'test_output.txt');
    const parser = new xml2js.Parser();

    if (fs.existsSync(testResultsDir)) {
        fs.readdirSync(testResultsDir).forEach(file => {
            if (file.endsWith('.xml')) {
                const filePath = path.join(testResultsDir, file);
                const xmlContent = fs.readFileSync(filePath, 'utf-8');
                parser.parseString(xmlContent, (err, result) => {
                    if (err) {
                        console.error(`Error parsing XML file ${file}:`, err);
                    } else {
                        const testCases = result.testsuite.testcase || [];
                        testCases.forEach(testCase => {
                            const { name: testName, classname: className } = testCase.$;
                            const failure = testCase.failure ? testCase.failure[0]._ : null;
                            const error = testCase.error ? testCase.error[0]._ : null;
                            const status = failure ? 'FAILED' : error ? 'ERROR' : 'PASSED';
                            const message = failure || error || 'Test passed successfully.';
                            const output = `Test: ${className}.${testName} - ${status}\n${message}\n\n`;
                            fs.appendFileSync(testOutputPath, output);
                        });
                    }
                });
            }
        });
    }
}

/**
 * Summarizes all test results by parsing the XML reports.
 * @param {string} projectRoot - The root directory of the project.
 * @param {string} tmpDir - The temporary directory for test outputs.
 */
function summarizeAllTests(projectRoot, tmpDir) {
    const testResultsDir = path.resolve(projectRoot, 'build/test-results/test');
    const parser = new xml2js.Parser();
    const testSummary = {
        passed: [],
        failed: [],
        errored: []
    };

    if (fs.existsSync(testResultsDir)) {
        fs.readdirSync(testResultsDir).forEach(file => {
            if (file.endsWith('.xml')) {
                const filePath = path.join(testResultsDir, file);
                const xmlContent = fs.readFileSync(filePath, 'utf-8');
                parser.parseString(xmlContent, (err, result) => {
                    if (err) {
                        logger.error(`Error parsing XML file ${file}:`, err);
                    } else {
                        const testCases = result.testsuite.testcase || [];
                        testCases.forEach(testCase => {
                            const { name: testName, classname: className } = testCase.$;
                            const failure = testCase.failure ? testCase.failure[0]._ : null;
                            const error = testCase.error ? testCase.error[0]._ : null;
                            if (failure) {
                                testSummary.failed.push(`${className}.${testName}`);
                            } else if (error) {
                                testSummary.errored.push(`${className}.${testName}`);
                            } else {
                                testSummary.passed.push(`${className}.${testName}`);
                            }
                        });
                    }
                });
            }
        });
    }

    logger.debug('Test Summary:');
    if (testSummary.passed.length > 0) {
        logger.debug('Passed Tests:');
        testSummary.passed.forEach(test => logger.debug(`- ${test}`));
    }
    if (testSummary.failed.length > 0) {
        logger.debug('Failed Tests:');
        testSummary.failed.forEach(test => logger.debug(`- ${test}`));
    }
    if (testSummary.errored.length > 0) {
        logger.debug('Errored Tests:');
        testSummary.errored.forEach(test => logger.debug(`- ${test}`));
    }

    // output the test summary to the console with counts only
    console.log(`Passed: ${testSummary.passed.length}      Failed: ${testSummary.failed.length}         Errored: ${testSummary.errored.length}`);

    // return the set of failed tests class names
    return testSummary.failed;
    
}

module.exports = {
    runTests,
    appendXmlTestResults,
    summarizeAllTests,
}; 