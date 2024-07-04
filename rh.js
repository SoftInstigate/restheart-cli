#!/usr/bin/env node

import shell from 'shelljs'
import path from 'path'
import fs from 'fs'
import yargs from 'yargs'
import chokidar from 'chokidar'
import ora from 'ora'
import { hideBin } from 'yargs/helpers'
import chalk from 'chalk'
import https from 'https'

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
    msg('Bye.', chalk.green)
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
        const spinner = ora(
            `Killing RESTHeart at localhost:${httpPort}`
        ).start()
        shell.exec(`kill $(lsof -t -i:${httpPort})`, { silent: true })
        spinner.render()
        shell.exec(`kill $(lsof -t -i:$((httpPort + 1000)))`, { silent: true })
        spinner.render()
        spinner.succeed(`RESTHeart at localhost:${httpPort} killed`)
        spinner.stop()
    } else {
        msg(`RESTHeart is not running on port ${httpPort}`, chalk.cyan)
    }
}

// Function to check if RESTHeart is running
function isRESTHeartRunning() {
    return (
        shell.exec(`lsof -i:${httpPort}`, { silent: true }).code === 0 ||
        shell.exec(`lsof -i:$((httpPort + 1000))`, { silent: true }).code === 0
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

        downloadRESTHeart(restheartVersion)
    } else {
        msg(
            'RESTHeart already installed. Use the -f option to force a reinstall.',
            chalk.reset
        )
    }
}

// Function to download RESTHeart
function downloadRESTHeart(restheartVersion) {
    const url =
        restheartVersion === 'latest'
            ? 'https://github.com/SoftInstigate/restheart/releases/latest/download/restheart.tar.gz'
            : `https://github.com/SoftInstigate/restheart/releases/download/${restheartVersion}/restheart.tar.gz`
    const file = fs.createWriteStream(`${cacheDir}/restheart.tar.gz`)

    downloadAndExtractRESTHeart(url)

    function downloadAndExtractRESTHeart(url) {
        https
            .get(url, (response) => {
                if (response.statusCode === 200) {
                    extractAndInstallRESTHeart(response)
                } else if (response.statusCode === 302) {
                    const redirectUrl = response.headers.location
                    if (redirectUrl) {
                        downloadAndExtractRESTHeart(redirectUrl) // Recursively follow redirects
                    } else {
                        msg('Error: Redirection URL not found', chalk.red)
                        shell.exit(1)
                    }
                } else {
                    msg(
                        `Error downloading RESTHeart: Server responded with status code ${response.statusCode}`,
                        chalk.red
                    )
                    shell.exit(1)
                }
            })
            .on('error', (err) => {
                fs.unlink(`${cacheDir}/restheart.tar.gz`, (unlinkErr) => {
                    if (unlinkErr) {
                        msg(
                            `Error removing incomplete file: ${unlinkErr.message}`,
                            chalk.red
                        )
                    }
                    msg(
                        `Error downloading RESTHeart: ${err.message}`,
                        chalk.red
                    )
                    shell.exit(1)
                })
            })
    }

    function extractAndInstallRESTHeart(response) {
        const spinner = ora('Downloading RESTHeart...').start()

        response.pipe(file)

        const fileSize = response.headers['content-length']
        let downloaded = 0

        response.on('data', (chunk) => {
            downloaded += chunk.length
            spinner.text = `Downloading RESTHeart... ${Math.round((downloaded / fileSize) * 100)}%`
        })

        file.on('finish', () => {
            file.close(() => {
                spinner.succeed('RESTHeart downloaded')
                msg('Extracting RESTHeart...', chalk.cyan)

                shell.exec(
                    `tar -xzf ${cacheDir}/restheart.tar.gz -C ${cacheDir}`
                )

                shell.rm('-f', `${cacheDir}/restheart.tar.gz`)
                shell.exec(`java -jar ${path.join(rhDir, 'restheart.jar')} -v`)

                deploy()

                msg('RESTHeart successfully installed', chalk.green)

                shell.exit(0)
            })
        }).on('error', (writeErr) => {
            msg(`Error writing file: ${writeErr.message}`, chalk.red)
            shell.exit(1)
        })
    }
}

