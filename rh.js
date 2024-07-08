#!/usr/bin/env node

import chalk from 'chalk'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { RESTHeartManager, msg } from './lib/restheart.js'

function main() {
    const rh = new RESTHeartManager()

    // Intercept CTRL-C and kill RESTHeart before exiting
    process.on('SIGINT', async () => {
        console.log('\n')
        if (await rh.isRunning()) await rh.kill()
        process.exit()
    })

    // Register cleanup function to run on exit
    process.on('exit', () => {
        msg(chalk.green('\nDone.\n'))
    })

    console.log('\n')
    msg(chalk.green('============================'))
    msg('  Welcome to RESTHeart CLI')
    msg(chalk.green('============================\n'))

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
                        description: 'Build and deploy the plugin before running RESTHeart',
                    })
                    .option('port', {
                        alias: 'p',
                        type: 'number',
                        description: 'HTTP port',
                    })
                    .positional('restheartOptions', {
                        describe: 'Options to pass to RESTHeart',
                        type: 'string',
                        default: '',
                    })
                    .example(
                        'rh run -- -o etc/localhost.yml',
                        'Start or restart RESTHeart with custom options'
                    )
            },
            (argv) => {
                const restheartOptions = (argv['--'] && argv['--'].join(' ')) || ''
                runCommand('run', { build: argv.build, port: argv.port, restheartOptions })
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
                        description: 'Build and deploy the plugin before running RESTHeart',
                    })
                    .option('port', {
                        alias: 'p',
                        type: 'number',
                        description: 'HTTP port',
                    })
                    .example(
                        'rh watch -- -o etc/localhost.yml',
                        'Watch sources and build and deploy plugins on changes, restarting RESTHeart with custom options'
                    )
            },
            (argv) => {
                const restheartOptions = (argv['--'] && argv['--'].join(' ')) || '-o etc/dev.yml'
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

    // Function to handle running commands
    async function runCommand(command, options) {
        if (options.port) {
            rh.setHttpPort(options.port)
        }
        if (options.debug) {
            rh.setDebugMode(options.debug)
        }

        rh.printConfiguration()

        switch (command) {
            case 'install':
                rh.install(options.restheartVersion, options.forceInstall)
                break
            case 'build':
                rh.build('clean package')
                rh.deploy()
                break
            case 'run':
                await checkAndKill()
                if (options.build) {
                    rh.build('clean package -DskipTests=true')
                    rh.deploy()
                }
                await rh.run(options.restheartOptions)
                break
            case 'test':
                await checkAndKill()
                rh.build('clean package -DskipTests=true')
                rh.deploy()
                await rh.run(options.restheartOptions)
                break
            case 'kill':
                await rh.kill()
                break
            case 'watch':
                await checkAndKill()
                if (options.build) {
                    rh.build('clean package -DskipTests=true')
                    rh.deploy()
                }
                await rh.run(options.restheartOptions)
                rh.watchFiles(options.restheartOptions)
                break
            default:
                yargs.showHelp()
                break
        }
    }

    async function checkAndKill() {
        if (await rh.isRunning()) {
            msg(chalk.cyan('RESTHeart is already running'))
            await rh.kill()
        }
    }
}

// Run the main function
main()
