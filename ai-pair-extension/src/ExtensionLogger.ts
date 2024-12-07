import * as fs from 'fs';
import * as path from 'path';
import { ILogger } from './webview/WebviewLogger';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class ExtensionLogger implements ILogger {
    private static instance: ExtensionLogger | null = null;
    private logFile: string;
    private logLevel: LogLevel;
    private initialized: boolean = false;

    private constructor(logDir: string, logLevel: LogLevel) {
        this.logLevel = logLevel;
        this.logFile = path.join(logDir, 'extension.log');
    }

    public static getInstance(): ExtensionLogger {
        if (!ExtensionLogger.instance) {
            throw new Error('ExtensionLogger not initialized. Call initialize() first.');
        }
        return ExtensionLogger.instance;
    }

    public static initialize(logDir: string, logLevel: LogLevel) {

        // Ensure the parent directory exists
        const parentDir = path.dirname(logDir);
        if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
        }

        // Now create the logs directory
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }

        ExtensionLogger.instance = new ExtensionLogger(logDir, logLevel);
    }

    private checkInitialized() {
        if (!ExtensionLogger.instance) {
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