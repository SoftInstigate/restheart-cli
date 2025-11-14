import chalk from 'chalk'
import { Builder } from './builder.js'
import { ConfigManager } from './config.js'
import { Installer } from './installer.js'
import { ProcessManager } from './process-manager.js'
import { msg } from './utils.js'
import { Watcher } from './watcher.js'

/**
 * Main RESTHeart Manager class that orchestrates all functionality
 */
export class RESTHeartManager {
    /**
     * Create a new RESTHeartManager
     * @param {number} httpPort The HTTP port to use
     * @param {boolean} debugMode Whether to run in debug mode
     */
    constructor(httpPort, debugMode) {
        // Initialize configuration
        this.configManager = new ConfigManager({
            httpPort: httpPort || 8080,
            debugMode: debugMode || false,
        })

        // Initialize components
        this.builder = new Builder(this.configManager)
        this.processManager = new ProcessManager(this.configManager)
        this.installer = new Installer(this.configManager, this.builder)
        this.watcher = new Watcher(this.configManager, this.processManager, this.builder)
    }

    /**
     * Print configuration
     */
    printConfiguration() {
        const config = this.configManager.getAll()
        msg(chalk.cyan('repoDir: ') + config.repoDir)
        msg(chalk.cyan('cacheDir: ') + config.cacheDir)
        msg(chalk.cyan('rhDir: ') + config.rhDir)
        msg(chalk.cyan('httpPort: ') + config.httpPort)
        msg(chalk.cyan('debugMode: ') + config.debugMode)
        msg('\n')
    }

    /**
     * Set HTTP port
     * @param {number} port HTTP port
     */
    setHttpPort(port) {
        this.configManager.set('httpPort', port)
    }

    /**
     * Set debug mode
     * @param {boolean} debug Debug mode
     */
    setDebugMode(debug) {
        this.configManager.set('debugMode', debug)
    }

    /**
     * Install RESTHeart
     * @param {string} restheartVersion RESTHeart version
     * @param {boolean} force Force reinstall
     */
    install(restheartVersion, force) {
        this.installer.install(restheartVersion, force)
    }

    /**
     * Build RESTHeart plugins
     * @param {string} mvnParams Maven parameters
     * @param {boolean} skipTests Skip tests
     */
    build(mvnParams, skipTests) {
        this.builder.build(mvnParams, skipTests)
    }

    /**
     * Deploy RESTHeart plugins
     */
    deploy() {
        this.builder.deploy()
    }

    /**
     * Run RESTHeart
     * @param {string} restheartOptions RESTHeart options
     */
    async run(restheartOptions) {
        await this.processManager.run(restheartOptions)
    }

    /**
     * Check if configuration is being printed
     * @param {string} restheartOptions RESTHeart options
     * @returns {boolean} True if configuration is being printed
     */
    onlyPrintConfig(restheartOptions) {
        return this.processManager.onlyPrintConfig(restheartOptions)
    }

    /**
     * Kill RESTHeart
     */
    async kill() {
        await this.processManager.kill()
    }

    /**
     * Check if RESTHeart is running
     * @returns {Promise<boolean>} True if RESTHeart is running
     */
    async isRunning() {
        return await this.processManager.isRunning()
    }

    /**
     * Show RESTHeart status
     */
    async status() {
        await this.processManager.status()
    }

    /**
     * Check if RESTHeart is running and kill it
     */
    async checkAndKill() {
        await this.processManager.checkAndKill()
    }

    /**
     * Watch for file changes
     * @param {string} restheartOptions RESTHeart options
     */
    watchFiles(restheartOptions) {
        this.watcher.watchFiles(restheartOptions)
    }
}

export { msg } from './utils.js'
