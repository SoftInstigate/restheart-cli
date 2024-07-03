#!/usr/bin/env node

import shell from 'shelljs'
import path from 'path'
import fs from 'fs'
import yargs from 'yargs'
import chokidar from 'chokidar'
import ora from 'ora'
import { hideBin } from 'yargs/helpers'
import chalk from 'chalk'

// Directory setup
const scriptDir = process.cwd() // Use the current working directory
const repoDir = scriptDir
const cacheDir = path.join(repoDir, '.cache')
const rhDir = path.join(cacheDir, 'restheart')
let httpPort = 8080

// Function to display messages
function msg(message, color = chalk.reset) {
    console.log(color(message))
}

// Function to handle script cleanup
function cleanup() {
    // Cleanup code here
}

// Function to check if a command exists
function commandExists(command) {
    if (!shell.which(command)) {
        msg(`Error: ${command} is required but not installed.`, chalk.red)
        shell.exit(1)
    }
}

// Function to kill RESTHeart
function killRESTHeart() {
    if (isRESTHeartRunning()) {
        msg(`Killing RESTHeart at localhost:${httpPort}`, chalk.yellow)
        shell.exec(`kill $(lsof -t -i:${httpPort})`, { silent: true })
        shell.exec(`kill $(lsof -t -i:$((httpPort + 1000)))`, { silent: true })
        msg(`RESTHeart at localhost:${httpPort} killed`, chalk.green)
    } else {
        msg(`RESTHeart is not running on port ${httpPort}`, chalk.cyan)
    }
}

// Function to check if RESTHeart is running
function isRESTHeartRunning() {
    return (
        shell.exec(`curl -s -o /dev/null localhost:${httpPort}/ping`).code === 0
    )
}

// Function to install RESTHeart
function install(restheartVersion, forceInstall) {
    if (!restheartVersion) {
        restheartVersion = 'latest'
    }

    msg(`Installing RESTHeart version "${restheartVersion}"`, chalk.yellow)

    if (forceInstall) {
        msg('Cleaning cache', chalk.cyan)
        shell.rm('-rf', cacheDir)
    }

    if (!fs.existsSync(rhDir)) {
        if (!fs.existsSync(cacheDir)) {
            shell.mkdir(cacheDir)
        }

        if (!downloadRESTHeart(restheartVersion)) {
            msg(
                `Failed to download RESTHeart version "${restheartVersion}"`,
                chalk.red
            )
            shell.exit(1)
        }

        msg('Extracting RESTHeart...', chalk.cyan)

        shell.exec(`tar -xzf ${cacheDir}/restheart.tar.gz -C ${cacheDir}`)
        shell.rm('-f', `${cacheDir}/restheart.tar.gz`)
        shell.exec(`java -jar ${path.join(rhDir, 'restheart.jar')} -v`)

        msg('RESTHeart successfully installed', chalk.green)
    } else {
        msg(
            'RESTHeart already installed. Use the -f option to force a reinstall.',
            chalk.cyan
        )
    }
}

// Function to download RESTHeart
function downloadRESTHeart(restheartVersion) {
    msg('Downloading RESTHeart...', chalk.cyan)
    commandExists('curl')
    const url =
        restheartVersion === 'latest'
            ? 'https://github.com/SoftInstigate/restheart/releases/latest/download/restheart.tar.gz'
            : `https://github.com/SoftInstigate/restheart/releases/download/${restheartVersion}/restheart.tar.gz`
    return (
        shell.exec(
            `curl --fail -L ${url} --output ${cacheDir}/restheart.tar.gz`
        ).code === 0
    )
}

// Function to build the plugin
function build() {
    shell.rm('-rf', path.join(repoDir, 'target'))
    const currentDir = shell.pwd()

    shell.cd(repoDir)
    let mvnCommand = './mvnw -f pom.xml clean package'
    if (!fs.existsSync(path.join(repoDir, 'mvnw'))) {
        msg('mvnw not found, using mvn instead', chalk.yellow)
        commandExists('mvn')
        mvnCommand = 'mvn -f pom.xml clean package'
    } else {
        commandExists('./mvnw')
    }

    if (shell.exec(mvnCommand).code !== 0) {
        shell.cd(currentDir)
        msg('Failed to build RESTHeart', chalk.red)
        shell.exit(1)
    }
    shell.cd(currentDir)
}

// Function to deploy the plugin
function deploy() {
    shell.cp(path.join(repoDir, 'target', '*.jar'), path.join(rhDir, 'plugins'))
    shell.cp(
        path.join(repoDir, 'target', 'lib', '*.jar'),
        path.join(rhDir, 'plugins'),
        { silent: true }
    )
    msg('Plugin deployed', chalk.green)
}

function onlyPrintConfig(restheartOptions) {
    return /.*-t.*|.*-c.*|.*-v.*/.test(restheartOptions)
}

// Function to run RESTHeart
function run(restheartOptions) {
    commandExists('java')
    if (!isRESTHeartRunning()) {
        if (onlyPrintConfig(restheartOptions)) {
            msg('Printing RESTHeart configuration', chalk.yellow)
            shell.exec(
                `java -jar ${path.join(rhDir, 'restheart.jar')} ${restheartOptions}`
            )
            return
        }
        msg('Starting RESTHeart', chalk.yellow)
        const command = `nohup java -jar ${path.join(rhDir, 'restheart.jar')} ${restheartOptions} > ${path.join(repoDir, 'restheart.log')} &`
        msg(`Running command: ${command}`)
        shell.exec(command, { async: true })
        // Wait for RESTHeart to start
        const spinner = ora('Starting RESTHeart...\n').start()
        while (!isRESTHeartRunning()) {
            spinner.render()
            shell.exec('sleep 0.5')
        }
        spinner.succeed('RESTHeart started')
        spinner.stop()
        msg(`RESTHeart is running at localhost:${httpPort}`, chalk.green)
        shell.exit(0)
    } else {
        msg('RESTHeart is already running', chalk.cyan)
    }
}

// Function to watch files using chokidar
function watchFiles() {
    const watcher = chokidar.watch(path.join(repoDir, 'src/**/*.java'), {
        ignored: /(^|[\\/])\../, // ignore dotfiles
        persistent: true,
    })

    watcher.on('change', (filePath) => {
        msg(`File changed: ${filePath}`, chalk.yellow)
        runCommand('run', { restheartOptions: '' })
    })

    msg('Watching for file changes...', chalk.cyan)
}

// Function to handle running commands
function runCommand(command, options) {
    switch (command) {
        case 'install':
            install(options.restheartVersion, options.forceInstall)
            break
        case 'build':
            build()
            deploy()
            break
        case 'run':
            if (isRESTHeartRunning()) killRESTHeart()
            if (options.build) {
                build()
                deploy()
            }
            run(options.restheartOptions)
            break
        case 'test':
            if (isRESTHeartRunning()) killRESTHeart()
            deploy() // Skip build step for test
            run(options.restheartOptions)
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
        ['install [restheartVersion]', 'i'],
        'Install RESTHeart',
        (yargs) => {
            yargs
                .positional('restheartVersion', {
                    describe: 'RESTHeart version to install',
                    type: 'string',
                    default: 'latest',
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
