const { parseAndApplyGeneratedCode } = require('./code-parser');
const { logger } = require('./logger');

class CodeGenerator {
  constructor(config, client, runningState) {
    this.config = config;
    this.client = client;
    this.runningState = runningState;
  }

  async generateCode(prompt) {
    try {
      const generatedCode = await this.client.generateCode(
        prompt,
        this.config.tmpDir,
        this.config.systemPrompt
      );
      return generatedCode;
    } catch (error) {
      logger.error('Error during code generation:', error);
      throw error;
    }
  }

  applyGeneratedCode(generatedCode) {
    try {
      const changes = parseAndApplyGeneratedCode(
        this.config.projectRoot,
        this.config.tmpDir,
        this.config.extension,
        generatedCode
      );
      logger.info('Generated code applied successfully.');
      return changes;
    } catch (error) {
      logger.error('Error applying generated code:', error);
      throw error;
    }
  }

  // Other related methods...
}

module.exports = CodeGenerator; 