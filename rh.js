#!/usr/bin/env node

const shell = require('shelljs')
const path = require('path')
const fs = require('fs')
const yargs = require('yargs')
const chokidar = require('chokidar')
const { hideBin } = require('yargs/helpers')

// Directory setup
const scriptDir = process.cwd() // Use the current working directory
const repoDir = scriptDir
const cacheDir = path.join(repoDir, '.cache')
const rhDir = path.join(cacheDir, 'restheart')
let httpPort = 8080

// Color setup
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
}

// Function to display messages
function msg(message, color = colors.reset) {
    console.log(color + message + colors.reset)
}

// Function to handle script cleanup
function cleanup() {
    // Cleanup code here
}

// Function to check if a command exists
function commandExists(command) {
    if (!shell.which(command)) {
        msg(`Error: ${command} is required but not installed.`, colors.red)
        process.exit(1)
    }
}

// Function to kill RESTHeart
function killRESTHeart() {
    if (isRESTHeartRunning()) {
        msg(`RESTHeart at localhost:${httpPort} killed`, colors.cyan)
        shell.exec(`kill $(lsof -t -i:${httpPort})`)
        shell.exec(`kill $(lsof -t -i:$((httpPort + 1000)))`)
    } else {
        msg(`RESTHeart is not running on port ${httpPort}`, colors.cyan)
    }
}

// Function to check if RESTHeart is running
function isRESTHeartRunning() {
    return (
        shell.exec(`curl -s -o /dev/null localhost:${httpPort}/ping`).code === 0
    )
}

// Function to install RESTHeart
function installRESTHeart(restheartVersion, forceInstall) {
    if (forceInstall) {
        msg('Cleaning cache', colors.cyan)
        shell.rm('-rf', cacheDir)
    }

    if (!fs.existsSync(rhDir)) {
        msg(`Installing RESTHeart version ${restheartVersion}`, colors.green)

        if (!fs.existsSync(cacheDir)) {
            shell.mkdir(cacheDir)
        }

        if (downloadRESTHeart(restheartVersion)) {
            msg(
                `RESTHeart version ${restheartVersion} downloaded`,
                colors.green
            )
        } else {
            msg(
                `Failed to download RESTHeart version ${restheartVersion}`,
                colors.red
            )
            process.exit(1)
        }

        shell.exec(`tar -xzf ${cacheDir}/restheart.tar.gz -C ${cacheDir}`)
        shell.rm('-f', `${cacheDir}/restheart.tar.gz`)
    } else {
        msg(
            `RESTHeart version ${restheartVersion} already installed`,
            colors.cyan
        )
    }
}

// Function to download RESTHeart
function downloadRESTHeart(restheartVersion) {
    commandExists('curl')
    const url = `https://github.com/SoftInstigate/restheart/releases/download/${restheartVersion}/restheart.tar.gz`
    return (
        shell.exec(
            `curl --fail -L ${url} --output ${cacheDir}/restheart.tar.gz`
        ).code === 0
    )
}

// Function to build the plugin
function buildPlugin() {
    shell.rm('-rf', path.join(repoDir, 'target'))
    const currentDir = shell.pwd()

    shell.cd(repoDir)
    let mvnCommand = './mvnw -f pom.xml clean package'
    if (!fs.existsSync(path.join(repoDir, 'mvnw'))) {
        msg('mvnw not found, using mvn instead', colors.yellow)
        commandExists('mvn')
        mvnCommand = 'mvn -f pom.xml clean package'
    } else {
        commandExists('./mvnw')
    }

    if (shell.exec(mvnCommand).code !== 0) {
        shell.cd(currentDir)
        msg('Failed to build RESTHeart', colors.red)
        process.exit(1)
    }
    shell.cd(currentDir)
}

// Function to deploy the plugin
function deployPlugin() {
    shell.cp(path.join(repoDir, 'target', '*.jar'), path.join(rhDir, 'plugins'))
    shell.cp(
        path.join(repoDir, 'target', 'lib', '*.jar'),
        path.join(rhDir, 'plugins'),
        { silent: true }
    )
    msg('Plugin deployed', colors.green)
}

