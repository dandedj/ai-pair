require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline-sync');
const xml2js = require('xml2js');
const ChatGPTClient = require('./ChatGPTClient');

// Function to run unit tests
function runTests() {
    const tmpDir = path.resolve(__dirname, '../build/tmp');
    ensureDirectoryExists(tmpDir);
    
    // Clear the test_output.txt at the start of each run
    clearFile(path.join(tmpDir, 'test_output.txt'));

    try {
        // Attempt to compile and run tests
        const result = execSync('gradle clean test', { cwd: '../' });
        fs.writeFileSync(path.join(tmpDir, 'test_output.txt'), result.toString());
        appendXmlTestResults(tmpDir);
        return true;
    } catch (error) {
        // Write both stdout and stderr to the test_output.txt
        fs.writeFileSync(path.join(tmpDir, 'test_output.txt'), error.stdout.toString() + error.stderr.toString());
        appendXmlTestResults(tmpDir);
        return false;
    }
}

// Function to append XML test results to test_output.txt
function appendXmlTestResults(tmpDir) {
    const testResultsDir = path.resolve(__dirname, '../build/test-results/test');
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

// Function to collect all Java files and their contents
function collectJavaFiles(dirs) {
    let files = [];
    dirs.forEach(dir => {
        fs.readdirSync(dir).forEach(file => {
            const fullPath = path.join(dir, file);
            if (fs.statSync(fullPath).isDirectory()) {
                files = files.concat(collectJavaFiles([fullPath]));
            } else if (file.endsWith('.java')) {
                const content = fs.readFileSync(fullPath, 'utf-8');
                files.push({ path: fullPath, content });
            }
        });
    });
    return files;
}

// Function to clear a directory
function clearDirectory(dir) {
    if (fs.existsSync(dir)) {
        fs.readdirSync(dir).forEach(file => {
            const filePath = path.join(dir, file);
            if (fs.statSync(filePath).isDirectory()) {
                fs.rmSync(filePath, { recursive: true, force: true });
            } else {
                fs.unlinkSync(filePath);
            }
        });
    }
}

// Function to ensure a directory exists
function ensureDirectoryExists(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Function to clear a file
function clearFile(filePath) {
    fs.writeFileSync(filePath, '');
}

// Function to summarize passed tests
function summarizePassedTests() {
    const testResultsDir = path.resolve(__dirname, '../build/test-results/test');
    const parser = new xml2js.Parser();
    let passedTests = [];

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
                            if (!failure && !error) {
                                passedTests.push(`${className}.${testName}`);
                            }
                        });
                    }
                });
            }
        });
    }

    if (passedTests.length > 0) {
        console.log('Summary of Passed Tests:');
        passedTests.forEach(test => console.log(`- ${test}`));
    }
}

// Main async function
(async () => {
    const chatGPTClient = new ChatGPTClient(process.env.OPENAI_API_KEY);

    // Clear the tmp and versions directories at the start of each run
    clearDirectory(path.resolve(__dirname, '../build/tmp'));
    clearDirectory(path.resolve(__dirname, '../archive/versions'));

    // Collect Java files once and use them throughout
    const javaFiles = collectJavaFiles([
        path.resolve(__dirname, '../src/main/java'),
        path.resolve(__dirname, '../src/test/java')
    ]);

    let accumulatedHints = [];

    while (true) {
        const testsPassed = runTests();

        // Display the test output
        const testOutput = fs.readFileSync(path.resolve(__dirname, '../build/tmp/test_output.txt'), 'utf-8');

        if (testsPassed) {
            console.log('Project compiles and all tests passed! No changes needed.');
            summarizePassedTests();
            break;
        } else {
            console.log('Tests failed.');
            console.log('Test Output:\n', testOutput);

            const filesContent = javaFiles.map(file => `File: ${file.path}\n\n${file.content}`).join('\n\n');
            let prompt = `The following Java unit test is failing:\n\n${testOutput}\n\nHere are the current contents of the Java files:\n\n${filesContent}\n\nPlease provide the updated Java code for the files that will make the test pass. Do not EVER change any test classes (*.test.java). Include the file paths and ensure the response is only Java code without any markdown or explanations. Do not use markdown formatting or code blocks. My project uses gradle with kotlin.`;

            if (accumulatedHints.length > 0) {
                prompt += `\n\nHints for improvement: ${accumulatedHints.join('; ')}`;
            }

            const generatedCode = await chatGPTClient.generateCode(prompt, path.resolve(__dirname, '../build/tmp'));

            const codeBlocks = generatedCode.split(/File: (.+?)\n/).slice(1);

            for (let i = 0; i < codeBlocks.length; i += 2) {
                const filePath = codeBlocks[i].trim();
                const fileContent = codeBlocks[i + 1].trim();
                const fullPath = path.resolve(__dirname, '../', filePath);

                // Check if the file is new or a non-Java file
                const isNewFile = !fs.existsSync(fullPath);
                const isNonJavaFile = !filePath.endsWith('.java');

                if (isNewFile) {
                    console.log(`WARNING: A new file will be added: ${filePath}`);
                    console.log(`Contents of the new file:\n${fileContent}`);
                } else if (isNonJavaFile) {
                    console.log(`WARNING: A non-Java file will be changed: ${filePath}`);
                }

                // Write the proposed changes to a temporary file
                const tempFilePath = path.join(path.resolve(__dirname, '../build/tmp'), path.basename(filePath));
                fs.writeFileSync(tempFilePath, fileContent);

                // Use the diff command to show changes with clear labels
                if (!isNewFile) {
                    console.log(`Changes for ${filePath}:`);
                    try {
                        const diffOutput = execSync(`diff --label "Old Version" ${fullPath} --label "New Version" ${tempFilePath}`).toString();
                        console.log(diffOutput);
                    } catch (diffError) {
                        // diff returns a non-zero exit code if there are differences, which is expected
                        if (diffError.stdout) {
                            console.log(diffError.stdout.toString());
                        } else {
                            console.error(`Error diffing files: ${diffError.message}`);
                        }
                    }
                }
            }

            console.log('Generated code has been proposed.');

            const acceptChanges = readline.question('Do you accept the changes? (yes/no, press Enter to accept): ');

            if (acceptChanges.toLowerCase() === 'yes' || acceptChanges === '') {
                const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
                javaFiles.forEach(file => {
                    const versionDir = path.join(__dirname, '../archive/versions', path.dirname(file.path).replace(path.resolve(__dirname, '../src/main/java'), ''));
                    ensureDirectoryExists(versionDir);
                    const versionedPath = path.join(versionDir, path.basename(file.path, '.java') + `_${timestamp}.java`);
                    fs.copyFileSync(file.path, versionedPath);
                });

                // Apply the changes
                codeBlocks.forEach((_, i) => {
                    if (i % 2 === 0) {
                        const filePath = codeBlocks[i].trim();
                        const fileContent = codeBlocks[i + 1].trim();
                        const fullPath = path.resolve(__dirname, '../', filePath);
                        fs.writeFileSync(fullPath, fileContent);
                    }
                });

                console.log('Changes have been applied.');
            } else {
                const userFeedback = readline.question('Changes rejected. Provide feedback for the LLM:\n');
                if (userFeedback) {
                    accumulatedHints.push(userFeedback);
                }
            }
        }
    }
})(); 