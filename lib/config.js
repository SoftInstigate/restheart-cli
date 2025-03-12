import fs from 'fs'
import path from 'path'
import { ErrorHandler } from './error-handler.js'
import { ensureDir, logger } from './utils.js'

/**
 * Configuration manager for RESTHeart CLI
 */
export class ConfigManager {
    /**
     * Create a new ConfigManager
     * @param {Object} options Configuration options
     */
    constructor(options = {}) {
        try {
            const repoDir = process.cwd()
            const cacheDir = options.cacheDir || path.join(repoDir, '.cache')
            const rhDir = options.rhDir || path.join(cacheDir, 'restheart')

            this.config = {
                repoDir: repoDir,
                cacheDir: cacheDir,
                rhDir: rhDir,
                httpPort: options.httpPort || 8080,
                debugMode: options.debugMode || false
            }

            // Ensure cache directory exists
            this.ensureCacheDirs()

            // Validate configuration
            this.validateConfig()
        } catch (error) {
            ErrorHandler.configError(`Configuration initialization failed: ${error.message}`, {
                exitProcess: true,
                showStack: true
            })
        }
    }

    /**
     * Ensure cache directories exist
     */
    ensureCacheDirs() {
        try {
            ensureDir(this.config.cacheDir)
            ensureDir(this.config.rhDir)
        } catch (error) {
            ErrorHandler.fileSystemError(`Failed to create cache directories: ${error.message}`, {
                exitProcess: false,
                showStack: false
            })
        }
    }

    /**
     * Validate configuration
     * @throws {Error} If configuration is invalid
     */
    validateConfig() {
        // Validate repoDir
        if (!fs.existsSync(this.config.repoDir)) {
            throw new Error(`Repository directory does not exist: ${this.config.repoDir}`)
        }

        // Validate httpPort
        if (isNaN(this.config.httpPort) || this.config.httpPort < 1 || this.config.httpPort > 65535) {
            throw new Error(`Invalid HTTP port: ${this.config.httpPort}`)
        }

        // Validate debugMode
        if (typeof this.config.debugMode !== 'boolean') {
            throw new Error(`Invalid debug mode: ${this.config.debugMode}`)
        }
    }

    /**
     * Get a configuration value
     * @param {string} key The configuration key
     * @returns {any} The configuration value
     */
    get(key) {
        if (!(key in this.config)) {
            logger.warning(`Configuration key not found: ${key}`)
            return undefined
        }
        return this.config[key]
    }

    /**
     * Get all configuration values
     * @returns {Object} All configuration values
     */
    getAll() {
        return { ...this.config }
    }

    /**
     * Set a configuration value
     * @param {string} key The configuration key
     * @param {any} value The configuration value
     */
    set(key, value) {
        // Validate key
        if (!(key in this.config)) {
            logger.warning(`Setting unknown configuration key: ${key}`)
        }

        // Special validation for certain keys
        if (key === 'httpPort') {
            if (isNaN(value) || value < 1 || value > 65535) {
                ErrorHandler.configError(`Invalid HTTP port: ${value}`, {
                    exitProcess: false,
                    showStack: false
                })
                return
            }
        }

        this.config[key] = value

        // Re-create directories if needed
        if (key === 'cacheDir' || key === 'rhDir') {
            this.ensureCacheDirs()
        }
    }

    /**
     * Set multiple configuration values
     * @param {Object} config Configuration object
     */
    setMultiple(config) {
        for (const [key, value] of Object.entries(config)) {
            this.set(key, value)
        }
    }
}