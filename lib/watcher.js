import chokidar from 'chokidar'
import fs from 'node:fs'
import path from 'node:path'
import { ErrorHandler } from './error-handler.js'
import { logger } from './logger.js'
import { createSpinner } from './utils.js'

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
     * @param {string[]} watchOptions.ignored Patterns to ignore (default: dotfiles)
     */
    watchFiles(restheartOptions = '', watchOptions = {}) {
        try {
            const { repoDir, debugMode } = this.configManager.getAll()
            const defaultPaths = [path.join(repoDir, 'src/main/**/*.java')]

            // Parse restheartOptions to find RESTHeart config files passed with -o/--options
            const configFiles = parseConfigFiles(restheartOptions, repoDir)

            // Always watch pom.xml files (single or multi-module projects)
            const pomGlob = path.join(repoDir, '**/pom.xml')

            // Setup watch options with defaults
            const paths = watchOptions.paths || [...defaultPaths, pomGlob, ...configFiles]
            const debounceTime = watchOptions.debounceTime || 1000
            const ignored = watchOptions.ignored || /(^|[\\/])\../ // ignore dotfiles by default

            // Validate paths to watch exist. For globs, check the directory part; for explicit files, check file existence.
            for (const watchPath of paths) {
                validateWatchPath(watchPath)
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
                        await this.processFileUpdate(filePath, restheartOptions, configFiles)
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
                logger.status('\nWatching for file changes... 👀')
            })

            return watcher
        } catch (error) {
            ErrorHandler.processError(`Failed to initialize file watcher: ${error.message}`, {
                exitProcess: true,
                showStack: true,
            })
        }
    }

    async processFileUpdate(filePath, restheartOptions, configFiles = []) {
        const spinner = createSpinner(`File changed: ${path.relative(process.cwd(), filePath)}`)
        try {
            const absPath = path.resolve(filePath)
            const { repoDir } = this.configManager.getAll()

            const isJavaChange =
                absPath.endsWith('.java') && absPath.includes(path.join(repoDir, 'src', 'main'))
            const isPomChange = path.basename(absPath).toLowerCase() === 'pom.xml'

            const isConfigExplicit = configFiles.some((cfg) => path.resolve(cfg) === absPath)
            const isYamlOrProperties = ['.yml', '.yaml', '.properties'].some((ext) =>
                absPath.endsWith(ext)
            )
            const isConfigChange =
                isConfigExplicit || (isYamlOrProperties && !isJavaChange && !isPomChange)

            // Kill RESTHeart if it's running
            if (await this.processManager.isRunning()) {
                spinner.text = 'Stopping RESTHeart...'
                await this.processManager.kill()
            }

            if (isJavaChange || isPomChange) {
                // Full rebuild path
                spinner.text = 'Building project...'
                await this.builder.build('package', true)

                spinner.text = 'Deploying plugins...'
                await this.builder.deploy()

                spinner.text = 'Starting RESTHeart...'
                await this.processManager.run(restheartOptions)

                spinner.succeed('Build, deploy, and restart completed')
            } else if (isConfigChange) {
                // Config-only change: restart without rebuilding/deploying
                spinner.text = 'Restarting RESTHeart with updated configuration...'
                await this.processManager.run(restheartOptions)
                spinner.succeed('Restart completed (no build)')
            } else {
                // Unknown file type: fallback to full rebuild
                spinner.text = 'Unknown change type; performing full rebuild as fallback...'
                await this.builder.build('package', true)
                await this.builder.deploy()
                await this.processManager.run(restheartOptions)
                spinner.succeed('Rebuild and restart completed')
            }
        } catch (error) {
            ErrorHandler.processError(`File watcher error: ${error.message}`, {
                exitProcess: false,
                showStack: true,
            })
        }
    }
}

/**
 * Parse RESTHeart options string to extract config file paths (-o/--options arguments)
 * @param {string} restheartOptions Options string
 * @param {string} repoDir Repository directory for resolving relative paths
 * @returns {string[]} Resolved absolute config file paths
 */
export function parseConfigFiles(restheartOptions, repoDir) {
    const configFiles = []
    if (typeof restheartOptions === 'string' && restheartOptions.trim().length > 0) {
        // Match patterns: -o <file>, -o=<file>, --options <file>, --options=<file>
        const regex = /(?:-o|--options)(?:=|\s+)([^\s]+)/g
        let m
        while ((m = regex.exec(restheartOptions)) !== null) {
            if (m[1]) {
                const cfgPath = path.isAbsolute(m[1]) ? m[1] : path.join(repoDir, m[1])
                configFiles.push(cfgPath)
            }
        }
    }
    return configFiles
}

function validateWatchPath(watchPath) {
    if (
        watchPath.endsWith('pom.xml') ||
        watchPath.endsWith('.yml') ||
        watchPath.endsWith('.yaml') ||
        watchPath.endsWith('.properties')
    ) {
        if (watchPath.includes('**')) {
            const dirPath = watchPath.replace(/\*\*\/.*$/, '')
            if (!fs.existsSync(dirPath)) {
                logger.warning(`Watch path does not exist: ${dirPath}`)
            }
        } else if (!fs.existsSync(watchPath)) {
            logger.warning(`Watch file does not exist: ${watchPath}`)
        }
    } else {
        const dirPath = watchPath.replace(/\*\*\/.*$/, '')
        if (!fs.existsSync(dirPath)) {
            logger.warning(`Watch path does not exist: ${dirPath}`)
        }
    }
}
