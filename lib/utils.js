import chalk from 'chalk'
import fs from 'fs'
import net from 'net'
import ora from 'ora'
import shell from 'shelljs'

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
        throw new Error(`${command} is required but not installed.`)
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
    if (!fs.existsSync(dir)) {
        shell.mkdir('-p', dir)
    }
}

/**
 * Format messages with colors
 */
export const logger = {
    info: (message) => msg(chalk.cyan(message)),
    success: (message) => msg(chalk.green(message)),
    warning: (message) => msg(chalk.yellow(message)),
    error: (message) => msg(chalk.red(message)),
    debug: (message, debugMode = false) => {
        if (debugMode) {
            msg(chalk.cyan(`[DEBUG] ${message}`))
        }
    }
}