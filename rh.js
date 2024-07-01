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
function installRESTHeart(rhversion, forceInstall) {
    if (forceInstall) {
        msg('Cleaning cache', colors.cyan)
        shell.rm('-rf', cacheDir)
    }

    if (!fs.existsSync(rhDir)) {
        msg(`Installing RESTHeart version ${rhversion}`, colors.green)

        if (!fs.existsSync(cacheDir)) {
            shell.mkdir(cacheDir)
        }

        if (downloadRESTHeart(rhversion)) {
            msg(`RESTHeart version ${rhversion} downloaded`, colors.green)
        } else {
            msg(`Failed to download RESTHeart version ${rhversion}`, colors.red)
            process.exit(1)
        }

        shell.exec(`tar -xzf ${cacheDir}/restheart.tar.gz -C ${cacheDir}`)
        shell.rm('-f', `${cacheDir}/restheart.tar.gz`)
    } else {
        msg(`RESTHeart version ${rhversion} already installed`, colors.cyan)
    }
}

// Function to download RESTHeart
function downloadRESTHeart(rhversion) {
    commandExists('curl')
    const url = `https://github.com/SoftInstigate/restheart/releases/download/${rhversion}/restheart.tar.gz`
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
function runRESTHeart(options) {
    commandExists('java')
    if (!isRESTHeartRunning()) {
        msg('Starting RESTHeart', colors.yellow)
        shell.exec(
            `nohup java -jar ${path.join(rhDir, 'restheart.jar')} ${options} > ${path.join(repoDir, 'restheart.log')} &`
        )
        msg(`RESTHeart started at localhost:${httpPort}`, colors.green)
    } else {
        msg('RESTHeart is already running', colors.cyan)
    }
}

// Function to watch files using chokidar
function watchFiles() {
    const watcher = chokidar.watch(path.join(repoDir, 'src/**/*.java'), {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true,
    })

    watcher.on('change', (filePath) => {
        msg(`File changed: ${filePath}`, colors.yellow)
        runCommand('run')
    })

    msg('Watching for file changes...', colors.cyan)
}

// Function to handle running commands
function runCommand(command, options = {}) {
    const { rhversion: rhversion, forceInstall, options: restheartOptions } = options
    switch (command) {
        case 'install':
            if (rhversion) {
                installRESTHeart(rhversion, forceInstall)
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
            buildPlugin()
            deployPlugin()
            runRESTHeart(restheartOptions)
            break
        case 'test':
            if (isRESTHeartRunning()) killRESTHeart()
            deployPlugin() // Skip build step for test
            runRESTHeart(restheartOptions)
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
const argv = yargs(hideBin(process.argv))
    .usage('Usage: $0 [command] [options]')
    .command(
        'install <rhversion>',
        'Install RESTHeart',
        (yargs) => {
            yargs.positional('rhversion', {
                describe: 'RESTHeart version to install',
                type: 'string',
                demandOption: true,
            })
        },
        (argv) =>
            runCommand('install', {
                rhversion: argv.rhversion,
                forceInstall: argv.force,
            })
    )
    .command(
        'build',
        'Build and deploy the plugin, restarting RESTHeart (default)',
        {},
        (argv) => runCommand('build', argv)
    )
    .command('run', 'Start or restart RESTHeart', {}, (argv) =>
        runCommand('run', argv)
    )
    .command(
        'test',
        'Start or restart RESTHeart for integration tests (e.g., mvn verify)',
        {},
        (argv) => runCommand('test', argv)
    )
    .command('kill', 'Kill RESTHeart', {}, (argv) => runCommand('kill', argv))
    .command(
        'watch',
        'Watch sources and build and deploy the plugin on changes, restarting RESTHeart',
        {},
        (argv) => runCommand('watch', argv)
    )
    .option('force', {
        alias: 'f',
        type: 'boolean',
        description: 'Force reinstalling RESTHeart',
    })
    .option('port', {
        alias: 'p',
        type: 'number',
        description: 'HTTP port to use',
        default: 8080,
    })
    .option('options', {
        alias: 'o',
        type: 'string',
        description: 'Pass options to RESTHeart',
    })
    .option('no-color', {
        type: 'boolean',
        description: 'Disable colored output',
    })
    .help('h')
    .alias('h', 'help')
    .demandCommand(1, 'You need at least one command before moving on').argv

process.on('exit', cleanup)
