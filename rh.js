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

    // Print welcome message
    console.log('\n')
    msg(chalk.green(' ============================'))
    msg('   Welcome to RESTHeart CLI')
    msg(chalk.green(' ============================\n'))

    // Command line arguments setup with command and options handling
    yargs(hideBin(process.argv))
        .strict()
        .parserConfiguration({
            'populate--': true,
        })
        .usage('Usage: $0 [command] [options]')
        .command(
            ['install [restheart-version]', 'i'],
            'Install RESTHeart',
            (yargs) => {
                yargs
                    .positional('restheart-version', {
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
            (argv) => runCommand('install', argv)
        )
        .command(
            ['build', 'b'],
            'Build and deploy the plugin, restarting RESTHeart (default)',
            {},
            (argv) => runCommand('build', argv)
        )
        .command(
            ['run [restheart-options..]', 'r'],
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
                    .positional('restheart-options', {
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
                runCommand('run', argv)
            }
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
                runCommand('watch', argv)
            }
        )
        .command(
            ['status', 's'],
            'Show the status of RESTHeart',
            (yargs) => {
                yargs.option('port', {
                    alias: 'p',
                    type: 'number',
                    description: 'HTTP port',
                })
            },
            (argv) => runCommand('status', argv)
        )
        .option('debug', {
            alias: 'd',
            type: 'boolean',
            description: 'Run in debug mode',
        })
        .help('h')
        .alias('h', 'help')
        .demandCommand(1, 'You need at least one command before moving on')
        .parse()

    // Function to handle running commands
    async function runCommand(command, argv) {
        const restheartOptions = (argv['--'] && argv['--'].join(' ')) || '-o etc/dev.yml'

        if (argv.port) {
            rh.setHttpPort(argv.port)
        }
        if (argv.debug) {
            msg(
                chalk.cyan('Running command: ') +
                    command +
                    chalk.cyan(' with options:\n') +
                    JSON.stringify(argv, null, 2)
            )
            rh.setDebugMode(argv.debug)
            rh.printConfiguration()
        }

        switch (command) {
            case 'install':
                rh.install(argv.restheartVersion, argv.force)
                break
            case 'build':
                rh.build('clean package')
                rh.deploy()
                break
            case 'run':
                if (!rh.onlyPrintConfig(restheartOptions)) {
                    await rh.checkAndKill()
                    if (argv.build) {
                        rh.build('clean package -DskipTests=true')
                        rh.deploy()
                    }
                }
                await rh.run(restheartOptions)
                break
            case 'kill':
                await rh.checkAndKill()
                break
            case 'watch':
                await rh.checkAndKill()
                if (argv.build) {
                    rh.build('clean package -DskipTests=true')
                    rh.deploy()
                }
                await rh.run(restheartOptions)
                rh.watchFiles(restheartOptions)
                break
            case 'status':
                rh.status()
                break
            default:
                yargs.showHelp()
                break
        }
    }
}

// Run the main function
main()
