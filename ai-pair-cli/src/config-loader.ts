import minimist from 'minimist';
import path from 'path';
import fs from 'fs';
import { Config, logger } from 'ai-pair';

function loadCommandLineConfig(): Config {

    const args = process.argv.slice(2);
    const parsedArgs = minimist(args, {
        alias: { 
            m: 'model', 
            p: 'projectRoot', 
            e: 'extension', 
            t: 'testDir',
            l: 'logLevel',
            td: 'tmpDir',
            pp: 'promptsPath',
            nr: 'numRetries'
        },
        default: { 
            model: 'gpt-4o', 
            extension: '.java', 
            testDir: 'src/test/java', 
            tmpDir: 'tmp',
            logLevel: 'info', 
            numRetries: 3
        }
    });

    if (!parsedArgs.projectRoot) {
        throw new Error('Project root is required');
    }

    const config = new Config({
        model: parsedArgs.model,
        projectRoot: parsedArgs.projectRoot,
        extension: parsedArgs.extension,
        testDir: parsedArgs.testDir,
        tmpDir: parsedArgs.tmpDir,
        logLevel: parsedArgs.logLevel
    });

    const configFilePath = path.join(process.cwd(), 'ai-pair-config.json');

    if (fs.existsSync(configFilePath)) {
        const fileConfig = JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));
        return { ...parsedArgs, ...fileConfig };
    }

    return config
}

export { loadCommandLineConfig }; 