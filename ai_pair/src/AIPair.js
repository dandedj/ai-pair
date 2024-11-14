const { loadConfig } = require('./lib/config');
const AIPairRunner = require('./AIPairRunner');
const minimist = require('minimist');
const path = require('path');
const logger = require('./lib/logger');

(async () => {
    try {
        const envVars = loadConfig();
        const args = process.argv.slice(2);
        const parsedArgs = minimist(args, {
            alias: { m: 'model', p: 'project-root', e: 'extension' },
            default: { model: 'gpt-4o', extension: '.java' }
        });

        validateArgs(parsedArgs);

        const model = parsedArgs.model;
        const projectRoot = path.resolve(parsedArgs['project-root']);
        const extension = parsedArgs.extension;
        const { ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, LOG_LEVEL } = envVars;

        const runner = new AIPairRunner(
            model,
            projectRoot,
            extension,
            ANTHROPIC_API_KEY,
            OPENAI_API_KEY,
            GEMINI_API_KEY,
            LOG_LEVEL
        );

        await runner.run();
    } catch (error) {
        console.error('Failed to run AI Pair:', error);
        process.exit(1);
    }
})();

function validateArgs(args) {
    const validModels = ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo', 'claude-3-5-sonnet-20241022', 'claude-3-5-sonnet', 'gemini-1.5-pro', 'gemini-2'];

    if (!validModels.includes(args.model)) {
        logger.error(`Invalid model: ${args.model}`);
        console.log("Valid models are:", validModels.join(', '));
        process.exit(1);
    }

    if (!args['project-root']) {
        logger.error("The --project-root parameter is required.");
        console.log("Usage: node AIPair.js --model=<model> --project-root=<path> [--extension=<file_extension>]");
        process.exit(1);
    }
} 