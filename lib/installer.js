import fs from 'fs'
import https from 'https'
import path from 'path'
import shell from 'shelljs'
import { createSpinner, logger } from './utils.js'

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
        const { cacheDir, rhDir } = this.configManager.getAll()

        logger.warning(`Installing RESTHeart version "${restheartVersion}"...`)

        if (forceInstall) {
            logger.info('Cleaning cache')
            shell.rm('-rf', cacheDir)
        }

        if (!fs.existsSync(rhDir)) {
            if (!fs.existsSync(cacheDir)) {
                shell.mkdir(cacheDir)
            }

            this.downloadRESTHeart(restheartVersion)
        } else {
            const versionOutput = shell.exec(`java -jar ${path.join(rhDir, 'restheart.jar')} -v`, {
                silent: true,
            }).stdout

            logger.info('Already installed: ' + versionOutput)
            logger.info('Use the -f option to force a reinstall.')
        }
    }

    /**
     * Download RESTHeart
     * @param {string} restheartVersion The version to download
     */
    downloadRESTHeart(restheartVersion) {
        const { cacheDir } = this.configManager.getAll()

        const url =
            restheartVersion === 'latest'
                ? 'https://github.com/SoftInstigate/restheart/releases/latest/download/restheart.tar.gz'
                : `https://github.com/SoftInstigate/restheart/releases/download/${restheartVersion}/restheart.tar.gz`

        const file = fs.createWriteStream(`${cacheDir}/restheart.tar.gz`)

        this.downloadAndExtractRESTHeart(url, file)
    }

    /**
     * Download and extract RESTHeart
     * @param {string} url Download URL
     * @param {fs.WriteStream} file Write stream for the download
     */
    downloadAndExtractRESTHeart(url, file) {
        https
            .get(url, (response) => {
                if (response.statusCode === 200) {
                    this.extractAndInstallRESTHeart(response, file)
                } else if (response.statusCode === 302) {
                    const redirectUrl = response.headers.location
                    if (redirectUrl) {
                        this.downloadAndExtractRESTHeart(redirectUrl, file) // Recursively follow redirects
                    } else {
                        logger.error('Error: Redirection URL not found')
                        shell.exit(1)
                    }
                } else {
                    logger.error(
                        `Error downloading RESTHeart: Server responded with status code ${response.statusCode}`
                    )
                    shell.exit(1)
                }
            })
            .on('error', (err) => {
                fs.unlink(`${this.configManager.get('cacheDir')}/restheart.tar.gz`, (unlinkErr) => {
                    if (unlinkErr) {
                        logger.error(`Error removing incomplete file: ${unlinkErr.message}`)
                    }
                    logger.error(`Error downloading RESTHeart: ${err.message}`)
                    shell.exit(1)
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

        response.pipe(file)

        const fileSize = response.headers['content-length']
        let downloaded = 0

        response.on('data', (chunk) => {
            downloaded += chunk.length
            spinner.text = `Downloading RESTHeart... ${Math.round((downloaded / fileSize) * 100)}%`
        })

        file.on('finish', () => {
            file.close(() => {
                spinner.succeed('RESTHeart downloaded')
                logger.info('Extracting RESTHeart...')

                shell.exec(`tar -xzf ${cacheDir}/restheart.tar.gz -C ${cacheDir}`)

                shell.rm('-f', `${cacheDir}/restheart.tar.gz`)
                shell
                    .exec(`java -jar ${path.join(rhDir, 'restheart.jar')} -v`)
                    .to(path.join(cacheDir, 'restheart_version.txt'))

                // Build and deploy if builder is available
                if (this.builder) {
                    this.builder.build()
                    this.builder.deploy()
                }

                logger.success('RESTHeart successfully installed')

                shell.exit(0)
            })
        }).on('error', (writeErr) => {
            logger.error(`Error writing file: ${writeErr.message}`)
            shell.exit(1)
        })
    }
}