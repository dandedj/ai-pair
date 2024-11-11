const axios = require('axios');
const fs = require('fs');
const path = require('path');

class ChatGPTClient {
    constructor(apiKey, model = 'gpt-4o') {
        this.apiKey = apiKey;
        this.model = model;
        this.apiUrl = 'https://api.openai.com/v1/chat/completions';
        this.modelLimits = this.getModelLimits(model);
    }

    getModelLimits(model) {
        const limits = {
            'gpt-4o': { tpm: 30000, rpm: 500, tpd: 90000 },
            'gpt-4o-mini': { tpm: 200000, rpm: 500, tpd: 2000000 },
            'gpt-3.5-turbo': { tpm: 200000, rpm: 500, tpd: 2000000 },
            'gpt-4': { tpm: 10000, rpm: 500, tpd: 100000 },
            'gpt-4-turbo': { tpm: 30000, rpm: 500, tpd: 90000 },
            'gpt-4o-realtime-preview': { tpm: 20000, rpm: 100, tpd: 100 },
            'text-embedding-3-small': { tpm: 1000000, rpm: 3000, tpd: 3000000 },
            // Add other models as needed
        };
        return limits[model] || { tpm: 0, rpm: 0, tpd: 0 };
    }

    estimateTokens(text) {
        // Estimate tokens by dividing the character count by 4
        return Math.ceil(text.length / 4);
    }

    async generateCode(prompt, tmpDir) {
        // Log the request to a file with a timestamp
        const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
        const requestLogFilePath = path.join(tmpDir, `request_${timestamp}.txt`);
        fs.writeFileSync(requestLogFilePath, prompt);

        // Estimate tokens for the prompt and output
        const promptTokens = this.estimateTokens(prompt);
        const maxOutputTokens = 2048; // As specified in the API call
        const totalEstimatedTokens = promptTokens + maxOutputTokens;

        // Calculate percentage of limits used
        const tokenPercent = (totalEstimatedTokens / this.modelLimits.tpm) * 100;

        // Combined log line
        console.log(`Estimated tokens for this call: ${totalEstimatedTokens} (Prompt: ${promptTokens}, Max Output: ${maxOutputTokens}) | Token usage: ${tokenPercent.toFixed(2)}% of TPM limit`);

        try {
            const response = await axios.post(
                this.apiUrl,
                {
                    model: this.model,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: maxOutputTokens,
                    temperature: 0.5,
                    n: 1,
                    stop: null,
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${this.apiKey}`,
                    },
                }
            );

            let generatedCode = response.data.choices[0].message.content.trim();

            // Post-process to remove markdown formatting if present
            if (generatedCode.startsWith("```")) {
                generatedCode = generatedCode.replace(/```[a-z]*\n/g, '').replace(/```/g, '').trim();
            }

            // Log the response to a file with a timestamp
            const responseLogFilePath = path.join(tmpDir, `response_${timestamp}.txt`);
            fs.writeFileSync(responseLogFilePath, generatedCode);

            return generatedCode;
        } catch (error) {
            console.error('Error generating code:', error);
            throw error;
        }
    }
}

module.exports = ChatGPTClient; 