require('dotenv').config();
const fs = require('fs');
const path = require('path');
const readline = require('readline-sync');
const chokidar = require('chokidar');
const ChatGPTClient = require('./lib/ai/ChatGPTClient');
const ClaudeClient = require('./lib/ai/ClaudeClient');
const GeminiClient = require('./lib/ai/GeminiClient');
const { parseAndApplyGeneratedCode } = require('./lib/CodeParser');
const { collectJavaFiles, clearDirectory } = require('./lib/FileUtils');
const { runTests, summarizeAllTests } = require('./lib/TestUtils');

// Validate command-line arguments
if (process.argv.length < 3) {
    console.error("Usage: node AIPair.js <project-root> [model]");
    process.exit(1);
}

// Get command-line arguments
const projectRoot = process.argv[2];
const model = process.argv[3] || 'gpt-4o';

// Define tmpDir at a higher scope
const tmpDir = path.join(process.cwd(), 'tmp');

// Function to select the appropriate AI client based on the model
function selectAIClient(apiKey, model) {
    if (model.startsWith('gpt')) {
        return new ChatGPTClient(apiKey, model);
    } else if (model.startsWith('claude')) {
        return new ClaudeClient(apiKey, model);
    } else if (model.startsWith('gemini')) {
        return new GeminiClient(apiKey, model);
    } else {
        console.warn('Model not recognized, defaulting to ChatGPTClient.');
        return new ChatGPTClient(apiKey, model);
    }
}

// Function to get the appropriate API key based on the model
function getApiKeyForModel(model) {
    if (model.startsWith('gpt') || model === 'o1') {
        return process.env.OPENAI_API_KEY;
    } else if (model.startsWith('claude')) {
        return process.env.CLAUDE_API_KEY;
    } else if (model.startsWith('gemini')) {
        return process.env.GEMINI_API_KEY;
    } else {
        console.warn('Model not recognized, using default API key.');
        return process.env.OPENAI_API_KEY;
    }
}

// Function to perform the code generation cycle
async function performCodeGenerationCycle(client, buildGradleContent, accumulatedHints, force = false) {
    let testsPassed = true;
    let testOutput = 'No test output yet.';

    // Run tests if force is not enabled
    if (!force) {
        testsPassed = runTests(projectRoot, tmpDir);
        testOutput = fs.readFileSync(path.join(tmpDir, 'test_output.txt'), 'utf-8');

        if (testsPassed) {
            console.log('Project compiles and all tests passed! No changes needed.');
            summarizeAllTests(projectRoot, tmpDir);
            return;
        }
    }

    // Collect Java files right before generating the prompt
    const javaFiles = collectJavaFiles([
        path.join(projectRoot, 'src/main/java'),
        path.join(projectRoot, 'src/test/java')
    ]);

    const filesContent = javaFiles.map(file => `File: ${file.path}\n\n${file.content}`).join('\n\n');
    let prompt = `The following Java unit test is failing:

${testOutput}

Here are the current contents of the Java files:

${filesContent}

Here is the build.gradle.kts content:

${buildGradleContent}

Please provide the updated Java code for the files that will make the test pass. 
Do not EVER change any of the unit test classes (*.Test.java). Before each file path, add the following comment:
// File: <file_path>
Include the file paths and ensure the response is only Java code without any markdown or explanations. 
Do not use markdown formatting or code blocks. My project uses gradle with kotlin.`;

    if (accumulatedHints.length > 0) {
        prompt += `\n\nHints for improvement: ${accumulatedHints.join('; ')}`;
    }

    // Log the prompt to the session log file
    const sessionLogFilePath = path.join(tmpDir, 'session_log.txt');
    fs.appendFileSync(sessionLogFilePath, `Prompt at ${new Date().toISOString()}:\n${prompt}\n\n`);

    const generatedCode = await client.generateCode(prompt, tmpDir);

    // Use the project root for applying generated code
    parseAndApplyGeneratedCode(projectRoot, tmpDir, generatedCode);

    console.log('Changes have been applied.');

    // Run tests again after applying changes
    testsPassed = runTests(projectRoot, tmpDir);

    return testsPassed;
}

// Function to handle a single iteration
async function handleSingleIteration(client, buildGradleContent, accumulatedHints, force = false) {
    const allTestsPassed = await performCodeGenerationCycle(client, buildGradleContent, accumulatedHints, force);
    if (allTestsPassed) {
        console.log('All tests passed!');
    }
}

// Function to watch for changes in the test directory
function watchTestDirectory(client, buildGradleContent, accumulatedHints) {
    const testDir = path.join(projectRoot, 'src/test/java');
    chokidar.watch(testDir, { persistent: true }).on('change', async () => {
        console.log('Detected changes in test directory.');
        await handleSingleIteration(client, buildGradleContent, accumulatedHints, true);
    });
}

// Main async function
(async () => {
    const apiKey = getApiKeyForModel(model);

    // Set initial model and client
    let client = selectAIClient(apiKey, model);

    console.log("Model : " + client.model + " : " + client.apiKey);

    // Clear the tmp and versions directories at the start of each run
    clearDirectory(tmpDir);
    clearDirectory(path.join(tmpDir, 'archive/versions'));

    // Read the build.gradle.kts file
    const buildGradlePath = path.join(projectRoot, 'build.gradle.kts');
    const buildGradleContent = fs.existsSync(buildGradlePath) ? fs.readFileSync(buildGradlePath, 'utf-8') : '';

    const accumulatedHints = [];

    // Initial single iteration
    await handleSingleIteration(client, buildGradleContent, accumulatedHints);

    // After the initial iteration, prompt the user
    while (true) {
        const userChoice = readline.question('Options: [c]ontinue, provide [h]int, change [m]odel, e[x]it, [w]atch for changes. (Press Enter to continue): ').trim().toLowerCase();

        if (userChoice === 'c' || userChoice === '') {
            console.log('Continuing with the next iteration...');
            await handleSingleIteration(client, buildGradleContent, accumulatedHints);
        } else if (userChoice === 'h') {
            const userFeedback = readline.question('Provide a hint to be used to regenerate code:\n');
            if (userFeedback) {
                accumulatedHints.push(userFeedback);
            }
            await handleSingleIteration(client, buildGradleContent, accumulatedHints, true);
        } else if (userChoice === 'm') {
            client = promptForModel(apiKey);
            await handleSingleIteration(client, buildGradleContent, accumulatedHints, true);
        } else if (userChoice === 'e' || userChoice === 'x') {
            console.log('Exiting...');
            process.exit(0);
        } else if (userChoice === 'w') {
            console.log('Watch mode enabled. Watching for changes in the test directory...');
            watchTestDirectory(client, buildGradleContent, accumulatedHints);
            break;
        } else {
            console.log('Invalid option. Please try again.');
        }
    }
})(); 