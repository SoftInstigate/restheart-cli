import { logger } from './logger.js'

/**
 * Centralized error handling for the application
 */
export class ErrorHandler {
    /**
     * Handle an error
     * @param {Error} error The error to handle
     * @param {Object} options Options for error handling
     * @param {boolean} options.exitProcess Whether to exit the process
     * @param {number} options.exitCode Exit code to use
     * @param {boolean} options.showStack Whether to show the stack trace
     */
    static handleError(error, options = {}) {
        const { exitProcess = true, exitCode = 1, showStack = false } = options

        logger.error(`Error: ${error.message || 'Unknown error'}`)

        if (showStack && error.stack) {
            logger.debug(error.stack.split('\n').slice(1).join('\n'))
        }

        if (exitProcess) {
            process.exit(exitCode)
        }
    }

    /**
     * Handle a command not found error
     * @param {string} command The command that wasn't found
     * @param {Object} options Options for error handling
     */
    static commandNotFound(command, options = {}) {
        ErrorHandler.handleError(new Error(`${command} is required but not installed.`), options)
    }

    /**
     * Handle a configuration error
     * @param {string} message Error message
     * @param {Object} options Options for error handling
     */
    static configError(message, options = {}) {
        ErrorHandler.handleError(new Error(message), options)
    }

    /**
     * Handle a network error
     * @param {string} message Error message
     * @param {Object} options Options for error handling
     */
    static networkError(message, options = {}) {
        ErrorHandler.handleError(new Error(message), options)
    }

    /**
     * Handle a process error
     * @param {string} message Error message
     * @param {Object} options Options for error handling
     */
    static processError(message, options = {}) {
        ErrorHandler.handleError(new Error(message), options)
    }

    /**
     * Handle a file system error
     * @param {string} message Error message
     * @param {Object} options Options for error handling
     */
    static fileSystemError(message, options = {}) {
        ErrorHandler.handleError(new Error(message), options)
    }
}
