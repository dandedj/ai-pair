import minimist from 'minimist';
import path from 'path';
import fs from 'fs';
import { Config, logger } from 'ai-pair';

function loadCommandLineConfig(): Config {
    // show the received arguments
    console.log('Received arguments:', process.argv);

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
            logLevel: 'debug', 
        }
    });

    // validate that all required arguments are present
    if (!parsedArgs.projectRoot) {
        throw new Error('Project root is required');
    }

    // move the parsedArgs to a Config object
    const config = new Config({
        model: parsedArgs.model,
        projectRoot: parsedArgs.projectRoot,
        extension: parsedArgs.extension,
        testDir: parsedArgs.testDir,
        tmpDir: parsedArgs.tmpDir,
        logLevel: parsedArgs.logLevel
    });

    const configFilePath = path.join(process.cwd(), 'ai-pair-config.json');

    // print the config file path
    console.log('Config file path:', configFilePath);

    if (fs.existsSync(configFilePath)) {
        const fileConfig = JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));
        return { ...parsedArgs, ...fileConfig };
    }

    return config
}

export { loadCommandLineConfig }; 