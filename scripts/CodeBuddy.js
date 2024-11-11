require('dotenv').config();
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline-sync');
const xml2js = require('xml2js');
const chokidar = require('chokidar');
const ChatGPTClient = require('./ChatGPTClient');

// Define tmpDir at a higher scope
const tmpDir = path.resolve(__dirname, '../build/tmp');

// Function to run unit tests
function runTests() {
    ensureDirectoryExists(tmpDir);
    clearFile(path.join(tmpDir, 'test_output.txt'));

    try {
        const result = execSync('gradle clean test', { cwd: '../' });
        fs.writeFileSync(path.join(tmpDir, 'test_output.txt'), result.toString());
        appendXmlTestResults(tmpDir);
        return true;
    } catch (error) {
        const stdout = error.stdout ? error.stdout.toString() : '';
        const stderr = error.stderr ? error.stderr.toString() : '';
        fs.writeFileSync(path.join(tmpDir, 'test_output.txt'), stdout + stderr);
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

// Function to apply generated code changes
function applyGeneratedCode(codeBlocks) {
    const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
    codeBlocks.forEach((_, i) => {
        if (i % 2 === 0) {
            const filePath = codeBlocks[i].trim();
            const fileContent = codeBlocks[i + 1].trim();
            const fullPath = path.resolve(__dirname, '../', filePath);

            // Ensure the directory exists
            const dirName = path.dirname(fullPath);
            ensureDirectoryExists(dirName);

            // Write the file content
            fs.writeFileSync(fullPath, fileContent);
        }
    });
}

// Function to perform the code generation cycle
async function performCodeGenerationCycle(chatGPTClient, javaFiles, buildGradleContent, accumulatedHints, force = false) {
    const testsPassed = runTests();

    // Display the test output
    const testOutput = fs.readFileSync(path.join(tmpDir, 'test_output.txt'), 'utf-8');

    if (testsPassed && !force) {
        console.log('Project compiles and all tests passed! No changes needed.');
        summarizePassedTests();
        return true;
    } else {
        console.log('Tests failed or force generation is enabled.');
        console.log('Test Output:\n', testOutput);

        const filesContent = javaFiles.map(file => `File: ${file.path}\n\n${file.content}`).join('\n\n');
        let prompt = `The following Java unit test is failing:\n\n${testOutput}\n\nHere are the current contents of the Java files:\n\n${filesContent}\n\nHere is the build.gradle.kts content:\n\n${buildGradleContent}\n\nPlease provide the updated Java code for the files that will make the test pass. Do not EVER change any test classes (*.test.java). Include the file paths and ensure the response is only Java code without any markdown or explanations. Do not use markdown formatting or code blocks. My project uses gradle with kotlin.`;

        if (accumulatedHints.length > 0) {
            prompt += `\n\nHints for improvement: ${accumulatedHints.join('; ')}`;
        }

        // Log the prompt to the session log file
        const sessionLogFilePath = path.join(tmpDir, 'session_log.txt');
        fs.appendFileSync(sessionLogFilePath, `Prompt at ${new Date().toISOString()}:\n${prompt}\n\n`);

        const generatedCode = await chatGPTClient.generateCode(prompt, tmpDir);

        const codeBlocks = generatedCode.split(/File: (.+?)\n/).slice(1);

        codeBlocks.forEach((_, i) => {
            if (i % 2 === 0) {
                const filePath = codeBlocks[i].trim();
                const fileContent = codeBlocks[i + 1].trim();
                const fullPath = path.resolve(__dirname, '../', filePath);

                // Ensure the directory exists
                const dirName = path.dirname(fullPath);
                ensureDirectoryExists(dirName);

                // Check if the file is new or a non-Java file
                const isNewFile = !fs.existsSync(fullPath);
                const isNonJavaFile = !filePath.endsWith('.java');

                if (isNewFile) {
                    console.log(`New file will be added: ${filePath}`);
                    console.log(`Contents of the new file:\n${fileContent}`);
                } else if (isNonJavaFile) {
                    console.log(`WARNING: A non-Java file will be changed: ${filePath}`);
                } else {
                    // Archive the original file
                    const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
                    const archiveDir = path.join(__dirname, '../archive/versions', path.dirname(filePath));
                    ensureDirectoryExists(archiveDir);
                    const archivePath = path.join(archiveDir, `${path.basename(filePath, '.java')}_${timestamp}.java`);
                    fs.copyFileSync(fullPath, archivePath);

                    // Show diff for existing files
                    const tempFilePath = path.join(tmpDir, path.basename(filePath));
                    fs.writeFileSync(tempFilePath, fileContent);

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

                // Write the file content
                fs.writeFileSync(fullPath, fileContent);
            }
        });

        console.log('Changes have been applied.');
        return false;
    }
}

// Function to handle a single iteration
async function handleSingleIteration(chatGPTClient, javaFiles, buildGradleContent, accumulatedHints, force = false) {
    const allTestsPassed = await performCodeGenerationCycle(chatGPTClient, javaFiles, buildGradleContent, accumulatedHints, force);
    if (allTestsPassed) {
        console.log('All tests passed!');
    }
}

// Function to watch for changes in the test directory
function watchTestDirectory(chatGPTClient, javaFiles, buildGradleContent, accumulatedHints) {
    const testDir = path.resolve(__dirname, '../src/test/java');
    chokidar.watch(testDir, { persistent: true }).on('change', async (filePath) => {
        console.log(`File changed: ${filePath}`);
        await performCodeGenerationCycle(chatGPTClient, javaFiles, buildGradleContent, accumulatedHints, true);
    });
}

// Main async function
(async () => {
    let model = 'gpt-4o';
    const chatGPTClient = new ChatGPTClient(process.env.OPENAI_API_KEY, model);

    // Clear the tmp and versions directories at the start of each run
    clearDirectory(tmpDir);
    clearDirectory(path.resolve(__dirname, '../archive/versions'));

    // Collect Java files once and use them throughout
    const javaFiles = collectJavaFiles([
        path.resolve(__dirname, '../src/main/java'),
        path.resolve(__dirname, '../src/test/java')
    ]);

    // Read the build.gradle.kts file
    const buildGradlePath = path.resolve(__dirname, '../build.gradle.kts');
    const buildGradleContent = fs.existsSync(buildGradlePath) ? fs.readFileSync(buildGradlePath, 'utf-8') : '';

    let accumulatedHints = [];

    // Initial single iteration
    await handleSingleIteration(chatGPTClient, javaFiles, buildGradleContent, accumulatedHints);

    // After the initial iteration, prompt the user
    while (true) {
        const userChoice = readline.question('Do you want to continue, provide a hint, change the model, exit, or watch for changes? (c/h/m/x/w, press Enter to continue): ');

        const choice = userChoice.trim().toLowerCase();

        if (choice === 'c' || userChoice.trim() === '') {
            console.log('Continuing with the next iteration...');
            await handleSingleIteration(chatGPTClient, javaFiles, buildGradleContent, accumulatedHints);
        } else if (choice === 'h') {
            const userFeedback = readline.question('Provide a hint to be used to regenerate code:\n');
            if (userFeedback) {
                accumulatedHints.push(userFeedback);
            }
            await handleSingleIteration(chatGPTClient, javaFiles, buildGradleContent, accumulatedHints, true);
        } else if (choice === 'm') {
            console.log('Select a model:');
            console.log('1. gpt-4o');
            console.log('2. gpt-4o-mini');
            console.log('3. o1-mini');
            // Remove or replace 'o1-preview' if it's not available
            const modelChoice = readline.question('Enter the number of the model you want to use: ');

            switch (modelChoice) {
                case '1':
                    model = 'gpt-4o';
                    break;
                case '2':
                    model = 'gpt-4o-mini';
                    break;
                case '3':
                    model = 'o1-mini';
                    break;
                default:
                    console.log('Invalid choice, using default model.');
            }

            // Update the client with the new model
            chatGPTClient.model = model;
            console.log(`Model changed to: ${model}`);
            await handleSingleIteration(chatGPTClient, javaFiles, buildGradleContent, accumulatedHints, true);
        } else if (choice === 'e' || choice === 'x') {
            console.log('Exiting...');
            process.exit(0); // Exit the program with a success code
        } else if (choice === 'w') {
            console.log('Watch mode enabled. Watching for changes in the test directory...');
            watchTestDirectory(chatGPTClient, javaFiles, buildGradleContent, accumulatedHints);
            break; // Exit the loop to only watch for changes
        }
    }
})(); 