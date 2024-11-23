const fs = require('fs');
const path = require('path');
const xml2js = require('xml2js');
const { execSync } = require('child_process');
const { ensureDirectoryExists, clearFile } = require('./file-utils');
const { logger } = require('./logger');

class TestRunner {
  constructor() {
  }

  runInitialTests(config, runningState, force) {
    logger.debug('Running initial tests');
    const testResults = this.runTests(config, runningState);
    if (!force && runningState.testsPassed) {
      logger.info('Initial tests passed, no changes needed.');
    }
    return testResults;
  }

  runFinalTests(config, runningState) {
    logger.debug('Running final tests after code generation');
    return this.runTests(config, runningState);
  }

  runTests(config, runningState) {
    ensureDirectoryExists(config.tmpDir);

    const testOutputPath = path.join(config.tmpDir, 'test_output.txt');
    clearFile(testOutputPath);

    runningState.resetCycleState();

    try {
      logger.debug('Running tests with Gradle using command: gradle clean test');
      const result = execSync('gradle clean test', { cwd: config.projectRoot });
      runningState.lastRunOutput = result.toString();
      fs.writeFileSync(testOutputPath, result.toString());

      this.appendXmlTestResults(config, runningState);
      runningState.buildState.compiledSuccessfully = true;
      runningState.buildState.lastCompileTime = new Date();
      
      return runningState.testsPassed;
    } catch (error) {
      const stdout = error.stdout ? error.stdout.toString() : '';
      const stderr = error.stderr ? error.stderr.toString() : '';
      fs.writeFileSync(testOutputPath, stdout + stderr);
      runningState.lastRunOutput = stdout + stderr;
      this.appendXmlTestResults(config, runningState);

      if (runningState.lastRunOutput.includes('Compilation failed')) {
        logger.error('Compilation failed. Tests not run.');
        runningState.buildState.compiledSuccessfully = false;
      } else {
        runningState.buildState.compiledSuccessfully = true;
      }

      return false;
    }
  }

  appendXmlTestResults(config, runningState) {
    const testResultsDir = path.resolve(config.projectRoot, 'build/test-results/test');
    const testOutputPath = path.join(config.tmpDir, 'test_output.txt');

    const parser = new xml2js.Parser();

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
                const status = failure ? 'FAILED' : error ? 'ERROR' : 'PASSED';
                const message = failure || error || 'Test passed successfully.';
                const output = `Test: ${className}.${testName} - ${status}\n${message}\n\n`;
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

  getTestOutput(config) {
    const testOutputPath = path.join(config.tmpDir, 'test_output.txt');
    if (fs.existsSync(testOutputPath)) {
      return fs.readFileSync(testOutputPath, 'utf-8');
    }
    return 'No test output available.';
  }
}

module.exports = TestRunner; 