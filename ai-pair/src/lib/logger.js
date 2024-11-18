const { createLogger, format, transports } = require("winston");
const path = require("path");

const logger = createLogger({
    level: "info", // Default logging level
    format: format.combine(
        format.timestamp(),
        format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level.toUpperCase()}]: ${message}`;
        })
    ),
    transports: [],
});

/**
 * Configures the logger with the provided settings.
 * @param {Object} options - Logger configuration options.
 * @param {string} [options.logDirectory] - Directory for log files.
 * @param {string} [options.logLevel] - Logging level (e.g., 'debug', 'info').
 */
function configureLogger({ logDirectory, logLevel } = {}) {
    // throw an error if logLevel is not provided
    if (!logLevel) {
        throw new Error("Log level is not provided");
    }
    // throw an error if logDirectory is not provided
    if (!logDirectory) {
        throw new Error("Log directory is not provided");
    }

    // Set the logging level
    logger.level = logLevel;

    // Clear existing transports
    logger.clear();

    // Add Console transport with the specified level
    logger.add(new transports.Console({ level: logLevel }));

    // Add File transport if logDirectory is specified, with the specified level
    if (logDirectory) {
        const logFilePath = path.join(logDirectory, "app.log");
        logger.add(
            new transports.File({ filename: logFilePath, level: logLevel })
        );
    }
}

module.exports = {
    logger,
    configureLogger,
};
