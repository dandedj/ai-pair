const vscode = require('vscode');

class EventEmitter {
    constructor() {
        this._listeners = new Map();
    }

    on(event, callback) {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }
        this._listeners.get(event).add(callback);
    }

    emit(event, data) {
        if (this._listeners.has(event)) {
            this._listeners.get(event).forEach(callback => callback(data));
        }
    }
}

// Create a singleton instance
const globalEvents = new EventEmitter();

module.exports = globalEvents; 