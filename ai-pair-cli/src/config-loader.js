const minimist = require('minimist');
const path = require('path');
const fs = require('fs');

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

    const configFilePath = path.join(process.cwd(), 'ai-pair-config.json');

    // print the config file path
    console.log('Config file path:', configFilePath);

    if (fs.existsSync(configFilePath)) {
        const fileConfig = JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));
        return { ...parsedArgs, ...fileConfig };
    }

    return parsedArgs;
}

module.exports = {
    loadCommandLineConfig
}; 