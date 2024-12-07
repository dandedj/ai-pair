import * as fs from 'fs';
import * as path from 'path';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
    private static instance: Logger | null = null;
    private logFile: string;
    private logLevel: LogLevel;
    private initialized: boolean = false;

    private constructor() {
        this.logLevel = 'info';  // Default until initialized
        this.logFile = '';
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    public initialize(logDir: string, logLevel: LogLevel = 'info') {
        fs.mkdirSync(logDir, { recursive: true });
        this.logFile = path.join(logDir, 'ai-pair.log');
        fs.writeFileSync(this.logFile, '');
        this.logLevel = logLevel;
        this.initialized = true;
    }

    private checkInitialized() {
        if (!this.initialized) {
            throw new Error('Logger not initialized. Call initialize() first with proper configuration.');
        }
    }

    setLogLevel(level: LogLevel) {
        this.checkInitialized();
        this.logLevel = level;
    }

    private shouldLog(level: LogLevel): boolean {
        const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
        return levels.indexOf(level) >= levels.indexOf(this.logLevel);
    }

    private writeToFile(level: LogLevel, message: string) {
        this.checkInitialized();
        const timestamp = new Date().toISOString();
        const logMessage = `${timestamp} [${level.toUpperCase()}] ${message}\n`;
        fs.appendFileSync(this.logFile, logMessage);
    }

    debug(message: string) {
        this.checkInitialized();
        this.writeToFile('debug', message);
        if (this.shouldLog('debug')) {
            console.log(`[DEBUG] ${message}`);
        }
    }

    info(message: string) {
        this.checkInitialized();
        this.writeToFile('info', message);
        if (this.shouldLog('info')) {
            console.log(`[INFO] ${message}`);
        }
    }

    warn(message: string) {
        this.checkInitialized();
        this.writeToFile('warn', message);
        if (this.shouldLog('warn')) {
            console.warn(`[WARN] ${message}`);
        }
    }

    error(message: string) {
        this.checkInitialized();
        this.writeToFile('error', message);
        if (this.shouldLog('error')) {
            console.error(`[ERROR] ${message}`);
        }
    }
}

export const logger = Logger.getInstance(); 