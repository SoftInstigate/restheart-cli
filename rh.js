#!/usr/bin/env node

import chalk from 'chalk'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import {
    build,
    deploy,
    install,
    isRESTHeartRunning,
    killRESTHeart,
    msg,
    run,
    watchFiles,
    setHttpPort,
    setDebugMode
} from './lib/utils.js'

// Function to handle running commands
async function runCommand(command, options) {
    if (options.port) {
        setHttpPort(options.port)
    }
    if (options.debug) {
        setDebugMode(true)
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
            if (await isRESTHeartRunning()) await killRESTHeart()
            if (options.build) {
                build('clean package -DskipTests=true')
                deploy()
            }
            run(options.restheartOptions)
            break
        case 'test':
            if (await isRESTHeartRunning()) await killRESTHeart()
            build('clean package -DskipTests=true')
            deploy()
            run(options.restheartOptions)
            break
        case 'kill':
            await killRESTHeart()
            break
        case 'watch':
            if (await isRESTHeartRunning()) await killRESTHeart()
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
process.on('SIGINT', async () => {
    console.log('\n')
    if (await isRESTHeartRunning()) await killRESTHeart()
    process.exit()
})

// Register cleanup function to run on exit
process.on('exit', () => {
    msg('\nDone.\n', chalk.green)
})

console.log('\n')
msg('============================', chalk.green)
msg('  Welcome to RESTHeart CLI')
msg('============================\n', chalk.green)

// Command line arguments setup with command and options handling
yargs(hideBin(process.argv))
    .strict()
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
    .option('debug', {
        alias: 'd',
        type: 'boolean',
        description: 'Run in debug mode',
        default: false,
    })
    .help('h')
    .alias('h', 'help')
    .demandCommand(1, 'You need at least one command before moving on')
    .parse()
