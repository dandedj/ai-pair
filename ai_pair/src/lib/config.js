const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');
const logger = require('./logger');

// Load environment variables from all possible locations
function loadConfig() {
    const envPaths = [
        path.resolve(process.cwd(), '.env'),
        path.resolve(process.cwd(), '../.env'),
        path.resolve(process.cwd(), '../../.env')
    ];

    let envFound = false;

    for (const envPath of envPaths) {
        if (fs.existsSync(envPath)) {
            dotenv.config({ path: envPath });
            logger.info(`Loaded environment variables from ${envPath}`);
            envFound = true;
            break;
        }
    }

    if (!envFound) {
        logger.error('No .env file found in the expected locations.');
    }

    // Verify required environment variables
    const required = [
        'ANTHROPIC_API_KEY',
        'OPENAI_API_KEY',
        'GEMINI_API_KEY',
        'LOG_LEVEL'
    ];

    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        console.error('Missing required environment variables:', missing.join(', '));
        console.error('Please create a .env file with these variables');
        process.exit(1);
    }

    // Return the environment variables
    return {
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        LOG_LEVEL: process.env.LOG_LEVEL
    };
}

module.exports = { loadConfig }; 