/**
 * Enhanced CLI help module for RESTHeart CLI
 */

import chalk from 'chalk';
import fs from 'fs';
import { logger } from './logger.js';

/**
 * Get the version number from package.json
 * @returns {string} The version number
 */
export function getVersion() {
    try {
        // Use dynamic import to load package.json
        const packagePath = new URL('../package.json', import.meta.url);
        return JSON.parse(fs.readFileSync(packagePath, 'utf-8')).version;
    } catch (error) {
        logger.error(`Failed to read version from package.json: ${error.message}`);
        return '0.0.0'; // Fallback version
    }
}

/**
 * Command descriptions with examples
 */
export const commandDescriptions = {
    install: {
        desc: 'Install or update RESTHeart to a specific version',
        details: 'Downloads and installs RESTHeart from GitHub releases. Supports specific versions or "latest".',
        examples: [
            ['$0 install', 'Install latest version'],
            ['$0 install 8.10.1', 'Install specific version'],
            ['$0 install --force', 'Force reinstallation']
        ]
    },
    build: {
        desc: 'Build and deploy the RESTHeart plugin from the current directory',
        details: 'Builds the project using Maven and copies the resulting JARs to the plugins directory.',
        examples: [
            ['$0 build', 'Build and deploy plugin'],
            ['$0 build --skip-tests', 'Build without running tests']
        ]
    },
    run: {
        desc: 'Start or restart RESTHeart with optional configuration',
        details: 'Launches RESTHeart in the background with the specified options. Supports debugging via JDWP.',
        examples: [
            ['$0 run', 'Run with default settings'],
            ['$0 run --build', 'Build before running'],
            ['$0 run --port 9090', 'Run on specific port'],
            ['$0 run -- -o etc/localhost.yml', 'Use custom config file']
        ]
    },
    kill: {
        desc: 'Stop any running RESTHeart instances',
        details: 'Terminates all running RESTHeart processes. Can target a specific port if specified.',
        examples: [
            ['$0 kill', 'Stop all instances'],
            ['$0 kill --port 9090', 'Stop instance on specific port']
        ]
    },
    watch: {
        desc: 'Watch for source changes, rebuild and restart RESTHeart automatically',
        details: 'Monitors source files for changes and automatically rebuilds/redeploys/restarts RESTHeart.',
        examples: [
            ['$0 watch', 'Watch with default settings'],
            ['$0 watch --build', 'Build before watching'],
            ['$0 watch --debounce-time 2000', 'Set custom debounce time'],
            ['$0 watch -- -o etc/localhost.yml', 'Watch with custom config']
        ]
    },
    status: {
        desc: 'Check if RESTHeart is currently running',
        details: 'Checks if a RESTHeart instance is running on the specified port.',
        examples: [
            ['$0 status', 'Check default instance'],
            ['$0 status --port 9090', 'Check instance on specific port']
        ]
    }
};

/**
 * Global option descriptions
 */
export const globalOptions = {
    debug: {
        option: '--debug',
        alias: '-d',
        desc: 'Run in debug mode with additional diagnostic information',
        details: 'Enables detailed logging of internal operations and configuration.'
    },
    verbose: {
        option: '--verbose',
        alias: '-v',
        desc: 'Show verbose output including debug messages',
        details: 'Increases the log level to show more detailed information during execution.'
    },
    quiet: {
        option: '--quiet',
        alias: '-q',
        desc: 'Show only error messages and suppress other output',
        details: 'Reduces output to only show errors, useful for scripts and CI environments.'
    },
    timestamps: {
        option: '--timestamps',
        alias: '-t',
        desc: 'Add timestamps to log messages for better traceability',
        details: 'Prefixes each log message with an ISO timestamp for better tracking.'
    }
};

/**
 * Add examples to a command
 * @param {Object} yargs Yargs instance
 * @param {string} command Command name
 */
export function addCommandExamples(yargs, command) {
    const cmdInfo = commandDescriptions[command];

    if (cmdInfo && cmdInfo.examples) {
        cmdInfo.examples.forEach(example => {
            yargs.example(...example);
        });
    }

    return yargs;
}

/**
 * Get a formatted description for a command
 * @param {string} command Command name
 * @returns {string} Formatted description
 */
export function getFormattedCommandDescription(command) {
    const info = commandDescriptions[command];
    if (!info) return '';

    return `${info.desc}\n\n${chalk.cyan('Details:')} ${info.details}`;
}