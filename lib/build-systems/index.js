import fs from 'node:fs'
import path from 'node:path'
import { GradleBuildSystem } from './gradle.js'
import { MavenBuildSystem } from './maven.js'

export function resolveBuildSystem(repoDir, preferred = 'auto') {
    if (preferred === 'maven') {
        return new MavenBuildSystem()
    }

    if (preferred === 'gradle') {
        return new GradleBuildSystem()
    }

    const hasMaven =
        fs.existsSync(path.join(repoDir, 'pom.xml')) || fs.existsSync(path.join(repoDir, 'mvnw'))

    const hasGradle =
        fs.existsSync(path.join(repoDir, 'gradlew')) ||
        fs.existsSync(path.join(repoDir, 'build.gradle')) ||
        fs.existsSync(path.join(repoDir, 'build.gradle.kts')) ||
        fs.existsSync(path.join(repoDir, 'settings.gradle')) ||
        fs.existsSync(path.join(repoDir, 'settings.gradle.kts'))

    // Keep Maven as default when both are present to preserve existing behavior.
    if (hasMaven) {
        return new MavenBuildSystem()
    }

    if (hasGradle) {
        return new GradleBuildSystem()
    }

    return new MavenBuildSystem()
}
