import chalk from 'chalk'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { ErrorHandler } from './error-handler.js'
import { logger, LogLevel } from './logger.js'
import { msg, RESTHeartManager } from './restheart.js'

/**
 * Initialize the CLI application
 */
export function initCLI() {
    // Process unhandled exceptions and rejections
    process.on('uncaughtException', (error) => {
        ErrorHandler.handleError(error, {
            exitProcess: true,
            showStack: true,
            exitCode: 1
        })
    })

    process.on('unhandledRejection', (reason) => {
        const error = reason instanceof Error ? reason : new Error(String(reason))
        ErrorHandler.handleError(error, {
            exitProcess: true,
            showStack: true,
            exitCode: 1
        })
    })

    // Create RESTHeart manager instance
    const rh = new RESTHeartManager()

    // Intercept CTRL-C and kill RESTHeart before exiting
    process.on('SIGINT', async () => {
        console.log('\n')
        try {
            if (await rh.isRunning()) {
                await rh.kill()
            }
        } catch (error) {
            logger.error(`Error during shutdown: ${error.message}`)
        }
        process.exit(0)
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
            'Install or update RESTHeart to a specific version (default: latest)',
            (yargs) => {
                yargs
                    .positional('restheart-version', {
                        describe: 'RESTHeart version to install (e.g., "latest", "7.7.11")',
                        type: 'string',
                        default: 'latest',
                    })
                    .option('force', {
                        alias: 'f',
                        type: 'boolean',
                        description: 'Force reinstallation even if already installed',
                    })
            },
            (argv) => runCommand('install', argv, rh)
        )
        .command(
            ['build', 'b'],
            'Build and deploy the RESTHeart plugin from the current directory',
            {},
            (argv) => runCommand('build', argv, rh)
        )
        .command(
            ['run [restheart-options..]', 'r'],
            'Start or restart RESTHeart with optional configuration',
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
                        description: 'HTTP port for RESTHeart to listen on',
                    })
                    .positional('restheart-options', {
                        describe: 'Options to pass directly to RESTHeart (after -- separator)',
                        type: 'string',
                        default: '',
                    })
                    .example(
                        'rh run -- -o etc/localhost.yml',
                        'Start RESTHeart with custom configuration file'
                    )
            },
            (argv) => {
                runCommand('run', argv, rh)
            }
        )
        .command(
            ['kill', 'k'],
            'Stop any running RESTHeart instances',
            (yargs) => {
                yargs.option('port', {
                    alias: 'p',
                    type: 'number',
                    description: 'HTTP port of the RESTHeart instance to kill',
                })
            },
            (argv) => runCommand('kill', argv, rh)
        )
        .command(
            ['watch', 'w'],
            'Watch for source changes, rebuild and restart RESTHeart automatically',
            (yargs) => {
                yargs
                    .option('build', {
                        alias: 'b',
                        type: 'boolean',
                        description: 'Build and deploy the plugin before starting the watch process',
                    })
                    .option('port', {
                        alias: 'p',
                        type: 'number',
                        description: 'HTTP port for RESTHeart to listen on',
                    })
                    .option('debounce-time', {
                        type: 'number',
                        description: 'Time in milliseconds to wait after the last file change before rebuilding (default: 1000)',
                        default: 1000,
                    })
                    .example(
                        'rh watch -- -o etc/localhost.yml',
                        'Watch sources with custom configuration file'
                    )
            },
            (argv) => {
                runCommand('watch', argv, rh)
            }
        )
        .command(
            ['status', 's'],
            'Check if RESTHeart is currently running',
            (yargs) => {
                yargs.option('port', {
                    alias: 'p',
                    type: 'number',
                    description: 'HTTP port of the RESTHeart instance to check',
                })
            },
            (argv) => runCommand('status', argv, rh)
        )
        .option('debug', {
            alias: 'd',
            type: 'boolean',
            description: 'Run in debug mode with additional diagnostic information',
        })
        .option('verbose', {
            alias: 'v',
            type: 'boolean',
            description: 'Show verbose output including debug messages',
        })
        .option('quiet', {
            alias: 'q',
            type: 'boolean',
            description: 'Show only error messages and suppress other output',
        })
        .option('timestamps', {
            alias: 't',
            type: 'boolean',
            description: 'Add timestamps to log messages for better traceability',
        })
        .help('h')
        .alias('h', 'help')
        .demandCommand(1, 'You need at least one command before moving on')
        .middleware([(argv) => {
            // Configure logger based on arguments
            if (argv.verbose) {
                logger.setLevel(LogLevel.DEBUG)
            } else if (argv.quiet) {
                logger.setLevel(LogLevel.ERROR)
            } else {
                // Set default log level to INFO
                logger.setLevel(LogLevel.INFO)
            }

            // Set timestamps if requested
            if (argv.timestamps) {
                logger.setTimestamps(true)
            }

            // Set debug mode in RESTHeart manager if specified
            if (argv.debug) {
                rh.setDebugMode(true)
            }
        }])
        .parse()
}

/**
 * Run a command
 * @param {string} command Command to run
 * @param {Object} argv Command arguments
 * @param {RESTHeartManager} rh RESTHeart manager instance
 */
async function runCommand(command, argv, rh) {
    try {
        // Extract options
        const restheartOptions = (argv['--'] && argv['--'].join(' ')) || ''

        // Configure RESTHeart manager
        if (argv.port) {
            rh.setHttpPort(argv.port)
        }

        // Only show debug info if debug flag is explicitly set
        if (argv.debug) {
            msg(
                chalk.cyan('Running command: ') +
                command +
                chalk.cyan(' with options:\n') +
                JSON.stringify(argv, null, 2)
            )
            rh.printConfiguration()
        }

        // Execute appropriate command
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
                        rh.build('clean package', true)
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
                    rh.build('clean package', true)
                    rh.deploy()
                }
                await rh.run(restheartOptions)

                // Pass the restheartOptions to watchFiles
                // The watchFiles implementation doesn't accept a second parameter
                // in the original code, so we maintain compatibility
                rh.watchFiles(restheartOptions)
                break

            case 'status':
                await rh.status()
                break

            default:
                yargs.showHelp()
                break
        }
    } catch (error) {
        ErrorHandler.handleError(error, {
            exitProcess: true,
            showStack: true
        })
    }
}