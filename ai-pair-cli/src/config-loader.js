const minimist = require('minimist');
const path = require('path');

function loadCommandLineConfig() {
    const args = process.argv.slice(2);
    const parsedArgs = minimist(args, {
        alias: { 
            m: 'model', 
            p: 'projectRoot', 
            e: 'extension', 
            t: 'testDir',
            l: 'logLevel',
            td: 'tmpDir',
            pp: 'promptsPath'
        },
        default: { 
            model: 'gpt-4o', 
            extension: '.java', 
            testDir: 'src/test/java', 
            tmpDir: 'tmp',
            logLevel: 'debug'
        }
    });

    console.log('Project Root:', parsedArgs['projectRoot']);
    console.log('Prompts Path:', parsedArgs['promptsPath']);

    // Resolve paths
    if (parsedArgs['projectRoot']) {
        parsedArgs['projectRoot'] = path.resolve(parsedArgs['projectRoot']);
    }

    if (parsedArgs['promptsPath']) {
        parsedArgs['promptsPath'] = path.resolve(parsedArgs['promptsPath']);
    }

    console.log('Parsed Args:', parsedArgs);

    // Return the parsed configuration data
    return parsedArgs;
}

module.exports = {
    loadCommandLineConfig
}; 