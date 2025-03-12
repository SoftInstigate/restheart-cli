import path from 'path'
import psList from 'ps-list'
import shell from 'shelljs'
import { checkPort, createSpinner, logger, msg } from './utils.js'

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

        filteredProcesses.forEach((proc) => {
            try {
                process.kill(proc.pid, 'SIGTERM')
                logger.info(`Process ${proc.pid} killed`)
            } catch (err) {
                logger.error(`Failed to kill process ${proc.pid}: ${err}`)
            }
        })
    }

    /**
     * Check if RESTHeart is running
     * @returns {Promise<boolean>} True if RESTHeart is running, false otherwise
     */
    async isRunning() {
        const httpPort = this.configManager.get('httpPort')
        const debugMode = this.configManager.get('debugMode')

        const isRunningOnHttpPort = await checkPort(httpPort)
        const isRunningOnHttpPortPlus1000 = await checkPort(httpPort + 1000)

        if (debugMode) {
            logger.debug(`isRunningOnHttpPort: ${isRunningOnHttpPort}`, debugMode)
            logger.debug(`isRunningOnHttpPortPlus1000: ${isRunningOnHttpPortPlus1000}`, debugMode)
        }

        return isRunningOnHttpPort || isRunningOnHttpPortPlus1000
    }

    /**
     * Show the status of RESTHeart
     */
    async status() {
        const httpPort = this.configManager.get('httpPort')

        if (await this.isRunning()) {
            logger.success('RESTHeart is running at localhost:' + httpPort)
        } else {
            logger.warning('RESTHeart is not running at localhost:' + httpPort)
        }
    }

    /**
     * Check if RESTHeart is running and kill it if it is
     */
    async checkAndKill() {
        if (await this.isRunning()) {
            await this.kill()
        } else {
            logger.warning('RESTHeart is not running: nothing to kill')
        }
    }

    /**
     * Check if the command is only printing configuration
     * @param {string} restheartOptions RESTHeart options
     * @returns {boolean} True if only printing configuration
     */
    onlyPrintConfig(restheartOptions) {
        return /.*-t.*|.*-c.*|.*-v.*/.test(restheartOptions)
    }

    /**
     * Run RESTHeart
     * @param {string} restheartOptions Options to pass to RESTHeart
     */
    async run(restheartOptions = '') {
        try {
            const { rhDir, httpPort, repoDir, debugMode } = this.configManager.getAll()

            // Check if java is installed
            if (!shell.which('java')) {
                logger.error('Java is required but not installed.')
                shell.exit(1)
            }

            // Check if the command is only for printing configuration
            if (this.onlyPrintConfig(restheartOptions)) {
                shell.exec(`java -jar ${path.join(rhDir, 'restheart.jar')} ${restheartOptions}`)
                return
            }

            // Set RHO environment variable
            shell.env['RHO'] = shell.env['RHO']
                ? `${shell.env['RHO']};/http-listner/port->${httpPort};/logging/full-stacktrace->true;`
                : `/http-listner/port->${httpPort};/logging/full-stacktrace->true;`

            // Check if nohup is available
            const nohup = shell.which('nohup') || ''
            if (nohup === '') {
                logger.warning('Warning: "nohup" not found.')
            }

            // Prepare the command
            const command = `${nohup} java -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=0.0.0.0:${httpPort + 1000} -jar ${path.join(rhDir, 'restheart.jar')} ${restheartOptions} &> ${path.join(repoDir, 'restheart.log')} &`

            logger.warning('Starting RESTHeart with:')
            msg(`\tRHO="${shell.env['RHO']}"`)
            msg(`\tOptions: "${restheartOptions}"\n`)

            // Execute the command
            shell.exec(command, { async: true })

            // Wait for RESTHeart to start
            const spinner = createSpinner('RESTHeart is starting...\n')
            let timeout = 30
            while (!(await this.isRunning())) {
                spinner.render()
                await new Promise(resolve => setTimeout(resolve, 200))
                if (timeout-- <= 0) {
                    spinner.fail('Failed to start RESTHeart')
                    shell.exit(1)
                }
            }
            spinner.succeed(`RESTHeart is running at localhost:${httpPort} 🚀`)

            logger.info(`\nJDWP available for debuggers at localhost:${httpPort + 1000}`)
        } catch (error) {
            logger.error(`Failed to run RESTHeart: ${error.message}`)
            shell.exit(1)
        }
    }
}