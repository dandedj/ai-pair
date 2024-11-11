const axios = require('axios');
const fs = require('fs');
const path = require('path');

class ChatGPTClient {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.apiUrl = 'https://api.openai.com/v1/chat/completions';
    }

    async generateCode(prompt, tmpDir) {
        // Log the request to a file with a timestamp
        const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
        const requestLogFilePath = path.join(tmpDir, `request_${timestamp}.txt`);
        fs.writeFileSync(requestLogFilePath, prompt);

        try {
            const response = await axios.post(
                this.apiUrl,
                {
                    model: 'gpt-4o',
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 2048,
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