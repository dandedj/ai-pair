const { createLogger, format, transports } = require('winston');
const config = require('../models/Config');

const logger = createLogger({
    level: config.LOG_LEVEL || 'info',
    format: format.combine(
        format.timestamp(),
        format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level}]: ${message}`;
        })
    ),
    transports: [new transports.Console()],
});

module.exports = logger;
