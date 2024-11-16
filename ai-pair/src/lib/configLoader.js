const { loadConfig } = require('./config');
const minimist = require('minimist');

function loadConfiguration() {
    if (process.env.EXTENSION_CONTEXT) {
        // Logic for loading configuration in the extension context
        const configData = /* Retrieve config data from the extension's settings */;
        return configData;
    } else {
        // Default to command-line context
        const envVars = loadConfig();
        const args = process.argv.slice(2);
        const parsedArgs = minimist(args, {
            alias: { m: 'model', p: 'project-root', e: 'extension', t: 'test-dir' },
            default: { model: 'gpt-4o', extension: '.java', 'test-dir': 'src/test/java' }
        });

        // Combine envVars and parsedArgs into configData
        const configData = {
            ...envVars,
            model: parsedArgs.model,
            projectRoot: parsedArgs['project-root'],
            extension: parsedArgs.extension,
            testDir: parsedArgs['test-dir'],
            // Add any other necessary properties from envVars or parsedArgs
        };
        return configData;
    }
}

module.exports = { loadConfiguration }; 