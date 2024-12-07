export interface ILogger {
    debug(message: string): void;
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
}

class WebviewLogger implements ILogger {
    debug(message: string) {
        console.log(`[DEBUG] ${message}`);
    }

    info(message: string) {
        console.log(`[INFO] ${message}`);
    }

    warn(message: string) {
        console.warn(`[WARN] ${message}`);
    }

    error(message: string) {
        console.error(`[ERROR] ${message}`);
    }
}

export const logger = new WebviewLogger(); 