import fs from 'node:fs'
import path from 'node:path'
import psList from 'ps-list'
import shell from 'shelljs'
import yaml from 'js-yaml'
import { ErrorHandler } from './error-handler.js'
import { logger } from './logger.js'
import { checkPort, commandExists, createSpinner } from './utils.js'

const isRestheartProcess = (proc) => proc.name === 'java' && proc.cmd.includes('restheart')

/**
 * Manages the RESTHeart process
 */
export class ProcessManager {
    /**
     * Create a new ProcessManager
     * @param {ConfigManager} configManager The configuration manager
     */
    constructor(configManager) {
        this.configManager = configManager
        // Capture the original RHO environment variable at startup to prevent duplication on restart
        this.originalRHO = process.env['RHO'] || ''
    }

    /**
     * Parse RESTHeart options to find the config file path
     * @param {string} restheartOptions Options string
     * @returns {string|null} Config file path or null if not found
     */
    parseConfigPath(restheartOptions) {
        const args = restheartOptions.trim().split(/\s+/)
        for (let i = 0; i < args.length; i++) {
            if (args[i] === '-o' && i + 1 < args.length) {
                return args[i + 1]
            }
        }
        return null
    }

    /**
     * Get host and port from config file
     * @param {string} configPath Path to config file
     * @returns {Object} { host: string, port: number } or defaults
     */
    getHostAndPortFromConfig(configPath) {
        try {
            if (!configPath || !fs.existsSync(configPath)) {
                return { host: 'localhost', port: this.configManager.get('httpPort') }
            }
            const configContent = fs.readFileSync(configPath, 'utf8')
            const config = yaml.load(configContent)
            const httpListener = config?.['/http-listener'] || {}
            const host = httpListener.host || 'localhost'
            const port = httpListener.port || this.configManager.get('httpPort')
            return { host, port }
        } catch (error) {
            logger.warning(
                `Failed to parse config file ${configPath}: ${error.message}. Using defaults.`
            )
            return { host: 'localhost', port: this.configManager.get('httpPort') }
        }
    }

    /**
     * Kill the RESTHeart process
     */
    async kill() {
        try {
            const httpPort = this.configManager.get('httpPort')
            logger.status(`\nKilling RESTHeart at localhost:${httpPort} 💀`)

            // Prefer lsof to target only the process bound to the configured port.
            // Fall back to ps-list if lsof is unavailable or returns nothing.
            let pidsToKill = []
            const lsofResult = shell.exec(`lsof -ti tcp:${httpPort}`, { silent: true })
            if (lsofResult.code === 0 && lsofResult.stdout.trim()) {
                pidsToKill = lsofResult.stdout.trim().split('\n').map(Number).filter(Boolean)
            } else {
                const processes = await psList()
                pidsToKill = processes.filter(isRestheartProcess).map((p) => p.pid)
            }

            if (pidsToKill.length === 0) {
                logger.info('Process restheart not found')
                return
            }

            for (const pid of pidsToKill) {
                try {
                    process.kill(pid, 'SIGTERM')
                    logger.info(`Process ${pid} killed\n`)
                } catch (err) {
                    logger.error(`Failed to kill process ${pid}: ${err.message}\n`)
                }
            }

            // Wait for the configured port to be freed
            const waitTimeoutSec = 15
            let waited = 0
            while (waited < waitTimeoutSec) {
                if (!(await this.isRunning())) break
                await new Promise((r) => setTimeout(r, 1000))
                waited++
            }

            // Force-kill if still running after timeout
            if (await this.isRunning()) {
                logger.warning('Process did not exit after SIGTERM, sending SIGKILL')
                for (const pid of pidsToKill) {
                    try {
                        process.kill(pid, 'SIGKILL')
                        logger.info(`Process ${pid} force-killed\n`)
                    } catch (err) {
                        logger.error(`Failed to SIGKILL process ${pid}: ${err.message}\n`)
                    }
                }
            }
        } catch (error) {
            ErrorHandler.processError(`Failed to kill RESTHeart: ${error.message}`, {
                exitProcess: false,
                showStack: true,
            })
        }
    }

    /**
     * Check if RESTHeart is running
     * @returns {Promise<boolean>} True if RESTHeart is running, false otherwise
     */
    async isRunning() {
        try {
            const httpPort = this.configManager.get('httpPort')
            const debugMode = this.configManager.get('debugMode')

            const isRunningOnHttpPort = await checkPort(httpPort)
            const isRunningOnHttpPortPlus1000 = await checkPort(httpPort + 1000)

            if (debugMode) {
                logger.debug(`isRunningOnHttpPort: ${isRunningOnHttpPort}`)
                logger.debug(`isRunningOnHttpPortPlus1000: ${isRunningOnHttpPortPlus1000}`)
            }

            return isRunningOnHttpPort || isRunningOnHttpPortPlus1000
        } catch (error) {
            ErrorHandler.processError(`Failed to check if RESTHeart is running: ${error.message}`, {
                exitProcess: false,
                showStack: true,
            })
            return false
        }
    }

