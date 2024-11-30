import 'dotenv/config'; // Load environment variables from .env file

import path from 'path';
import { configureLogger } from 'ai-pair'; // Adjust the path if necessary
import { loadCommandLineConfig } from './config-loader';
import { clearDirectory } from 'ai-pair';
import { AIPair, Config, RunningState } from 'ai-pair';

// Load configuration data
const configData = loadCommandLineConfig();

// Set default log level to 'debug' if not specified
configData.logLevel = configData.logLevel || 'debug';

// Resolve tmpDir to an absolute path
configData.tmpDir = path.resolve(configData.tmpDir);

// Configure the logger with settings from configData
configureLogger({ logDirectory: configData.tmpDir, logLevel: configData.logLevel });

(async () => {
  try {
    const config = new Config(configData);
    config.loadPrompts();
    const runningState = new RunningState();

    // Clear temporary directories
    clearDirectory(config.tmpDir);
    clearDirectory(path.join(config.tmpDir, 'archive', 'versions'));

    const runner = new AIPair(config, runningState);

    await runner.runWithInteraction();
  } catch (error: any) {
    console.error('Failed to run AI Pair:', error.message);
    // print the stack trace
    console.error(error.stack);
    process.exit(1);
  }
})(); 