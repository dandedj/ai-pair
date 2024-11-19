require('dotenv').config(); // Load environment variables from .env file

const path = require('path');
const { configureLogger } = require('ai-pair/src/lib/logger'); // Adjust the path if necessary
const { loadCommandLineConfig } = require('./config-loader');
const { clearDirectory } = require('ai-pair/src/lib/file-utils');

// Load configuration data
const configData = loadCommandLineConfig();

// Set default log level to 'debug' if not specified
configData.logLevel = configData.logLevel || 'debug';

// Resolve tmpDir to an absolute path
configData.tmpDir = path.resolve(configData.tmpDir);

// Configure the logger with settings from configData
configureLogger({ logDirectory: configData.tmpDir, logLevel: configData.logLevel });

// Now import other modules after configuring the logger
const { AIPair, Config, RunningState } = require('ai-pair');

(async () => {
  try {
    // Create Config object (will throw errors if validations fail)
    const config = new Config(configData);

    const runningState = new RunningState();

    // Clear temporary directories
    clearDirectory(config.tmpDir);
    clearDirectory(path.join(config.tmpDir, 'archive', 'versions'));

    const runner = new AIPair(config, runningState);

    await runner.runWithInteraction();
  } catch (error) {
    console.error('Failed to run AI Pair:', error.message);
    // print the stack trace
    console.error(error.stack);
    process.exit(1);
  }
})(); 