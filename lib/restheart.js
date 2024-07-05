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
        this.filesChanged = 0
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
            msg(`No process found on port ${port}`, chalk.cyan)
            return
        }
        processes.forEach((proc) => {
            try {
                process.kill(proc.pid, 'SIGTERM')
                msg(`Process on port ${port} killed`, chalk.cyan)
            } catch (err) {
                msg(`Failed to kill process ${proc.pid}: ${err}`, chalk.red)
            }
        })
    }

    // Function to kill RESTHeart
    async kill() {
        msg(`\n💀 Killing RESTHeart at localhost:${this.httpPort}`, chalk.yellow)

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

        msg(`⌛️ Installing RESTHeart version "${restheartVersion}"`, chalk.yellow)

        if (forceInstall) {
            msg('Cleaning cache', chalk.cyan)
            shell.rm('-rf', this.cacheDir)
        }

        if (!fs.existsSync(this.rhDir)) {
            if (!fs.existsSync(this.cacheDir)) {
                shell.mkdir(this.cacheDir)
            }

            this.downloadRESTHeart(restheartVersion)
        } else {
            msg('RESTHeart already installed. Use the -f option to force a reinstall.', chalk.cyan)
        }
    }

    // Function to download RESTHeart
    downloadRESTHeart(restheartVersion) {
        const url =
            restheartVersion === 'latest'
                ? 'https://github.com/SoftInstigate/restheart/releases/latest/download/restheart.tar.gz'
                : `https://github.com/SoftInstigate/restheart/releases/download/${restheartVersion}/restheart.tar.gz`
        const file = fs.createWriteStream(`${this.cacheDir}/restheart.tar.gz`)

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
                    fs.unlink(`${this.cacheDir}/restheart.tar.gz`, (unlinkErr) => {
                        if (unlinkErr) {
                            msg(`Error removing incomplete file: ${unlinkErr.message}`, chalk.red)
                        }
                        msg(`Error downloading RESTHeart: ${err.message}`, chalk.red)
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

                    shell.exec(`tar -xzf ${this.cacheDir}/restheart.tar.gz -C ${this.cacheDir}`)

                    shell.rm('-f', `${this.cacheDir}/restheart.tar.gz`)
                    shell
                        .exec(`java -jar ${path.join(this.rhDir, 'restheart.jar')} -v`)
                        .to(path.join(this.cacheDir, 'restheart_version.txt'))

                    this.deploy()

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
    build(mvnParams = '') {
        msg('\n⏱️ Building RESTHeart...', chalk.yellow)

        shell.rm('-rf', path.join(this.repoDir, 'target'))
        const currentDir = shell.pwd()

        shell.cd(this.repoDir)
        let mvnCommand = `./mvnw -f pom.xml ${mvnParams}`
        if (!fs.existsSync(path.join(this.repoDir, 'mvnw'))) {
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
        commandExists('nohup')

        if (onlyPrintConfig(restheartOptions)) {
            msg('Printing RESTHeart configuration', chalk.yellow)
            shell.exec(`java -jar ${path.join(this.rhDir, 'restheart.jar')} ${restheartOptions}`)
            return
        }

        shell.env['RHO'] = shell.env['RHO']
            ? `${shell.env['RHO']};/http-listner/port->${this.httpPort};/logging/full-stacktrace->true;`
            : `/http-listner/port->${this.httpPort};/logging/full-stacktrace->true;`

        const command = `nohup java -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=0.0.0.0:${this.httpPort + 1000} -jar ${path.join(this.rhDir, 'restheart.jar')} ${restheartOptions} &> ${path.join(this.repoDir, 'restheart.log')} &`

        msg('\nStarting RESTHeart with:', chalk.yellow)
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

        msg(`(JDWP available for debuggers at localhost:${this.httpPort + 1000})`)
    }

    // Function to watch files using chokidar
    watchFiles(restheartOptions) {
        msg('\n👀 Watching for file changes...', chalk.yellow)

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
                msg('\nWatching for file changes...', chalk.yellow)
            }, 1000) // Debounce interval of 1000 milliseconds (1 second)
        })
    }
}

/** private functions **/

function msg(message, color = chalk.reset) {
    console.log(color(message))
}

function onlyPrintConfig(restheartOptions) {
    return /.*-t.*|.*-c.*|.*-v.*/.test(restheartOptions)
}

// Function to check if a command exists
function commandExists(command) {
    if (!shell.which(command)) {
        msg(`Error: ${command} is required but not installed.`, chalk.red)
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
