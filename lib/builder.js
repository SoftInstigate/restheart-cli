import fs from 'fs'
import path from 'path'
import shell from 'shelljs'
import { commandExists, createSpinner, logger } from './utils.js'

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

        logger.warning('\nBuilding RESTHeart... ⏱️')

        shell.rm('-rf', path.join(repoDir, 'target'))
        const currentDir = shell.pwd()

        shell.cd(repoDir)
        let mvnCommand = `./mvnw -f pom.xml ${mvnParams} -DskipTests=${skipTests}`

        try {
            if (!fs.existsSync(path.join(repoDir, 'mvnw'))) {
                logger.warning('mvnw not found, using mvn instead')
                commandExists('mvn')
                mvnCommand = `mvn -f pom.xml ${mvnParams}`
            } else {
                commandExists('./mvnw')
            }

            if (shell.exec(mvnCommand).code !== 0) {
                shell.cd(currentDir)
                throw new Error('Failed to build RESTHeart')
            }

            shell.cd(currentDir)
        } catch (error) {
            shell.cd(currentDir)
            logger.error(`Building failed: ${error.message}`)
            shell.exit(1)
        }
    }

    /**
     * Deploy RESTHeart and plugins
     */
    deploy() {
        const { repoDir, rhDir, debugMode } = this.configManager.getAll()

        const spinner = createSpinner('Deploying plugins...')

        try {
            // Copy plugin jars to the plugins directory
            shell.cp(path.join(repoDir, 'target', '*.jar'), path.join(rhDir, 'plugins'))
            shell.cp(
                path.join(repoDir, 'target', 'lib', '*.jar'),
                path.join(rhDir, 'plugins')
            )

            spinner.succeed('Plugins deployed')

            // Log deployed plugins in debug mode
            if (debugMode) {
                let count = 1
                console.log('\n')
                shell.ls(path.join(rhDir, 'plugins')).forEach((file) => {
                    logger.debug(`${count++}\t${file}`, debugMode)
                })
                console.log('\n')
            }
        } catch (error) {
            spinner.fail('Failed to deploy plugins')
            logger.error(`Deployment failed: ${error.message}`)
            shell.exit(1)
        }
    }
}