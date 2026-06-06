import fs from 'node:fs'
import path from 'node:path'
import shell from 'shelljs'
import { resolveBuildSystem } from './build-systems/index.js'
import { ErrorHandler } from './error-handler.js'
import { logger } from './logger.js'
import { createSpinner, ensureDir } from './utils.js'

function dedupeConsecutiveLines(text) {
    const lines = text.split('\n')
    const deduped = []

    for (const line of lines) {
        if (line === '' && deduped.length > 0 && deduped.at(-1) === '') {
            continue
        }

        if (deduped.length === 0 || deduped.at(-1) !== line) {
            deduped.push(line)
        }
    }

    return deduped.join('\n')
}

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

    resolveCurrentBuildSystem() {
        const { repoDir, buildSystem = 'auto' } = this.configManager.getAll()
        return resolveBuildSystem(repoDir, buildSystem)
    }

    /**
     * Build RESTHeart and plugins
     * @param {string} mvnParams Maven parameters - default is 'package'
     * @param {boolean} skipTests Skip tests - default is false
     */
    build(mvnParams = 'package', skipTests = false) {
        const { repoDir } = this.configManager.getAll()
        const buildSystem = this.resolveCurrentBuildSystem()
        const currentDir = shell.pwd()
        const outputDir = buildSystem.getOutputDir()

        logger.status('\nBuilding RESTHeart... ⏱️')

        try {
            // Clean target directory
            try {
                shell.rm('-rf', path.join(repoDir, outputDir))
            } catch (rmError) {
                logger.warning(`Could not clean target directory: ${rmError.message}`)
            }

            // Change to repo directory
            shell.cd(repoDir)

            const buildCommand = buildSystem.resolveBuildCommand(repoDir, mvnParams, skipTests)

            // Execute build command
            logger.info(`Executing command: ${buildCommand}`)
            const buildResult = shell.exec(buildCommand, { silent: true })

            if (buildResult.code !== 0) {
                const buildOutput = buildResult.stderr?.trim() || buildResult.stdout?.trim()
                if (buildOutput) {
                    logger.error(dedupeConsecutiveLines(buildOutput))
                }
                throw new Error(
                    `${buildSystem.getName()} build failed with exit code ${buildResult.code}`
                )
            }

            // Verify target directory exists after build
            if (!fs.existsSync(path.join(repoDir, outputDir))) {
                throw new Error('Build completed but target directory not found')
            }

            logger.success('Build completed successfully')
        } catch (error) {
            // Always return to the original directory
            shell.cd(currentDir)

            ErrorHandler.processError(`Build failed: ${error.message}`, {
                exitProcess: true,
                showStack: true,
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
        const buildSystem = this.resolveCurrentBuildSystem()
        const spinner = createSpinner('Deploying plugins...')
        const outputDir = buildSystem.getOutputDir()
        const { mainRoot, libRoot } = buildSystem.getArtifactSearchRoots(repoDir)

        try {
            // Make sure target directory exists
            if (!fs.existsSync(path.join(repoDir, outputDir))) {
                throw new Error('Target directory not found. Please build the project first.')
            }

            // Make sure plugins directory exists
            ensureDir(path.join(rhDir, 'plugins'))

            // Find JAR files to deploy
            const mainJars = shell
                .find(mainRoot)
                .filter((file) => file.endsWith('.jar') && !file.includes('/lib/'))
            const libJars = shell.find(libRoot).filter((file) => file.endsWith('.jar'))

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
                showStack: true,
            })
        }
    }
}
