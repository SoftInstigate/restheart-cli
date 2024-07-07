import chalk from 'chalk'
import chokidar from 'chokidar'
import find from 'find-process'
import fs from 'fs'
import https from 'https'
import net from 'net'
import ora from 'ora'
import path from 'path'
import shell from 'shelljs'

export class RESTHeart {
    constructor(httpPort, debugMode) {
        this.repoDir = process.cwd()
        this.cacheDir = path.join(this.repoDir, '.cache')
        this.rhDir = path.join(this.cacheDir, 'restheart')
        this.httpPort = httpPort || 8080
        this.debugMode = debugMode || false
    }

    printConfiguration() {
        msg(`repoDir: ${this.repoDir}`)
        msg(`cacheDir: ${this.cacheDir}`)
        msg(`rhDir: ${this.rhDir}`)
        msg(`httpPort: ${this.httpPort}`)
        msg(`debugMode: ${this.debugMode}`)
        msg('\n')
    }

    /**
     * @param {number} port
     */
    setHttpPort(port) {
        this.httpPort = port
    }

    /**
     * @param {boolean} debug
     */
    setDebugMode(debug) {
        this.debugMode = debug
    }

    // Function to kill a process on a given port
    async killProcessOnPort(port) {
        const processes = await find('port', port)
        if (processes.length === 0) {
            msg(chalk.cyan(`No process found on port ${port}`))
            return
        }
        processes.forEach((proc) => {
            try {
                process.kill(proc.pid, 'SIGTERM')
                msg(chalk.cyan(`Process on port ${port} killed`))
            } catch (err) {
                msg(chalk.red(`Failed to kill process ${proc.pid}: ${err}`))
            }
        })
    }

    // Function to kill RESTHeart
    async kill() {
        msg(chalk.yellow(`💀 Killing RESTHeart at localhost:${this.httpPort}`))

        await Promise.all([
            this.killProcessOnPort(this.httpPort),
            this.killProcessOnPort(this.httpPort + 1000),
        ])

        do {
            shell.exec('sleep 1')
        } while (await this.isRunning())
    }

    // Function to check if RESTHeart is running
    async isRunning() {
        const isRunningOnHttpPort = await checkPort(this.httpPort)
        const isRunningOnHttpPortPlus1000 = await checkPort(this.httpPort + 1000)

        if (this.debugMode) {
            msg(`isRunningOnHttpPort: ${isRunningOnHttpPort}`)
            msg(`isRunningOnHttpPortPlus1000: ${isRunningOnHttpPortPlus1000}\n`)
        }

        return isRunningOnHttpPort || isRunningOnHttpPortPlus1000
    }

    // Function to install RESTHeart
    install(restheartVersion, forceInstall) {
        if (!restheartVersion) {
            restheartVersion = 'latest'
        }

        msg(chalk.yellow(`⌛️ Installing RESTHeart version "${restheartVersion}"`))

        if (forceInstall) {
            msg(chalk.cyan('Cleaning cache'))
            shell.rm('-rf', this.cacheDir)
        }

        if (!fs.existsSync(this.rhDir)) {
            if (!fs.existsSync(this.cacheDir)) {
                shell.mkdir(this.cacheDir)
            }

            this.downloadRESTHeart(restheartVersion)
        } else {
            msg(chalk.cyan('RESTHeart already installed. Use the -f option to force a reinstall.'))
        }
    }

    // Function to download RESTHeart
    downloadRESTHeart(restheartVersion) {
        const url =
            restheartVersion === 'latest'
                ? 'https://github.com/SoftInstigate/restheart/releases/latest/download/restheart.tar.gz'
                : `https://github.com/SoftInstigate/restheart/releases/download/${restheartVersion}/restheart.tar.gz`
        const file = fs.createWriteStream(`${this.cacheDir}/restheart.tar.gz`)

        this.downloadAndExtractRESTHeart(url, file)
    }

