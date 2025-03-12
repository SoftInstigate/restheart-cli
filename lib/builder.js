import fs from 'fs'
import path from 'path'
import shell from 'shelljs'
import { ErrorHandler } from './error-handler.js'
import { commandExists, createSpinner, ensureDir, logger } from './utils.js'

/**
 * Handles building and deploying RESTHeart plugins
 */
export class Builder {
    /**
     * Create a new Builder
     * @param {ConfigManager} configManager The configuration manager
     */
    constructor(configManager) {
        this.configManager = configManager
    }

    /**
     * Build RESTHeart and plugins
     * @param {string} mvnParams Maven parameters - default is 'package'
     * @param {boolean} skipTests Skip tests - default is false
     */
    build(mvnParams = 'package', skipTests = false) {
        const { repoDir } = this.configManager.getAll()
        const currentDir = shell.pwd()

        logger.warning('\nBuilding RESTHeart... ⏱️')

        try {
            // Clean target directory
            try {
                shell.rm('-rf', path.join(repoDir, 'target'))
            } catch (rmError) {
                logger.warning(`Could not clean target directory: ${rmError.message}`)
            }

            // Change to repo directory
            shell.cd(repoDir)

            // Determine build command
            let mvnCommand = `./mvnw -f pom.xml ${mvnParams} -DskipTests=${skipTests}`

            if (!fs.existsSync(path.join(repoDir, 'mvnw'))) {
                logger.warning('mvnw not found, using mvn instead')
                commandExists('mvn')
                mvnCommand = `mvn -f pom.xml ${mvnParams} -DskipTests=${skipTests}`
            } else {
                // Make mvnw executable if it's not
                try {
                    fs.chmodSync(path.join(repoDir, 'mvnw'), 0o755)
                } catch (chmodError) {
                    logger.warning(`Could not make mvnw executable: ${chmodError.message}`)
                }

                try {
                    commandExists('./mvnw')
                } catch (mvnwError) {
                    logger.warning(`Could not execute ./mvnw: ${mvnwError.message}`)
                    logger.warning('Falling back to mvn')
                    commandExists('mvn')
                    mvnCommand = `mvn -f pom.xml ${mvnParams} -DskipTests=${skipTests}`
                }
            }

            // Execute build command
            logger.info(`Executing command: ${mvnCommand}`)
            const buildResult = shell.exec(mvnCommand)

            if (buildResult.code !== 0) {
                throw new Error(`Maven build failed with exit code ${buildResult.code}`)
            }

            // Verify target directory exists after build
            if (!fs.existsSync(path.join(repoDir, 'target'))) {
                throw new Error('Build completed but target directory not found')
            }

            logger.success('Build completed successfully')
        } catch (error) {
            // Always return to the original directory
            shell.cd(currentDir)

            ErrorHandler.processError(`Build failed: ${error.message}`, {
                exitProcess: true,
                showStack: true
            })
        } finally {
            // Always ensure we're back in the original directory
            shell.cd(currentDir)
        }
    }

    /**
     * Deploy RESTHeart and plugins
     */
    deploy() {
        const { repoDir, rhDir, debugMode } = this.configManager.getAll()
        const spinner = createSpinner('Deploying plugins...')

        try {
            // Make sure target directory exists
            if (!fs.existsSync(path.join(repoDir, 'target'))) {
                throw new Error('Target directory not found. Please build the project first.')
            }

            // Make sure plugins directory exists
            ensureDir(path.join(rhDir, 'plugins'))

            // Find JAR files to deploy
            const mainJars = shell.find(path.join(repoDir, 'target')).filter(file => file.endsWith('.jar') && !file.includes('/lib/'))
            const libJars = shell.find(path.join(repoDir, 'target', 'lib')).filter(file => file.endsWith('.jar'))

            if (mainJars.length === 0 && libJars.length === 0) {
                throw new Error('No JAR files found to deploy')
            }

            // Deploy main JARs
            if (mainJars.length > 0) {
                const copyMainResult = shell.cp(mainJars, path.join(rhDir, 'plugins'))
                if (copyMainResult.code !== 0) {
                    throw new Error(`Failed to copy main JARs: ${copyMainResult.stderr}`)
                }
            }

            // Deploy lib JARs
            if (libJars.length > 0) {
                const copyLibResult = shell.cp(libJars, path.join(rhDir, 'plugins'))
                if (copyLibResult.code !== 0) {
                    throw new Error(`Failed to copy lib JARs: ${copyLibResult.stderr}`)
                }
            }

            spinner.succeed(`Plugins deployed (${mainJars.length + libJars.length} JARs)`)

            // Log deployed plugins in debug mode
            if (debugMode) {
                logger.info('\nDeployed plugins:')
                const pluginFiles = shell.ls(path.join(rhDir, 'plugins'))

                pluginFiles.forEach((file, index) => {
                    logger.debug(`${index + 1}.\t${file}`)
                })
                console.log('\n')
            }
        } catch (error) {
            spinner.fail('Failed to deploy plugins')

            ErrorHandler.fileSystemError(`Deployment failed: ${error.message}`, {
                exitProcess: true,
                showStack: true
            })
        }
    }
}