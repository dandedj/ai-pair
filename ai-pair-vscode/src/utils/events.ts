class EventEmitter<T = any> {
    private _listeners: Map<string, Set<(data: T) => void>>;

    constructor() {
        this._listeners = new Map();
    }

    on(event: string, callback: (data: T) => void): void {
        if (!this._listeners.has(event)) {
            this._listeners.set(event, new Set());
        }
        this._listeners.get(event)!.add(callback);
    }

    emit(event: string, data: T): void {
        if (this._listeners.has(event)) {
            this._listeners.get(event)!.forEach(callback => callback(data));
        }
    }
}

// Create a singleton instance
const globalEvents = new EventEmitter();

export default globalEvents; 