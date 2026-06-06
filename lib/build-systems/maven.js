import fs from 'node:fs'
import path from 'node:path'
import { logger } from '../logger.js'
import { commandExists } from '../utils.js'

/**
 * Maven-specific build logic.
 */
export class MavenBuildSystem {
    getName() {
        return 'maven'
    }

    getOutputDir() {
        return 'target'
    }

    resolveBuildCommand(repoDir, buildParams, skipTests) {
        let mvnCommand = `./mvnw -f pom.xml ${buildParams} -DskipTests=${skipTests}`

        if (fs.existsSync(path.join(repoDir, 'mvnw'))) {
            // Make mvnw executable if it's not.
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
                mvnCommand = `mvn -f pom.xml ${buildParams} -DskipTests=${skipTests}`
            }
        } else {
            logger.warning('mvnw not found, using mvn instead')
            commandExists('mvn')
            mvnCommand = `mvn -f pom.xml ${buildParams} -DskipTests=${skipTests}`
        }

        return mvnCommand
    }

    getArtifactSearchRoots(repoDir) {
        return {
            mainRoot: path.join(repoDir, 'target'),
            libRoot: path.join(repoDir, 'target', 'lib'),
        }
    }
}
