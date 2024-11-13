const axios = require('axios');
const BaseAIClient = require('./BaseAIClient');

class ChatGPTClient extends BaseAIClient {
    constructor(apiKey, model = 'gpt-4o') {
        super(apiKey, model);
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
            'text-embedding-3-small': { tpm: 1000000, rpm: 3000, tpd: 3000000 }
        };
        return limits[model] || { tpm: 0, rpm: 0, tpd: 0 };
    }

    async generateCode(prompt, tmpDir) {
        // Log the request
        const timestamp = this.logRequest(prompt, tmpDir);

        // Estimate tokens
        const promptTokens = this.estimateTokens(prompt);
        const maxOutputTokens = 2048;
        const totalEstimatedTokens = promptTokens + maxOutputTokens;

        // Log token usage
        this.logTokenUsage(promptTokens, maxOutputTokens, totalEstimatedTokens, this.modelLimits.tpm);

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

            // Log the response
            this.logResponse(generatedCode, tmpDir, timestamp);

            return generatedCode;
        } catch (error) {
            console.error('Error generating code:', error);
            throw error;
        }
    }
}

module.exports = ChatGPTClient; 