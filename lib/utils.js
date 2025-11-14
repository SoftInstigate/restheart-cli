import fs from 'fs'
import net from 'net'
import ora from 'ora'
import shell from 'shelljs'
import { ErrorHandler } from './error-handler.js'
import { logger } from './logger.js'

/**
 * Log a message to the console
 * @param {string} message The message to log
 */
export function msg(message) {
    console.log(message)
}

/**
 * Check if a command exists
 * @param {string} command The command to check
 * @throws {Error} If the command does not exist
 */
export function commandExists(command) {
    if (!shell.which(command)) {
        ErrorHandler.commandNotFound(command, {
            showStack: false,
            exitProcess: true,
        })
    }
}

/**
 * Check if a port is in use
 * @param {number} port The port to check
 * @returns {Promise<boolean>} True if the port is in use, false otherwise
 */
export function checkPort(port) {
    return new Promise((resolve) => {
        const client = net.createConnection({ port }, () => {
            client.end()
            resolve(true)
        })
        client.on('error', () => {
            resolve(false)
        })
    })
}

/**
 * Create a spinner with a message
 * @param {string} message The message to display
 * @returns {ora.Ora} The spinner instance
 */
export function createSpinner(message) {
    return ora(message).start()
}

/**
 * Create directory if it doesn't exist
 * @param {string} dir Directory path
 */
export function ensureDir(dir) {
    try {
        if (!fs.existsSync(dir)) {
            shell.mkdir('-p', dir)
        }
    } catch {
        ErrorHandler.fileSystemError(`Could not create directory: ${dir}`, {
            showStack: false,
            exitProcess: true,
        })
    }
}

// Re-export the logger for backward compatibility
export { logger }