// Function to build the plugin
function build(mvnParams = '') {
    msg('Building RESTHeart...', chalk.yellow)

    shell.rm('-rf', path.join(repoDir, 'target'))
    const currentDir = shell.pwd()

    shell.cd(repoDir)
    let mvnCommand = `./mvnw -f pom.xml ${mvnParams}`
    if (!fs.existsSync(path.join(repoDir, 'mvnw'))) {
        msg('mvnw not found, using mvn instead', chalk.yellow)
        commandExists('mvn')
        mvnCommand = `mvn -f pom.xml ${mvnParams}`
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
    const spinner = ora('Deploying plugins...').start()
    shell.cp(path.join(repoDir, 'target', '*.jar'), path.join(rhDir, 'plugins'))
    shell.cp(
        path.join(repoDir, 'target', 'lib', '*.jar'),
        path.join(rhDir, 'plugins')
    )
    spinner.succeed('Plugins deployed')
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
        const command = `nohup java -jar ${path.join(rhDir, 'restheart.jar')} ${restheartOptions} &> ${path.join(repoDir, 'restheart.log')} &`
        msg(`Running command: ${command}`)
        shell.exec(command, { async: true })
        // Wait for RESTHeart to start
        const spinner = ora('RESTHeart is starting...\n').start()
        let timeout = 30
        while (!isRESTHeartRunning()) {
            spinner.render()
            shell.exec('sleep 0.2')
            if (timeout-- <= 0) {
                spinner.fail('Failed to start RESTHeart')
                spinner.stop()
                shell.exit(1)
            }
        }
        spinner.succeed(`RESTHeart is running at localhost:${httpPort}`)
        spinner.stop()
    } else {
        msg('RESTHeart is already running', chalk.cyan)
    }
}

// Function to watch files using chokidar
function watchFiles(restheartOptions) {
    const watcher = chokidar.watch(path.join(repoDir, 'src/main/**/*.java'), {
        ignored: /(^|[\\/])\../, // ignore dotfiles
        persistent: true,
    })

    watcher.on('change', (filePath) => {
        msg(`File changed: ${filePath}`, chalk.yellow)
        if (isRESTHeartRunning()) killRESTHeart()
        build('package -DskipTests=true')
        deploy()
        run(restheartOptions)
        msg('Watching for file changes...', chalk.cyan)
    })

    msg('Watching for file changes...', chalk.cyan)
}

// Function to handle running commands
function runCommand(command, options) {
    if (options.port) {
        httpPort = options.port
    }
    switch (command) {
        case 'install':
            install(options.restheartVersion, options.forceInstall)
            break
        case 'build':
            build('clean package')
            deploy()
            break
        case 'run':
            if (isRESTHeartRunning()) killRESTHeart()
            if (options.build) {
                build('clean package -DskipTests=true')
                deploy()
            }
            run(options.restheartOptions)
            break
        case 'test':
            if (isRESTHeartRunning()) killRESTHeart()
            build('clean package -DskipTests=true')
            deploy()
            run(options.restheartOptions)
            break
        case 'kill':
            killRESTHeart()
            break
        case 'watch':
            if (isRESTHeartRunning()) killRESTHeart()
            if (options.build) {
                build('clean package -DskipTests=true')
                deploy()
            }
            run(options.restheartOptions)
            watchFiles(options.restheartOptions)
            break
        default:
            yargs.showHelp()
            break
    }
}

// Intercept CTRL-C and kill RESTHeart before exiting
process.on('SIGINT', function () {
    if (isRESTHeartRunning()) killRESTHeart()
    process.exit()
})

// Register cleanup function to run on exit
process.on('exit', cleanup)

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
                .option('port', {
                    alias: 'p',
                    type: 'number',
                    description: 'HTTP port',
                    default: 8080,
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
    .command(
        ['kill', 'k'],
        'Kill RESTHeart',
        (yargs) => {
            yargs.option('port', {
                alias: 'p',
                type: 'number',
                description: 'HTTP port',
                default: 8080,
            })
        },
        (argv) => runCommand('kill', argv)
    )
    .command(
        ['watch', 'w'],
        'Watch sources and build and deploy plugins on changes, restarting RESTHeart',
        (yargs) => {
            yargs
                .option('build', {
                    alias: 'b',
                    type: 'boolean',
                    description:
                        'Build and deploy the plugin before running RESTHeart',
                })
                .option('port', {
                    alias: 'p',
                    type: 'number',
                    description: 'HTTP port',
                    default: 8080,
                })
        },
        (argv) => {
            const restheartOptions = (argv['--'] && argv['--'].join(' ')) || ''
            runCommand('watch', { build: argv.build, restheartOptions })
        }
    )
    .help('h')
    .alias('h', 'help')
    .demandCommand(1, 'You need at least one command before moving on')
    .parseSync()
