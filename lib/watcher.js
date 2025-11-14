import chokidar from 'chokidar'
import fs from 'fs'
import path from 'path'
import { ErrorHandler } from './error-handler.js'
import { createSpinner, logger } from './utils.js'

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
     * @param { number } watchOptions.debounceTime Debounce time in ms(default: 1000)
     * @param { string[] } watchOptions.ignored Patterns to ignore(default: dotfiles)
     */
    watchFiles(restheartOptions = '', watchOptions = {}) {
        try {
            const { repoDir, debugMode } = this.configManager.getAll()
            const defaultPaths = [path.join(repoDir, 'src/main/**/*.java')]

            // Setup watch options with defaults
            const paths = watchOptions.paths || defaultPaths
            const debounceTime = watchOptions.debounceTime || 1000
            const ignored = watchOptions.ignored || /(^|[\\/])\../ // ignore dotfiles by default

            // Validate paths to watch exist
            for (const watchPath of paths) {
                // Convert glob patterns to directories
                const dirPath = watchPath.replace(/\*\*\/.*$/, '')
                if (!fs.existsSync(dirPath)) {
                    logger.warning(`Watch path does not exist: ${dirPath}`)
                }
            }

            if (debugMode) {
                logger.debug(`Watching paths: ${JSON.stringify(paths)}`)
                logger.debug(`Debounce time: ${debounceTime}ms`)
            }

            // Initialize the watcher
            const watcher = chokidar.watch(paths, {
                ignored: ignored,
                persistent: true,
                awaitWriteFinish: {
                    stabilityThreshold: 1000,
                    pollInterval: 200,
                },
            })

            // Debounce function to limit the number of times the handler is called
            let debounceTimeoutId
            let isProcessing = false

            // Handle file change events
            watcher.on('change', async (filePath) => {
                // Clear any existing timeout to reset the debounce period
                clearTimeout(debounceTimeoutId)

                // Set a new timeout
                debounceTimeoutId = setTimeout(async () => {
                    // Skip if already processing a change
                    if (isProcessing) {
                        logger.warning('Already processing a change, skipping...')
                        return
                    }

                    isProcessing = true

                    try {
                        const spinner = createSpinner(
                            `File changed: ${path.relative(process.cwd(), filePath)}`
                        )

                        // Kill RESTHeart if it's running
                        if (await this.processManager.isRunning()) {
                            spinner.text = 'Stopping RESTHeart...'
                            await this.processManager.kill()
                        }

                        // Build the project
                        spinner.text = 'Building project...'
                        this.builder.build('package', true)

                        // Deploy the plugins
                        spinner.text = 'Deploying plugins...'
                        this.builder.deploy()

                        // Run RESTHeart
                        spinner.text = 'Starting RESTHeart...'
                        await this.processManager.run(restheartOptions)

                        spinner.succeed('Build, deploy, and restart completed')
                    } catch (error) {
                        ErrorHandler.processError(`File watcher error: ${error.message}`, {
                            exitProcess: false,
                            showStack: true,
                        })
                    } finally {
                        isProcessing = false
                    }
                }, debounceTime)
            })

            // Handle watcher errors
            watcher.on('error', (error) => {
                ErrorHandler.processError(`Watcher error: ${error.message}`, {
                    exitProcess: false,
                    showStack: true,
                })
            })

            // Log when watcher is ready
            watcher.on('ready', () => {
                logger.warning('\nWatching for file changes... 👀')
            })

            return watcher
        } catch (error) {
            ErrorHandler.processError(`Failed to initialize file watcher: ${error.message}`, {
                exitProcess: true,
                showStack: true,
            })
        }
    }
}
