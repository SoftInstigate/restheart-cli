import fs from 'node:fs'
import net from 'node:net'
import ora from 'ora'
import shell from 'shelljs'
import { ErrorHandler } from './error-handler.js'

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
    const hosts = ['127.0.0.1', '::1']

    return new Promise((resolve) => {
        let index = 0

        const tryNextHost = () => {
            if (index >= hosts.length) {
                resolve(false)
                return
            }

            const host = hosts[index++]
            const client = net.createConnection({ host, port })
            let settled = false

            const finalize = (result) => {
                if (settled) {
                    return
                }
                settled = true
                resolve(result)
            }

            const fallback = () => {
                if (settled) {
                    return
                }
                settled = true
                tryNextHost()
            }

            client.setTimeout(2000)
            client.on('connect', () => {
                client.end()
                finalize(true)
            })
            client.on('timeout', () => {
                client.destroy()
                fallback()
            })
            client.on('error', () => {
                fallback()
            })
        }

        tryNextHost()
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
