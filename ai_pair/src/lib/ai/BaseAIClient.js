const fs = require('fs');
const path = require('path');
const logger = require('../logger'); // Import the logger

class BaseAIClient {
    constructor(apiKey, model) {
        this.apiKey = apiKey;
        this.model = model;
    }

    estimateTokens(text) {
        // Estimate tokens by dividing the character count by 4
        return Math.ceil(text.length / 4);
    }

    logRequest(prompt, tmpDir) {
        const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
        const requestLogFilePath = path.join(tmpDir, `request_${timestamp}.txt`);
        fs.writeFileSync(requestLogFilePath, prompt);
        return timestamp;
    }

    logResponse(generatedCode, tmpDir, timestamp) {
        const responseLogFilePath = path.join(tmpDir, `response_${timestamp}.txt`);
        fs.writeFileSync(responseLogFilePath, generatedCode);
    }

    logTokenUsage(promptTokens, maxOutputTokens, totalEstimatedTokens, tpmLimit) {
        const tokenPercent = (totalEstimatedTokens / tpmLimit) * 100;
        logger.debug(`Estimated tokens for this call: ${totalEstimatedTokens} (Prompt: ${promptTokens}, Max Output: ${maxOutputTokens}) | Token usage: ${tokenPercent.toFixed(2)}% of TPM limit`);
    }
}

module.exports = BaseAIClient; 