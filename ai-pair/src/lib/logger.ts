import { createLogger, format, transports, Logger } from 'winston';
import path from 'path';
import fs from 'fs';

interface LoggerOptions {
    logDirectory: string;
    logLevel: string;
}

const logger: Logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp(),
        format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}]: ${message}`;
        })
    ),
    transports: [],
});

function configureLogger({ logDirectory, logLevel }: LoggerOptions): void {
    if (!logLevel) {
        throw new Error('Log level is not provided');
    }
    if (!logDirectory) {
        throw new Error('Log directory is not provided');
    }

    if (!fs.existsSync(logDirectory)) {
        fs.mkdirSync(logDirectory, { recursive: true });
    }

    logger.level = logLevel;
    logger.clear();

    logger.add(new transports.Console({ level: logLevel }));

    const logFilePath = path.join(logDirectory, 'app.log');
    logger.add(new transports.File({ filename: logFilePath, level: logLevel }));
}

export { logger, configureLogger, LoggerOptions }; 