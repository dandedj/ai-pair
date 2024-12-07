import minimist from 'minimist';
import path from 'path';
import { Config } from 'ai-pair';
import pino from 'pino';

const logger = pino({
    level: 'debug',
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            messageFormat: '[{time}] {level}: {msg}',
            ignore: 'pid,hostname,time',
            translateTime: 'HH:MM:ss'
        }
    }
});

async function loadCommandLineConfig(): Promise<Config> {
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
        logger.error('Project root is required');
        throw new Error('Project root is required');
    }

    const config = new Config({
        model: parsedArgs.model,
        projectRoot: parsedArgs.projectRoot,
        extension: parsedArgs.extension,
        srcDir: path.join(parsedArgs.projectRoot, 'src/main/java'),
        testDir: path.join(parsedArgs.projectRoot, parsedArgs.testDir),
        promptsPath: path.join(__dirname, '../prompts'),
        tmpDir: parsedArgs.tmpDir,
        logLevel: parsedArgs.logLevel
    });

    return config;
}

export { loadCommandLineConfig }; 