import fs from 'node:fs'
import path from 'node:path'
import { logger } from '../logger.js'
import { commandExists } from '../utils.js'

function mapBuildParams(buildParams) {
    const normalized = (buildParams || '').trim()

    if (!normalized || normalized === 'package') {
        return 'build'
    }

    if (normalized === 'clean package') {
        return 'clean build'
    }

    return normalized
}

/**
 * Gradle-specific build logic.
 */
export class GradleBuildSystem {
    getName() {
        return 'gradle'
    }

    getOutputDir() {
        return 'build'
    }

    resolveBuildCommand(repoDir, buildParams, skipTests) {
        const gradleTasks = mapBuildParams(buildParams)
        const skipTestsArg = skipTests ? ' -x test' : ''
        let gradleCommand = `./gradlew ${gradleTasks}${skipTestsArg}`

        if (fs.existsSync(path.join(repoDir, 'gradlew'))) {
            // Make gradlew executable if it's not.
            try {
                fs.chmodSync(path.join(repoDir, 'gradlew'), 0o755)
            } catch (chmodError) {
                logger.warning(`Could not make gradlew executable: ${chmodError.message}`)
            }

            try {
                commandExists('./gradlew')
            } catch (gradlewError) {
                logger.warning(`Could not execute ./gradlew: ${gradlewError.message}`)
                logger.warning('Falling back to gradle')
                commandExists('gradle')
                gradleCommand = `gradle ${gradleTasks}${skipTestsArg}`
            }
        } else {
            logger.warning('gradlew not found, using gradle instead')
            commandExists('gradle')
            gradleCommand = `gradle ${gradleTasks}${skipTestsArg}`
        }

        return gradleCommand
    }

    getArtifactSearchRoots(repoDir) {
        return {
            mainRoot: path.join(repoDir, 'build', 'libs'),
            libRoot: path.join(repoDir, 'build', 'libs', 'lib'),
        }
    }
}
