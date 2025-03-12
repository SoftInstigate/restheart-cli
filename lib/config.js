import path from 'path'
import { ensureDir } from './utils.js'

/**
 * Configuration manager for RESTHeart CLI
 */
export class ConfigManager {
    /**
     * Create a new ConfigManager
     * @param {Object} options Configuration options
     */
    constructor(options = {}) {
        const repoDir = process.cwd()

        this.config = {
            repoDir: repoDir,
            cacheDir: options.cacheDir || path.join(repoDir, '.cache'),
            rhDir: options.rhDir || path.join(repoDir, '.cache', 'restheart'),
            httpPort: options.httpPort || 8080,
            debugMode: options.debugMode || false
        }

        // Ensure cache directory exists
        ensureDir(this.config.cacheDir)
        ensureDir(this.config.rhDir)
    }

    /**
     * Get a configuration value
     * @param {string} key The configuration key
     * @returns {any} The configuration value
     */
    get(key) {
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
        this.config[key] = value
    }

    /**
     * Set multiple configuration values
     * @param {Object} config Configuration object
     */
    setMultiple(config) {
        this.config = { ...this.config, ...config }
    }
}