    /**
     * Show the status of RESTHeart
     */
    async status() {
        try {
            const httpPort = this.configManager.get('httpPort')

            if (await this.isRunning()) {
                logger.success('RESTHeart is running at localhost:' + httpPort)
            } else {
                logger.status('RESTHeart is not running at localhost:' + httpPort)
            }
        } catch (error) {
            ErrorHandler.processError(`Failed to get RESTHeart status: ${error.message}`, {
                exitProcess: false,
                showStack: true,
            })
        }
    }

    /**
     * Check if RESTHeart is running and kill it if it is
     */
    async checkAndKill() {
        try {
            if (await this.isRunning()) {
                await this.kill()
            } else {
                logger.status('RESTHeart is not running: nothing to kill')
            }
        } catch (error) {
            ErrorHandler.processError(`Failed to check and kill RESTHeart: ${error.message}`, {
                exitProcess: false,
                showStack: true,
            })
        }
    }

    /**
     * Check if the command is only printing configuration
     * @param {string} restheartOptions RESTHeart options
     * @returns {boolean} True if only printing configuration
     */
    onlyPrintConfig(restheartOptions) {
        return /(\s|^)-t(\s|$)|(\s|^)-c(\s|$)|(\s|^)-v(\s|$)/.test(restheartOptions)
    }

    /**
     * Run RESTHeart
     * @param {string} restheartOptions Options to pass to RESTHeart
     */
    async run(restheartOptions = '') {
        try {
            const { rhDir, httpPort, repoDir } = this.configManager.getAll()

            // Check if java is installed
            commandExists('java')

            // Check if the command is only for printing configuration
            if (this.onlyPrintConfig(restheartOptions)) {
                shell.exec(`java -jar ${path.join(rhDir, 'restheart.jar')} ${restheartOptions}`)
                return
            }

            // Validate the RESTHeart jar existence
            const restheartJarPath = path.join(rhDir, 'restheart.jar')
            if (!fs.existsSync(restheartJarPath)) {
                ErrorHandler.fileSystemError(
                    `RESTHeart jar not found at ${restheartJarPath}. Try running 'rh install' first.`,
                    {
                        exitProcess: true,
                        showStack: false,
                    }
                )
            }

            // Set RHO environment variable without duplication
            // Use the original RHO captured at startup to prevent appending on each restart
            const extra = `/http-listener/port->${httpPort};/logging/full-stacktrace->true;`
            shell.env['RHO'] = this.originalRHO ? `${this.originalRHO};${extra}` : extra

            // Check if nohup is available
            const nohup = shell.which('nohup') || ''
            if (nohup === '') {
                logger.warning('Warning: "nohup" not found.')
            }

            // Prepare the command
            const command = `${nohup} java -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=0.0.0.0:${httpPort + 1000} -jar ${restheartJarPath} ${restheartOptions} &> ${path.join(repoDir, 'restheart.log')} &`

            logger.status('\nStarting RESTHeart with:')
            logger.log(`\tRHO="${shell.env['RHO']}"`)
            logger.log(`\tOptions: "${restheartOptions}"\n`)

            // Execute the command
            const execResult = shell.exec(command, { async: true })
            if (execResult.code !== 0 && execResult.code !== undefined) {
                ErrorHandler.processError(`Failed to execute command: ${command}`, {
                    exitProcess: true,
                    showStack: false,
                })
            }

            // Wait for RESTHeart to start
            const spinner = createSpinner('RESTHeart is starting...\n')
            let timeout = 30
            let isRunning = false

            while (timeout > 0) {
                spinner.render()
                await new Promise((resolve) => setTimeout(resolve, 200))

                try {
                    isRunning = await this.isRunning()
                    if (isRunning) break
                } catch (error) {
                    logger.debug(`Error checking if running: ${error.message}`)
                }

                timeout--
            }

            if (!isRunning) {
                spinner.fail('Failed to start RESTHeart within timeout period')

                // Check log file for errors
                if (fs.existsSync(path.join(repoDir, 'restheart.log'))) {
                    const logContent = fs
                        .readFileSync(path.join(repoDir, 'restheart.log'), 'utf8')
                        .slice(-1000)
                    logger.error('Last 1000 characters from log:')
                    logger.log(logContent)
                }

                ErrorHandler.processError('RESTHeart failed to start', {
                    exitProcess: true,
                    showStack: false,
                })
            }

            const configPath = this.parseConfigPath(restheartOptions)
            const { host, port } = this.getHostAndPortFromConfig(configPath)

            spinner.succeed(`RESTHeart is running at ${host}:${port} 🚀`)
            logger.info(`\nJDWP available for debuggers at localhost:${httpPort + 1000}`)
        } catch (error) {
            ErrorHandler.processError(`Failed to run RESTHeart: ${error.message}`, {
                exitProcess: true,
                showStack: true,
            })
        }
    }
}
