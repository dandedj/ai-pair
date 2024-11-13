require('dotenv').config();
const fs = require('fs');
const path = require('path');
const readline = require('readline-sync');
const chokidar = require('chokidar');
const minimist = require('minimist');
const ChatGPTClient = require('./lib/ai/ChatGPTClient');
const ClaudeClient = require('./lib/ai/ClaudeClient');
const GeminiClient = require('./lib/ai/GeminiClient');
const { parseAndApplyGeneratedCode } = require('./lib/CodeParser');
const { collectJavaFiles, clearDirectory } = require('./lib/FileUtils');
const { runTests, summarizeAllTests } = require('./lib/TestUtils');
const logger = require('./lib/logger');

// Define models with their families
const models = {
    'gpt-4o': 'openai',
    'gpt-4o-mini': 'openai',
    'gpt-3.5-turbo': 'openai',
    'claude-3-5-sonnet-20241022': 'anthropic',
    'claude-3-5-sonnet': 'anthropic',
    'gemini-1.5-pro': 'gemini',
    'gemini-2': 'gemini'
};

// Parse command-line arguments
const args = minimist(process.argv.slice(2), {
    alias: {
        m: 'model',
        p: 'project-root'
    },
    default: {
        model: 'gpt-4o'
    }
});

// Validate the provided model
const model = args.model;
if (!models.hasOwnProperty(model)) {
    logger.error(`Invalid model: ${model}`);
    console.log("Valid models are:", Object.keys(models).join(', '));
    process.exit(1);
}

// Validate the project root parameter
if (!args['project-root']) {
    logger.error("The --project-root parameter is required.");
    console.log("Usage: node AIPair.js --model=<model> --project-root=<path>");
    process.exit(1);
}

// Get the project root directory
const projectRoot = path.resolve(args['project-root']);

// Define tmpDir at a higher scope
const tmpDir = path.join(process.cwd(), 'tmp');

const systemPrompt = `You are a senior software engineer working on a gradle project with kotlin. Please respond in plain text and do not include any markdown formatting.`;

// Function to select the appropriate AI client based on the model
function selectAIClient(apiKey, model) {
    const family = models[model];
    if (family === 'openai') {
        return new ChatGPTClient(apiKey, model);
    } else if (family === 'anthropic') {
        return new ClaudeClient(apiKey, model);
    } else if (family === 'gemini') {
        return new GeminiClient(apiKey, model);
    } else {
        logger.warn('Model not recognized, defaulting to ChatGPTClient.');
        return new ChatGPTClient(apiKey, model);
    }
}

// Function to get the appropriate API key based on the model
function getApiKeyForModel(model) {
    const family = models[model];
    let apiKey;
    
    if (family === 'openai') {
        apiKey = process.env.OPENAI_API_KEY;
    } else if (family === 'anthropic') {
        apiKey = process.env.CLAUDE_API_KEY;
    } else if (family === 'gemini') {
        apiKey = process.env.GEMINI_API_KEY;
    } else {
        console.warn('Model not recognized, using default API key.');
        apiKey = process.env.OPENAI_API_KEY;
    }

    if (!apiKey) {
        console.error(`Error: No API key found for ${family} model family.`);
        console.error(`Please set the ${family.toUpperCase()}_API_KEY environment variable.`);
        process.exit(1);
    }

    return apiKey;
}

function promptForModel() {
    console.log('Select a model:');
    console.log('1. gpt-4o');
    console.log('2. gpt-4o-mini');
    console.log('3. gpt-3.5-turbo');
    console.log('4. claude-3-5-sonnet-20241022');
    console.log('5. gemini-1.5-pro');
    console.log('6. gemini-2');
    const modelChoice = readline.question('Enter the number of the model you want to use: ');

    switch (modelChoice) {
        case '1':
            return 'gpt-4o';
        case '2':
            return 'gpt-4o-mini';
        case '3':
            return 'gpt-3.5-turbo';
        case '4':
            return 'claude-3-5-sonnet-20241022';
        case '5':
            return 'gemini-1.5-pro';
        case '6':
            return 'gemini-2';
        default:
            console.log('Invalid choice, using default model.');
            return 'gpt-4o';
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

    logger.debug('Collecting Java files for code generation');
    const javaFiles = collectJavaFiles([
        path.join(projectRoot, 'src/main/java'),
        path.join(projectRoot, 'src/test/java')
    ]);

    logger.debug(`Found ${javaFiles.length} Java files`);
    
     // Convert file paths to be relative to the project root
     const filesContent = javaFiles.map(file => {
        const relativePath = path.relative(projectRoot, file.path);
        return `File: ${relativePath}\n\n${file.content}`;
    }).join('\n\n');
    let prompt = `The following Java / gradle project unit test is failing:

${testOutput}

Here are the current contents of the Java files:

${filesContent}

Here is the build file contents:

${buildGradleContent}

Please provide the updated Java code for the files that will make the test pass. 
Before each file path, add the following:
File: <file_path>

Do not EVER change any of the unit test classes (*.Test.java). 
The results will be used to save a file to code so do NOT use markdown formatting or include other information in the response. Only the files and their contents. `;

    if (accumulatedHints.length > 0) {
        prompt += `\n\nHints for improvement: ${accumulatedHints.join('; ')}`;
    }

    // Log the prompt to the session log file
    const sessionLogFilePath = path.join(tmpDir, 'session_log.txt');
    fs.appendFileSync(sessionLogFilePath, `Prompt at ${new Date().toISOString()}:\n${prompt}\n\n`);

    logger.debug('Sending prompt to AI service');
    const generatedCode = await client.generateCode(prompt, tmpDir, systemPrompt);

    logger.info('Applying generated code changes');
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

    console.log('Log Level:', process.env.LOG_LEVEL);

    const apiKey = getApiKeyForModel(model);

    // Set initial model and client
    let client = selectAIClient(apiKey, model);

    logger.debug(`Initialized ${client.model} client with API key: ${client.apiKey.substring(0, 4)}...`);

    logger.info('Clearing temporary directories');
    clearDirectory(tmpDir);
    clearDirectory(path.join(tmpDir, 'archive/versions'));

    logger.debug('Reading build.gradle.kts file');
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
                logger.debug(`Added hint: ${userFeedback}`);
            }
            await handleSingleIteration(client, buildGradleContent, accumulatedHints, true);
        } else if (userChoice === 'm') {
            const newModel = promptForModel();
            client = selectAIClient(getApiKeyForModel(newModel), newModel);
            logger.info(`Switched to model: ${client.model}`);
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