// Function to run RESTHeart
function runRESTHeart(restheartOptions) {
    commandExists('java')
    if (!isRESTHeartRunning()) {
        msg('Starting RESTHeart', colors.yellow)
        const command = `nohup java -jar ${path.join(rhDir, 'restheart.jar')} ${restheartOptions} > ${path.join(repoDir, 'restheart.log')} &`
        msg(`Running command: ${command}`, colors.yellow)
        shell.exec(command)
        msg(`RESTHeart started at localhost:${httpPort}`, colors.green)
    } else {
        msg('RESTHeart is already running', colors.cyan)
    }
}

// Function to watch files using chokidar
function watchFiles() {
    const watcher = chokidar.watch(path.join(repoDir, 'src/**/*.java'), {
        ignored: /(^|[\\/])\../, // ignore dotfiles
        persistent: true,
    })

    watcher.on('change', (filePath) => {
        msg(`File changed: ${filePath}`, colors.yellow)
        runCommand('run', { restheartOptions: '' })
    })

    msg('Watching for file changes...', colors.cyan)
}

// Function to handle running commands
function runCommand(command, options) {
    console.log('Options: ', options) // Log options to see what is passed
    switch (command) {
        case 'install':
            if (options.restheartVersion) {
                installRESTHeart(options.restheartVersion, options.forceInstall)
            } else {
                msg(
                    'Error: Version is required for install command.',
                    colors.red
                )
                yargs.showHelp()
            }
            break
        case 'build':
            buildPlugin()
            deployPlugin()
            break
        case 'run':
            if (isRESTHeartRunning()) killRESTHeart()
            if (options.build) {
                buildPlugin()
                deployPlugin()
            }
            runRESTHeart(options.restheartOptions)
            break
        case 'test':
            if (isRESTHeartRunning()) killRESTHeart()
            deployPlugin() // Skip build step for test
            runRESTHeart(options.restheartOptions)
            break
        case 'kill':
            killRESTHeart()
            break
        case 'watch':
            watchFiles()
            break
        default:
            yargs.showHelp()
            break
    }
}

// Command line arguments setup with command and options handling
yargs(hideBin(process.argv))
    .parserConfiguration({
        'populate--': true,
    })
    .usage('Usage: $0 [command] [options]')
    .command(
        ['install <restheartVersion>', 'i'],
        'Install RESTHeart',
        (yargs) => {
            yargs
                .positional('restheartVersion', {
                    describe: 'RESTHeart version to install',
                    type: 'string',
                    demandOption: true,
                })
                .option('force', {
                    alias: 'f',
                    type: 'boolean',
                    description: 'Force reinstalling RESTHeart',
                })
        },
        (argv) =>
            runCommand('install', {
                restheartVersion: argv.restheartVersion,
                forceInstall: argv.force,
            })
    )
    .command(
        ['build', 'b'],
        'Build and deploy the plugin, restarting RESTHeart (default)',
        {},
        (argv) => runCommand('build', argv)
    )
    .command(
        ['run [restheartOptions..]', 'r'],
        'Start or restart RESTHeart',
        (yargs) => {
            yargs
                .option('build', {
                    alias: 'b',
                    type: 'boolean',
                    description:
                        'Build and deploy the plugin before running RESTHeart',
                })
                .positional('restheartOptions', {
                    describe: 'Options to pass to RESTHeart',
                    type: 'string',
                    default: '',
                })
        },
        (argv) => {
            const restheartOptions = (argv['--'] && argv['--'].join(' ')) || ''
            runCommand('run', { build: argv.build, restheartOptions })
        }
    )
    .command(
        ['test', 't'],
        'Start or restart RESTHeart for integration tests (e.g., mvn verify)',
        {},
        (argv) => runCommand('test', argv)
    )
    .command(['kill', 'k'], 'Kill RESTHeart', {}, (argv) =>
        runCommand('kill', argv)
    )
    .command(
        ['watch', 'w'],
        'Watch sources and build and deploy the plugin on changes, restarting RESTHeart',
        {},
        (argv) => runCommand('watch', argv)
    )
    .help('h')
    .alias('h', 'help')
    .demandCommand(1, 'You need at least one command before moving on')
    .parseSync()

process.on('exit', cleanup)
