import chalk from 'chalk'

/**
 * Log levels
 * @enum {number}
 */
export const LogLevel = {
    DEBUG: 0,
    INFO: 1,
    SUCCESS: 2,
    WARNING: 3,
    ERROR: 4,
}

/**
 * Enhanced logger for application
 */
export class Logger {
    /**
     * Create a new Logger
     * @param {Object} options Logger options
     * @param {LogLevel} options.level Minimum log level to display
     * @param {boolean} options.timestamps Whether to show timestamps
     * @param {Function} options.outputFn Output function (defaults to console.log)
     */
    constructor(options = {}) {
        this.level = options.level !== undefined ? options.level : LogLevel.INFO
        this.timestamps = options.timestamps !== undefined ? options.timestamps : false
        this.outputFn = options.outputFn || console.log
    }

    /**
     * Format log message with optional timestamp
     * @param {string} message Message to log
     * @returns {string} Formatted message
     */
    formatMessage(message) {
        if (this.timestamps) {
            const timestamp = new Date().toISOString()
            return `[${timestamp}] ${message}`
        }
        return message
    }

    /**
     * Log a debug message
     * @param {string} message Message to log
     */
    debug(message) {
        if (this.level <= LogLevel.DEBUG) {
            this.outputFn(this.formatMessage(chalk.gray(`[DEBUG] ${message}`)))
        }
    }

    /**
     * Log an info message
     * @param {string} message Message to log
     */
    info(message) {
        if (this.level <= LogLevel.INFO) {
            this.outputFn(this.formatMessage(chalk.cyan(message)))
        }
    }

    /**
     * Log a success message
     * @param {string} message Message to log
     */
    success(message) {
        if (this.level <= LogLevel.SUCCESS) {
            this.outputFn(this.formatMessage(chalk.green(message)))
        }
    }

    /**
     * Log a warning message
     * @param {string} message Message to log
     */
    warning(message) {
        if (this.level <= LogLevel.WARNING) {
            this.outputFn(this.formatMessage(chalk.yellow(message)))
        }
    }

    /**
     * Log an error message
     * @param {string} message Message to log
     */
    error(message) {
        if (this.level <= LogLevel.ERROR) {
            this.outputFn(this.formatMessage(chalk.red(message)))
        }
    }

    /**
     * Log a plain message (always shown)
     * @param {string} message Message to log
     */
    log(message) {
        this.outputFn(this.formatMessage(message))
    }

    /**
     * Set the log level
     * @param {LogLevel} level New log level
     */
    setLevel(level) {
        this.level = level
    }

    /**
     * Enable or disable timestamps
     * @param {boolean} enabled Whether timestamps should be enabled
     */
    setTimestamps(enabled) {
        this.timestamps = enabled
    }
}

// Create a default logger instance
export const logger = new Logger()