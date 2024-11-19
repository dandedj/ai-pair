const fs = require('fs');
const path = require('path');
const { logger } = require('../logger');

class BaseAIClient {
    constructor(apiKey, model, tmpDir) {
        this.apiKey = apiKey;
        this.model = model;
        this.tmpDir = tmpDir;
        this.tokenUsage = {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
        };
    }

    estimateTokens(text) {
        // Estimate tokens by dividing the character count by 4
        return Math.ceil(text.length / 4);
    }

    logRequest(prompt) {
        const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
        const requestLogFilePath = path.join(this.tmpDir, `request_${timestamp}.txt`);
        fs.writeFileSync(requestLogFilePath, prompt);
        return timestamp;
    }

    logResponse(generatedCode, timestamp) {
        const responseLogFilePath = path.join(this.tmpDir, `response_${timestamp}.txt`);
        fs.writeFileSync(responseLogFilePath, generatedCode);
    }

    logTokenUsage(promptTokens, completionTokens) {
        this.tokenUsage.promptTokens += promptTokens;
        this.tokenUsage.completionTokens += completionTokens;
        this.tokenUsage.totalTokens += (promptTokens + completionTokens);
        logger.debug(`Token usage - Prompt: ${promptTokens}, Completion: ${completionTokens}, Total: ${this.tokenUsage.totalTokens}`);
    }

    updateTokenUsage(apiResponse) {
        // Override in child classes if the API returns token usage details
    }

    getTokenUsage() {
        return this.tokenUsage;
    }
}

module.exports = BaseAIClient; 