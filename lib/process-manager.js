import fs from 'fs'
import path from 'path'
import psList from 'ps-list'
import shell from 'shelljs'
import { ErrorHandler } from './error-handler.js'
import { checkPort, commandExists, createSpinner, logger, msg } from './utils.js'
import { Logger } from './logger.js'

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
    }

    /**
     * Kill the RESTHeart process
     */
    async kill() {
        try {
            const httpPort = this.configManager.get('httpPort')
            logger.warning(`Killing RESTHeart at localhost:${httpPort} 💀`)

            const processes = await psList()
            const filteredProcesses = processes.filter(
                (proc) => proc.name === 'java' && proc.cmd.includes('restheart')
            )

            if (filteredProcesses.length === 0) {
                logger.info(`Process restheart not found`)
                return
            }

            for (const proc of filteredProcesses) {
                try {
                    process.kill(proc.pid, 'SIGTERM')
                    logger.info(`Process ${proc.pid} killed`)
                } catch (err) {
                    logger.error(`Failed to kill process ${proc.pid}: ${err.message}`)
                }
            }
        } catch (error) {
            ErrorHandler.processError(`Failed to kill RESTHeart: ${error.message}`, {
                exitProcess: false,
                showStack: true
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
                showStack: true
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
                logger.warning('RESTHeart is not running at localhost:' + httpPort)
            }
        } catch (error) {
            ErrorHandler.processError(`Failed to get RESTHeart status: ${error.message}`, {
                exitProcess: false,
                showStack: true
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
                logger.warning('RESTHeart is not running: nothing to kill')
            }
        } catch (error) {
            ErrorHandler.processError(`Failed to check and kill RESTHeart: ${error.message}`, {
                exitProcess: false,
                showStack: true
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
            const { rhDir, httpPort, repoDir, debugMode } = this.configManager.getAll()

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
                ErrorHandler.fileSystemError(`RESTHeart jar not found at ${restheartJarPath}. Try running 'rh install' first.`, {
                    exitProcess: true,
                    showStack: false
                })
            }

            // Set RHO environment variable without duplication
            // Use the original RHO from process.env if present, otherwise default
            const baseRHO = process.env['RHO'] || '';
            const extra = `/http-listner/port->${httpPort};/logging/full-stacktrace->true;`;
            shell.env['RHO'] = baseRHO
                ? `${baseRHO};${extra}`
                : extra;

            // Check if nohup is available
            const nohup = shell.which('nohup') || ''
            if (nohup === '') {
                logger.warning('Warning: "nohup" not found.')
            }

            // Prepare the command
            const command = `${nohup} java -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=0.0.0.0:${httpPort + 1000} -jar ${restheartJarPath} ${restheartOptions} &> ${path.join(repoDir, 'restheart.log')} &`

            logger.warning('Starting RESTHeart with:')
            msg(`\tRHO="${shell.env['RHO']}"`)
            msg(`\tOptions: "${restheartOptions}"\n`)

            // Execute the command
            const execResult = shell.exec(command, { async: true })
            if (execResult.code !== 0 && execResult.code !== undefined) {
                ErrorHandler.processError(`Failed to execute command: ${command}`, {
                    exitProcess: true,
                    showStack: false
                })
            }

            // Wait for RESTHeart to start
            const spinner = createSpinner('RESTHeart is starting...\n')
            let timeout = 30
            let isRunning = false

            while (timeout > 0) {
                spinner.render()
                await new Promise(resolve => setTimeout(resolve, 200))

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
                    const logContent = fs.readFileSync(path.join(repoDir, 'restheart.log'), 'utf8').slice(-1000)
                    logger.error('Last 1000 characters from log:')
                    msg(logContent)
                }

                ErrorHandler.processError('RESTHeart failed to start', {
                    exitProcess: true,
                    showStack: false
                })
            }

            spinner.succeed(`RESTHeart is running at localhost:${httpPort} 🚀`)
            logger.info(`\nJDWP available for debuggers at localhost:${httpPort + 1000}`)
        } catch (error) {
            ErrorHandler.processError(`Failed to run RESTHeart: ${error.message}`, {
                exitProcess: true,
                showStack: true
            })
        }
    }
}