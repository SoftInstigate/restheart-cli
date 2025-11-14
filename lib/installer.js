import fs from 'fs'
import https from 'https'
import path from 'path'
import shell from 'shelljs'
import { ErrorHandler } from './error-handler.js'
import { commandExists, createSpinner, ensureDir, logger } from './utils.js'

/**
 * Handles the installation of RESTHeart
 */
export class Installer {
    /**
     * Create a new Installer
     * @param {ConfigManager} configManager The configuration manager
     * @param {Builder} builder The builder instance (for post-install build)
     */
    constructor(configManager, builder) {
        this.configManager = configManager
        this.builder = builder
    }

    /**
     * Install RESTHeart
     * @param {string} restheartVersion The version to install, defaults to 'latest'
     * @param {boolean} forceInstall Force reinstallation
     */
    install(restheartVersion = 'latest', forceInstall = false) {
        try {
            // Check if Java is installed
            commandExists('java')

            const { cacheDir, rhDir } = this.configManager.getAll()

            logger.warning(`Installing RESTHeart version "${restheartVersion}"...`)

            if (forceInstall) {
                logger.info('Cleaning cache')
                try {
                    shell.rm('-rf', cacheDir)
                } catch (error) {
                    ErrorHandler.fileSystemError(
                        `Failed to clean cache directory: ${error.message}`,
                        {
                            exitProcess: false,
                            showStack: false,
                        }
                    )
                }
            }

            if (!fs.existsSync(rhDir)) {
                ensureDir(cacheDir)
                this.downloadRESTHeart(restheartVersion)
            } else {
                try {
                    const jarPath = path.join(rhDir, 'restheart.jar')
                    if (!fs.existsSync(jarPath)) {
                        logger.info('Will download a fresh copy...')
                        this.downloadRESTHeart(restheartVersion)
                        return
                    }

                    const versionOutput = shell.exec(`java -jar ${jarPath} -v`, {
                        silent: true,
                    }).stdout

                    logger.info('Already installed: ' + versionOutput)
                    logger.info('Use the -f option to force a reinstall.')
                } catch (error) {
                    ErrorHandler.processError(
                        `Failed to check existing installation: ${error.message}`,
                        {
                            exitProcess: false,
                            showStack: false,
                        }
                    )
                    logger.info('Will download a fresh copy...')
                    this.downloadRESTHeart(restheartVersion)
                }
            }
        } catch (error) {
            ErrorHandler.processError(`Installation failed: ${error.message}`, {
                exitProcess: true,
                showStack: true,
            })
        }
    }

    /**
     * Download RESTHeart
     * @param {string} restheartVersion The version to download
     */
    downloadRESTHeart(restheartVersion) {
        try {
            const { cacheDir } = this.configManager.getAll()

            // Format URL based on version
            const url =
                restheartVersion === 'latest'
                    ? 'https://github.com/SoftInstigate/restheart/releases/latest/download/restheart.tar.gz'
                    : `https://github.com/SoftInstigate/restheart/releases/download/${restheartVersion}/restheart.tar.gz`

            // Create write stream for the download
            const filePath = path.join(cacheDir, 'restheart.tar.gz')
            const file = fs.createWriteStream(filePath)

            logger.debug(`Downloading RESTHeart ${restheartVersion} from ${url}`)
            this.downloadAndExtractRESTHeart(url, file)
        } catch (error) {
            ErrorHandler.fileSystemError(`Failed to initialize download: ${error.message}`, {
                exitProcess: true,
                showStack: true,
            })
        }
    }

