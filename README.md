# RESTHeart CLI

A command-line interface for managing [RESTHeart](https://restheart.org) instances, simplifying development, installation, and operation workflows.

> RESTHeart simplifies backend development by eliminating the need to write boilerplate CRUD operations and authentication code, allowing developers to focus on building their applications.

## Overview

RESTHeart CLI (`rh`) is a powerful tool designed to streamline the development and management of RESTHeart Java applications. It provides a convenient interface for common tasks such as:

- **Installing** and **updating** RESTHeart
- **Building** and **deploying** Java plugins
- **Starting** and **stopping** RESTHeart instances
- **Watching** for code changes and automatically rebuilding/redeploying

> Typically, you will begin with a Maven project. Refer to the [official documentation](https://restheart.org/docs/plugins/overview) for detailed instructions on implementing custom plugins.

## Installation

### Prerequisites

- Node.js (v18 or later)
- Java JDK (v21 or later)
- Maven (3.8 or later, if not using the included Maven wrapper)

### Install from npm (recommended)

```bash
npm install -g @softinstigate/rh
# or use npx without global install:
npx @softinstigate/rh --help
```

### Install from source

```bash
git clone https://github.com/SoftInstigate/restheart-cli.git
cd restheart-cli
npm install
npm link
```

## Quick Start

```bash
# Install RESTHeart (latest version)
rh install

# Build and deploy your plugin
rh build

# Run RESTHeart
rh run

# Enable file watching (auto-rebuild on changes)
rh watch
```

👉 Look at the [Usage Guide](https://github.com/SoftInstigate/restheart-cli/blob/master/usage-guide.md) for more practical examples for common workflows.

## Commands

### Install RESTHeart

Install or update RESTHeart to a specific version:

```bash
rh install [restheart-version] [--force]
```

Options:

- `restheart-version`: Version to install (e.g., "latest", "8.10.1") (default: "latest")
- `--force`, `-f`: Force reinstallation even if already installed

Examples:

```bash
# Install the latest version
rh install

# Install a specific version
rh install 8.10.1

# Force reinstallation
rh install --force
```

### Build and Deploy

Build and deploy RESTHeart plugins from the current directory:

```bash
rh build
```

This command:

1. Builds the project using Maven
2. Deploys the built JARs to the RESTHeart plugins directory

### Run RESTHeart

Start or restart RESTHeart with optional configuration:

```bash
rh run [restheart-options..] [--build] [--port PORT]
```

Options:

- `restheart-options`: Options to pass directly to RESTHeart (after -- separator)
- `--build`, `-b`: Build and deploy the plugin before running RESTHeart
- `--port`, `-p`: HTTP port for RESTHeart to listen on

Examples:

```bash
# Run with default settings
rh run

# Run with custom configuration file
rh run -- -o etc/localhost.yml

# Build before running
rh run --build
```

### Kill RESTHeart

Stop any running RESTHeart instances:

```bash
rh kill [--port PORT]
```

Options:

- `--port`, `-p`: HTTP port of the RESTHeart instance to kill

### Watch for Changes

Watch for source changes, automatically rebuilding and restarting RESTHeart:

```bash
rh watch [--build] [--port PORT] [--debounce-time MS]
```

Options:

- `--build`, `-b`: Build and deploy the plugin before starting the watch process
- `--port`, `-p`: HTTP port for RESTHeart to listen on
- `--debounce-time`: Time in milliseconds to wait after the last file change before rebuilding (default: 1000)

Example:

```bash
# Watch source files with custom configuration
rh watch -- -o etc/localhost.yml
```

### Check Status

Check if RESTHeart is currently running:

```bash
rh status [--port PORT]
```

Options:

- `--port`, `-p`: HTTP port of the RESTHeart instance to check

## Global Options

These options can be used with any command:

- `--version`: Display the version number of RESTHeart CLI
- `--debug`, `-d`: Run in debug mode with additional diagnostic information
- `--verbose`, `-v`: Show verbose output including debug messages
- `--quiet`, `-q`: Show only error messages and suppress other output
- `--timestamps`, `-t`: Add timestamps to log messages for better traceability
- `--help`, `-h`: Show help information

## Configuration

RESTHeart CLI uses a configuration system that manages:

- Repository directory (current working directory)
- Cache directory (`.cache` in the repository directory)
- RESTHeart directory (`.cache/restheart` in the repository directory)
- HTTP port (default: 8080)
- Debug mode (default: false)

These settings can be modified through command-line options or directly in the code.

## Development Workflow

A typical development workflow with RESTHeart CLI:

1. Install RESTHeart: `rh install`
2. Start with file watching: `rh watch`
3. Make changes to your code
4. RESTHeart CLI automatically detects changes, rebuilds and restarts
5. Check status: `rh status`
6. When done, stop RESTHeart: `rh kill`

👉 Look at the [Usage Guide](/usage-guide.md) for more practical examples for common workflows.

## Troubleshooting

### Common Issues

#### RESTHeart fails to start

Check the log file in the repository directory (`restheart.log`) for error details.

#### Build fails

Ensure Maven is correctly installed and the project structure is valid.

#### Port already in use

Use `rh kill` to stop any running instances, or specify a different port with `--port`.

### Debug Mode

For more detailed information, enable debug mode:

```bash
rh --debug [command]
```

## Publishing to npm

For maintainers who need to publish a new version to npmjs.com:

### Publishing Prerequisites

- You must be logged in to npm: `npm login`
- You must have publish permissions for the `@softinstigate/rh` package

### Release Process

1. **Update the version** in `package.json`:

    ```bash
    npm version patch  # for bug fixes
    npm version minor  # for new features
    npm version major  # for breaking changes
    ```

2. **Run quality checks**:

    ```bash
    npm run lint:check
    npm run format:check
    ```

3. **Publish to npm**:

    ```bash
    npm publish --access public
    ```

4. **Push the version tag to GitHub**:

    ```bash
    git push && git push --tags
    ```

### Verify Publication

After publishing, verify the package is available:

```bash
npm view @softinstigate/rh
```

## License

MIT

## Contributors

- SoftInstigate <info@softinstigate.com>
