const Config = require('ai-pair/src/models/config');
const RunningState = require('ai-pair/src/models/RunningState');

class State {
    constructor() {
        this.config = null;
        this.runningState = null;
    }

    initialize(configData) {
        this.config = new Config(configData);
        this.runningState = new RunningState();
    }

    getConfig() {
        return this.config;
    }

    getRunningState() {
        return this.runningState;
    }

    updateConfig(newConfigData) {
        // Create a new Config object with updated data
        this.config = new Config(newConfigData);
    }
}

const state = new State();

module.exports = state; 