    /**
     * Download and extract RESTHeart
     * @param {string} url Download URL
     * @param {fs.WriteStream} file Write stream for the download
     */
    downloadAndExtractRESTHeart(url, file) {
        const { cacheDir } = this.configManager.getAll()
        const filePath = path.join(cacheDir, 'restheart.tar.gz')

        const request = https.get(url, (response) => {
            // Handle HTTP status codes
            if (response.statusCode === 200) {
                this.extractAndInstallRESTHeart(response, file)
            } else if (response.statusCode === 302 || response.statusCode === 301) {
                // Handle redirects
                const redirectUrl = response.headers.location
                if (redirectUrl) {
                    logger.debug(`Following redirect to ${redirectUrl}`)
                    // Close the current file stream
                    file.close()
                    // Create a new file stream
                    const newFile = fs.createWriteStream(filePath)
                    // Follow the redirect
                    this.downloadAndExtractRESTHeart(redirectUrl, newFile)
                } else {
                    ErrorHandler.networkError('Redirection URL not found', {
                        exitProcess: true,
                        showStack: false,
                    })
                }
            } else {
                ErrorHandler.networkError(
                    `Server responded with status code ${response.statusCode}`,
                    {
                        exitProcess: true,
                        showStack: false,
                    }
                )
            }
        })

        // Handle request errors
        request.on('error', (err) => {
            try {
                // Close and remove the file
                file.close()
                fs.unlinkSync(filePath)
            } catch (unlinkErr) {
                logger.error(`Error removing incomplete file: ${unlinkErr.message}`)
            }

            ErrorHandler.networkError(`Failed to download RESTHeart: ${err.message}`, {
                exitProcess: true,
                showStack: true,
            })
        })

        // Set a timeout for the request
        request.setTimeout(30000, () => {
            request.destroy()
            ErrorHandler.networkError('Request timed out after 30 seconds', {
                exitProcess: true,
                showStack: false,
            })
        })
    }

    /**
     * Extract and install RESTHeart
     * @param {Object} response HTTP response
     * @param {fs.WriteStream} file Write stream for the download
     */
    extractAndInstallRESTHeart(response, file) {
        const { cacheDir, rhDir } = this.configManager.getAll()

        const spinner = createSpinner('Downloading RESTHeart...')

        // Pipe the response to the file
        response.pipe(file)

        // Track download progress
        const fileSize = parseInt(response.headers['content-length'] || '0', 10)
        let downloaded = 0

        response.on('data', (chunk) => {
            downloaded += chunk.length
            if (fileSize > 0) {
                const progress = Math.round((downloaded / fileSize) * 100)
                spinner.text = `Downloading RESTHeart... ${progress}% (${(downloaded / 1048576).toFixed(2)}MB/${(fileSize / 1048576).toFixed(2)}MB)`
            } else {
                spinner.text = `Downloading RESTHeart... ${(downloaded / 1048576).toFixed(2)}MB downloaded`
            }
        })

        // Handle finish event
        file.on('finish', () => {
            file.close(() => {
                try {
                    spinner.succeed('RESTHeart downloaded successfully')

                    // Create extraction directory if it doesn't exist
                    ensureDir(cacheDir)

                    logger.info('Extracting RESTHeart...')

                    // Extract the tarball
                    const extractResult = shell.exec(
                        `tar -xzf ${cacheDir}/restheart.tar.gz -C ${cacheDir}`,
                        { silent: true }
                    )
                    if (extractResult.code !== 0) {
                        throw new Error(`Failed to extract tarball: ${extractResult.stderr}`)
                    }

                    // Remove the downloaded tarball
                    shell.rm('-f', `${cacheDir}/restheart.tar.gz`)

                    // Verify installation by checking version
                    const verifyResult = shell.exec(
                        `java -jar ${path.join(rhDir, 'restheart.jar')} -v`,
                        { silent: true }
                    )
                    if (verifyResult.code !== 0) {
                        throw new Error(`Failed to verify installation: ${verifyResult.stderr}`)
                    }

                    // Save version info
                    verifyResult.to(path.join(cacheDir, 'restheart_version.txt'))

                    logger.success('RESTHeart successfully installed')
                    process.exit(0)
                } catch (error) {
                    ErrorHandler.processError(`Installation failed: ${error.message}`, {
                        exitProcess: true,
                        showStack: true,
                    })
                }
            })
        }).on('error', (writeErr) => {
            ErrorHandler.fileSystemError(`Error writing file: ${writeErr.message}`, {
                exitProcess: true,
                showStack: true,
            })
        })
    }
}
