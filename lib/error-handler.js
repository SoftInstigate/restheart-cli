import chalk from 'chalk'

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
     * @param {Function} options.logger Logger function to use
     * @param {boolean} options.showStack Whether to show the stack trace
     */
    static handleError(error, options = {}) {
        const {
            exitProcess = true,
            exitCode = 1,
            logger = console.error,
            showStack = false
        } = options

        // Create error message
        const errorMessage = chalk.red(`Error: ${error.message || 'Unknown error'}`)

        // Log the error
        logger(errorMessage)

        // Show stack trace if requested
        if (showStack && error.stack) {
            logger(chalk.gray(error.stack.split('\n').slice(1).join('\n')))
        }

        // Exit process if requested
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
        const error = new Error(`${command} is required but not installed.`)
        ErrorHandler.handleError(error, options)
    }

    /**
     * Handle a configuration error
     * @param {string} message Error message
     * @param {Object} options Options for error handling
     */
    static configError(message, options = {}) {
        const error = new Error(`Configuration error: ${message}`)
        ErrorHandler.handleError(error, options)
    }

    /**
     * Handle a network error
     * @param {string} message Error message
     * @param {Object} options Options for error handling
     */
    static networkError(message, options = {}) {
        const error = new Error(`Network error: ${message}`)
        ErrorHandler.handleError(error, options)
    }

    /**
     * Handle a process error
     * @param {string} message Error message
     * @param {Object} options Options for error handling
     */
    static processError(message, options = {}) {
        const error = new Error(`Process error: ${message}`)
        ErrorHandler.handleError(error, options)
    }

    /**
     * Handle a file system error
     * @param {string} message Error message
     * @param {Object} options Options for error handling
     */
    static fileSystemError(message, options = {}) {
        const error = new Error(`File system error: ${message}`)
        ErrorHandler.handleError(error, options)
    }
}