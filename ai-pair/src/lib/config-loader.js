const { loadConfig } = require('./config');

function loadConfiguration() {
    // Load environment variables
    const envVars = loadConfig();

    // Return environment variables as configuration
    return envVars;
}

module.exports = {
    loadConfiguration
}; 