    // recursive function to download and extract RESTHeart
    downloadAndExtractRESTHeart(url, file) {
        https
            .get(url, (response) => {
                if (response.statusCode === 200) {
                    this.extractAndInstallRESTHeart(response, file)
                } else if (response.statusCode === 302) {
                    const redirectUrl = response.headers.location
                    if (redirectUrl) {
                        this.downloadAndExtractRESTHeart(redirectUrl, file) // Recursively follow redirects
                    } else {
                        msg(chalk.red('Error: Redirection URL not found'))
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
                fs.unlink(`${this.cacheDir}/restheart.tar.gz`, (unlinkErr) => {
                    if (unlinkErr) {
                        msg(chalk.red(`Error removing incomplete file: ${unlinkErr.message}`))
                    }
                    msg(chalk.red(`Error downloading RESTHeart: ${err.message}`))
                    shell.exit(1)
                })
            })
    }

    extractAndInstallRESTHeart(response, file) {
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
                msg(chalk.cyan('Extracting RESTHeart...'))

                shell.exec(`tar -xzf ${this.cacheDir}/restheart.tar.gz -C ${this.cacheDir}`)

                shell.rm('-f', `${this.cacheDir}/restheart.tar.gz`)
                shell
                    .exec(`java -jar ${path.join(this.rhDir, 'restheart.jar')} -v`)
                    .to(path.join(this.cacheDir, 'restheart_version.txt'))

                this.deploy()

                msg(chalk.green('RESTHeart successfully installed'))

                shell.exit(0)
            })
        }).on('error', (writeErr) => {
            msg(chalk.red(`Error writing file: ${writeErr.message}`))
            shell.exit(1)
        })
    }

    // Function to build the plugin
    build(mvnParams = '') {
        msg(chalk.yellow('\n⏱️ Building RESTHeart...'))

        shell.rm('-rf', path.join(this.repoDir, 'target'))
        const currentDir = shell.pwd()

        shell.cd(this.repoDir)
        let mvnCommand = `./mvnw -f pom.xml ${mvnParams}`
        if (!fs.existsSync(path.join(this.repoDir, 'mvnw'))) {
            msg(chalk.yellow('mvnw not found, using mvn instead'))
            commandExists('mvn')
            mvnCommand = `mvn -f pom.xml ${mvnParams}`
        } else {
            commandExists('./mvnw')
        }

        if (shell.exec(mvnCommand).code !== 0) {
            shell.cd(currentDir)
            msg(chalk.red('Failed to build RESTHeart'))
            shell.exit(1)
        }
        shell.cd(currentDir)
    }

    // Function to deploy the plugin
    deploy() {
        const spinner = ora('Deploying plugins...').start()
        shell.cp(path.join(this.repoDir, 'target', '*.jar'), path.join(this.rhDir, 'plugins'))
        shell.cp(
            path.join(this.repoDir, 'target', 'lib', '*.jar'),
            path.join(this.rhDir, 'plugins')
        )
        spinner.succeed('Plugins deployed')

        if (this.debugMode) {
            let count = 1
            console.log('\n')
            shell.ls(path.join(this.rhDir, 'plugins')).forEach((file) => {
                msg(`${count++}\t${file}`)
            })
            console.log('\n')
        }
    }

    // Function to run RESTHeart
    async run(restheartOptions) {
        commandExists('java')
        const nohup = shell.which('nohup') || ''

        if (onlyPrintConfig(restheartOptions)) {
            msg(chalk.yellow('Printing RESTHeart configuration'))
            shell.exec(`java -jar ${path.join(this.rhDir, 'restheart.jar')} ${restheartOptions}`)
            return
        }

        shell.env['RHO'] = shell.env['RHO']
            ? `${shell.env['RHO']};/http-listner/port->${this.httpPort};/logging/full-stacktrace->true;`
            : `/http-listner/port->${this.httpPort};/logging/full-stacktrace->true;`

        const command = `${nohup} java -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=0.0.0.0:${this.httpPort + 1000} -jar ${path.join(this.rhDir, 'restheart.jar')} ${restheartOptions} &> ${path.join(this.repoDir, 'restheart.log')} &`

        msg(chalk.yellow('Starting RESTHeart with:'))
        msg(`\tRHO="${shell.env['RHO']}"`)
        msg(`\tOptions: "${restheartOptions}"\n`)

        shell.exec(command, { async: true })
        // Wait for RESTHeart to start
        const spinner = ora('RESTHeart is starting...\n').start()
        let timeout = 30
        while (!(await this.isRunning())) {
            spinner.render()
            shell.exec('sleep 0.2')
            if (timeout-- <= 0) {
                spinner.fail('Failed to start RESTHeart')
                spinner.stop()
                shell.exit(1)
            }
        }
        spinner.succeed(`RESTHeart is running at localhost:${this.httpPort} 🚀`)

        msg(chalk.cyan(`\nJDWP available for debuggers at localhost:${this.httpPort + 1000}`))
    }

    // Function to watch files using chokidar
    watchFiles(restheartOptions) {
        msg(chalk.yellow('\n👀 Watching for file changes...'))

        const watcher = chokidar.watch(path.join(this.repoDir, 'src/main/**/*.java'), {
            ignored: /(^|[\\/])\../, // ignore dotfiles
            persistent: true,
            awaitWriteFinish: {
                stabilityThreshold: 1000,
                pollInterval: 200,
            },
        })

        // Debounce function to limit the number of times the handler is called
        let debounceTimeoutId

        watcher.on('change', async (filePath) => {
            // Clear any existing timeout to reset the debounce period
            clearTimeout(debounceTimeoutId)

            // Set a new timeout
            debounceTimeoutId = setTimeout(async () => {
                // Handler code to execute once after the last change event in the interval
                msg(`File changed: ${filePath}`)
                if (await this.isRunning()) await this.kill()
                this.build('package -DskipTests=true')
                this.deploy()
                await this.run(restheartOptions)
                msg(chalk.yellow('\nWatching for file changes...'))
            }, 1000) // Debounce interval of 1000 milliseconds (1 second)
        })
    }
}

/** private functions **/

function msg(message) {
    console.log(message)
}

function onlyPrintConfig(restheartOptions) {
    return /.*-t.*|.*-c.*|.*-v.*/.test(restheartOptions)
}

// Function to check if a command exists
function commandExists(command) {
    if (!shell.which(command)) {
        msg(chalk.red(`Error: ${command} is required but not installed.`))
        shell.exit(1)
    }
}

function checkPort(port) {
    return new Promise((resolve) => {
        const client = net.createConnection({ port }, () => {
            client.end()
            resolve(true)
        })
        client.on('error', () => {
            resolve(false)
        })
    })
}

export { RESTHeart as default, msg }
