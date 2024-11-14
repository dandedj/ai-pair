const winston = require("winston");
const path = require("path");
const { format } = require("winston");

// Set the log level from the environment variable, defaulting to 'info' if not set
const logLevel = process.env.LOG_LEVEL || "info";

// Custom format to format the timestamp consistently
const timestampFormat = {
    format: () => {
        const now = new Date();
        return now.toISOString().split("T").join(" ").split(".")[0]; // YYYY-MM-DD HH:mm:ss
    },
};

// Custom format to include the filename and custom timestamp
const customFormat = format.combine(
    format.timestamp(timestampFormat),
    format.printf(({ level, message, timestamp, filename }) => {
        return `${timestamp} [${level.toUpperCase()}] [${filename}] ${message}`;
    })
);

const logger = winston.createLogger({
    level: logLevel,
    format: customFormat,
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({
            filename: path.join("tmp", "ai_pair.log"),
        }),
    ],
});

// Function to get the caller file name using native Error.stack
function getCallerFile() {
    const error = new Error();
    const stack = error.stack.split("\n");

    // Find the first line that's not from this file
    const callerLine = stack.find((line) => {
        return (
            line.includes(".js:") &&
            !line.includes("logger.js") &&
            !line.includes("node:internal/")
        );
    });

    if (callerLine) {
        // Extract filename from the stack trace
        const match = callerLine.match(/(?:at\s+(?:\S+\s+\()?)?([^:]+):\d+/);
        if (match && match[1]) {
            return path.basename(match[1]);
        }
    }

    return "unknown";
}

// Create a wrapper function for each log level that includes the filename
function createLogMethod(level) {
    return function (message) {
        const filename = getCallerFile();
        logger.log({ level, message, filename });
    };
}

// Export logging methods
module.exports = {
    debug: createLogMethod("debug"),
    info: createLogMethod("info"),
    warn: createLogMethod("warn"),
    error: createLogMethod("error"),
};
