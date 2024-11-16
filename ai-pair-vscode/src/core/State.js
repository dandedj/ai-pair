const Config = require('ai-pair/src/models/Config');
const RunningState = require('ai-pair/src/models/RunningState');

class State {
    constructor() {
        this.config = null;
        this.runningState = null;
    }

    initialize(configData) {
        if (!this.config) {
            this.config = new Config(configData);
        }
        if (!this.runningState) {
            this.runningState = new RunningState();
        }
    }

    getConfig() {
        return this.config;
    }

    getRunningState() {
        return this.runningState;
    }

    updateConfig(newConfigData) {
        // Update the existing config object with new data
        Object.assign(this.config, newConfigData);
    }
}

const state = new State();

module.exports = state; 