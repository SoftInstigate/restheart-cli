#!/usr/bin/env node

const shell = require('shelljs')
const { program } = require('commander')
const path = require('path')
const fs = require('fs')
const chokidar = require('chokidar')

// Set shell.config.fatal to true to exit on errors
shell.config.fatal = true

// Define constants
const scriptDir = __dirname
const repoDir = path.resolve(scriptDir, '..')
const cacheDir = path.join(repoDir, '.cache')
const rhDir = path.join(cacheDir, 'restheart')
let httpPort = 8080

// Helper functions
function msg(text) {
    console.log(text)
}

function die(msg, code = 1) {
    console.error(msg)
    process.exit(code)
}

function mongodbRunning() {
    return (
        shell.exec('curl -s -o /dev/null localhost:27017', { silent: true })
            .code === 0
    )
}

function restheartRunning() {
    return (
        shell.exec(`curl -s -o /dev/null localhost:${httpPort}/ping`, {
            silent: true,
        }).code === 0
    )
}

function requiresMongodb(options) {
    return !options.includes('-s')
}

function onlyPrintConf(options) {
    return (
        options.includes('-t') ||
        options.includes('-c') ||
        options.includes('-v')
    )
}

function getInstalledVersion() {
    const versionFile = path.join(cacheDir, 'installed_version')
    if (fs.existsSync(versionFile)) {
        return fs.readFileSync(versionFile, 'utf8').trim()
    }
    return null
}

function saveInstalledVersion(version) {
    const versionFile = path.join(cacheDir, 'installed_version')
    fs.writeFileSync(versionFile, version)
}

// Command implementations
function install(version, forceInstall) {
    const installedVersion = getInstalledVersion()

    if (forceInstall || !installedVersion) {
        if (!version) {
            die(
                'Error: RESTHeart version must be specified using -rv or --rh-version option for initial installation or forced reinstall.'
            )
        }

        if (forceInstall) {
            msg('Cleaning cache')
            shell.rm('-rf', cacheDir)
        }

        if (!fs.existsSync(rhDir)) {
            msg(`Installing RESTHeart version ${version}`)

            shell.mkdir('-p', cacheDir)

            const url = `https://github.com/SoftInstigate/restheart/releases/download/${version}/restheart.tar.gz`

            if (
                shell.exec(
                    `curl -L ${url} --output ${path.join(cacheDir, 'restheart.tar.gz')}`
                ).code !== 0
            ) {
                die(`Failed to download RESTHeart version ${version}`)
            }

            shell.exec(
                `tar -xzf ${path.join(cacheDir, 'restheart.tar.gz')} -C ${cacheDir}`
            )
            shell.rm('-f', path.join(cacheDir, 'restheart.tar.gz'))

            saveInstalledVersion(version)
        }
    } else if (version && version !== installedVersion) {
        msg(
            `Warning: Requested version ${version} differs from installed version ${installedVersion}. Use --install to force reinstallation.`
        )
    }
}

function build() {
    shell.rm('-rf', path.join(repoDir, 'target'))
    const currentDir = process.cwd()
    shell.cd(repoDir)

    if (shell.exec('./mvnw -f pom.xml clean package').code !== 0) {
        shell.cd(currentDir)
        die('Failed to build RESTHeart')
    }

    shell.cd(currentDir)
}

function deploy() {
    shell.cp(path.join(repoDir, 'target', '*.jar'), path.join(rhDir, 'plugins'))
    shell.cp(
        path.join(repoDir, 'target', 'lib', '*.jar'),
        path.join(rhDir, 'plugins')
    )
    msg('Plugin deployed')
}

function kill() {
    msg(`RESTHeart at localhost:${httpPort} killed`)
    shell.exec(`kill $(lsof -t -i:${httpPort} | grep -o '^[0-9]*')`, {
        silent: true,
    })
    shell.exec(`kill $(lsof -t -i:$((${httpPort}+1000)) | grep -o '^[0-9]*')`, {
        silent: true,
    })

    // Wait for RESTHeart to stop
    while (restheartRunning()) {
        shell.exec('sleep 1')
    }
}

function run(options) {
    const rho = process.env.RHO || ''
    const jdwpPort = httpPort + 1000

    const command = onlyPrintConf(options)
        ? `java -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=0.0.0.0:${jdwpPort} -jar "${path.join(rhDir, 'restheart.jar')}" ${options}`
        : `java -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=0.0.0.0:${jdwpPort} -Dlogback.configurationFile=${path.join(repoDir, 'etc', 'logback.xml')} -jar "${path.join(rhDir, 'restheart.jar')}" ${options}`

    const fullCommand = `RHO="${rho};/http-listner/port->${httpPort}" ${command}`

    if (onlyPrintConf(options)) {
        shell.exec(fullCommand)
    } else {
        shell.exec(
            `${fullCommand} > ${path.join(repoDir, 'restheart.log')} 2>&1 &`
        )
        msg('RESTHeart starting')

        let started = false
        for (let i = 0; i < 5; i++) {
            if (restheartRunning()) {
                started = true
                break
            }
            shell.exec('sleep 2')
        }

        if (started) {
            msg(`RESTHeart started at localhost:${httpPort}`)
            msg(`JDWP available for debuggers at localhost:${jdwpPort}`)
        } else {
            msg('Error starting RESTHeart, check restheart.log')
        }
    }
}

function watch() {
    const watcher = chokidar.watch(path.join(repoDir, 'src', '**', '*.java'), {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true,
    })

    msg('Watching for file changes...')

    watcher
        .on('change', (path) => {
            msg(`File ${path} has been changed`)
            if (restheartRunning()) kill()
            build()
            deploy()
            run(program.opts().options)
        })
        .on('error', (error) => msg(`Watcher error: ${error}`))

    msg(`RESTHeart started at localhost:${httpPort}`)
    msg(`JDWP available for debuggers at localhost:${httpPort + 1000}`)
}

// Main program
program
    .version('1.0.0')
    .option('-i, --install', 'Force reinstalling RESTHeart')
    .option(
        '-rv, --rh-version <version>',
        'RESTHeart version to install (required for initial install or with --install)'
    )
    .option('-p, --port <port>', 'HTTP port to use', '8080')
    .option('-o, --options <options>', 'Pass options to RESTHeart')
    .option('--no-color', 'Disable colored output')

program
    .command('build')
    .description('Build and deploy the plugin, restarting RESTHeart')
    .action(() => {
        if (restheartRunning()) kill()
        install(program.opts().rhVersion, program.opts().install)
        build()
        deploy()
    })

program
    .command('run')
    .description('Start (or restart) RESTHeart')
    .action(() => {
        if (restheartRunning()) kill()
        install(program.opts().rhVersion, program.opts().install)
        build()
        deploy()
        if (requiresMongodb(program.opts().options)) {
            if (!mongodbRunning()) {
                die(
                    'MongoDB is not running on port 27017. You can start it with: docker compose up -d'
                )
            }
        }
        run(program.opts().options)
    })

program
    .command('kill')
    .description('Kill RESTHeart')
    .action(() => {
        if (restheartRunning()) {
            kill()
        } else {
            msg(`RESTHeart is not running on port ${httpPort}`)
        }
    })

program
    .command('watch')
    .description(
        'Watch sources and build and deploy the plugin on changes, restarting RESTHeart'
    )
    .action(() => {
        watch()
    })

program.parse(process.argv)

// Set port from command line option
httpPort = parseInt(program.opts().port)
