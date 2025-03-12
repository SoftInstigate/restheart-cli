import chokidar from 'chokidar'
import path from 'path'
import { logger, msg } from './utils.js'

/**
 * File watcher for RESTHeart development
 */
export class Watcher {
    /**
     * Create a new Watcher
     * @param {ConfigManager} configManager The configuration manager
     * @param {ProcessManager} processManager The process manager
     * @param {Builder} builder The builder instance
     */
    constructor(configManager, processManager, builder) {
        this.configManager = configManager
        this.processManager = processManager
        this.builder = builder
    }

    /**
     * Watch for file changes and rebuild, deploy and restart RESTHeart when changes are detected
     * @param {string} restheartOptions Options to pass to RESTHeart
     * @param {Object} watchOptions Additional options for the watcher
     * @param {string[]} watchOptions.paths Paths to watch 
     * @param {number} watchOptions.debounceTime Debounce time in ms (default: 1000)
     */
    watchFiles(restheartOptions = '', watchOptions = {}) {
        const { repoDir } = this.configManager.getAll()
        const paths = watchOptions.paths || [path.join(repoDir, 'src/main/**/*.java')]
        const debounceTime = watchOptions.debounceTime || 1000

        logger.warning('\nWatching for file changes... 👀')

        const watcher = chokidar.watch(paths, {
            ignored: /(^|[\\/])\../, // ignore dotfiles
            persistent: true,
            awaitWriteFinish: {
                stabilityThreshold: 1000,
                pollInterval: 200,
            },
        })

        // Debounce function to limit the number of times the handler is called
        let debounceTimeoutId

        watcher.on('change', async (filePath) => {
            // Clear any existing timeout to reset the debounce period
            clearTimeout(debounceTimeoutId)

            // Set a new timeout
            debounceTimeoutId = setTimeout(async () => {
                // Handler code to execute once after the last change event in the interval
                msg(`File changed: ${filePath}`)
                try {
                    if (await this.processManager.isRunning()) {
                        await this.processManager.kill()
                    }

                    this.builder.build('package', true)
                    this.builder.deploy()
                    await this.processManager.run(restheartOptions)

                    logger.warning('\nWatching for file changes...')
                } catch (error) {
                    logger.error(`Error while handling file change: ${error.message}`)
                }
            }, debounceTime)
        })

        return watcher
    }
}