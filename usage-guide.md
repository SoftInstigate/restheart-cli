# RESTHeart CLI Usage Guide

This guide provides practical examples for common workflows with the RESTHeart CLI.

## Table of Contents

1. [Installation](#installation)
2. [Development Workflow](#development-workflow)
3. [Build and Deployment](#build-and-deployment)
4. [Process Management](#process-management)
5. [Advanced Usage](#advanced-usage)

## Installation

### First-time Installation

Install the latest version of RESTHeart:

```bash
rh install
```

This will:
- Download the latest RESTHeart release
- Extract it to the `.cache/restheart` directory
- Set up the required directory structure

### Installing a Specific Version

```bash
rh install 8.3.4
```

### Updating or Reinstalling

Force a clean reinstallation:

```bash
rh install --force
```

## Development Workflow

### Setup Development Environment

Start a development environment with auto-rebuild:

```bash
# Start with file watching (auto-rebuild on changes)
rh watch

# Start with file watching using a custom config file
rh watch -- -o etc/dev-config.yml
```

### Development with Custom Settings

Watch with custom settings:

```bash
# Watch on a different port
rh watch --port 9090

# Watch with initial build
rh watch --build

# Watch with longer debounce time (wait longer between changes)
rh watch --debounce-time 2000

# Watch with debug information
rh watch --debug
```

### Debugging

Enable verbose output for detailed logs:

```bash
rh watch --verbose
```

View the RESTHeart log file:

```bash
tail -f restheart.log
```

Connect to the JDWP debug port (default: HTTP port + 1000):

```bash
# If HTTP port is 8080, debug port is 9080
# Configure your IDE to connect to localhost:9080
```

## Build and Deployment

### Building and Deploying Plugins

Build and deploy plugins in the current directory:

```bash
rh build
```

### Running with Built-in Build

Run RESTHeart with an automatic build before starting:

```bash
# Build and run in a single command
rh run --build
```

### Running with Custom Config

```bash
# Run with a custom configuration file
rh run -- -o etc/custom-config.yml

# Build, then run with a custom configuration file
rh run --build -- -o etc/custom-config.yml
```

## Process Management

### Check Process Status

```bash
rh status
```

### Start and Stop

```bash
# Start RESTHeart
rh run

# Stop RESTHeart
rh kill

# Start on a different port
rh run --port 9090

# Stop instance on a specific port
rh kill --port 9090
```

### Multiple Instances

Run multiple instances on different ports:

```bash
# Start first instance
rh run --port 8080

# Start second instance (in a new terminal)
rh run --port 9090
```

## Advanced Usage

### Custom Build and Run Parameters

```bash
# Build and run in debug mode
rh run --build --debug

# Build and run with verbose logging
rh run --build --verbose
```

### Logging

Configure logging verbosity:

```bash
# Only show errors
rh --quiet run

# Show verbose debug information
rh --verbose run

# Add timestamps to logs
rh --timestamps run
```

### Understanding Debug vs Verbose

- `--debug`: Enables debug mode in the RESTHeart application itself, showing internal configuration details.
- `--verbose`: Increases the CLI tool's log level to show more detailed information.

```bash
# For complete diagnostic information, use both:
rh run --debug --verbose
```

### Non-interactive Environments (CI/CD)

For CI/CD environments, the progress spinners will be automatically disabled. Additional flags for CI environments:

```bash
# Run silently (minimal output)
rh --quiet build

# Run with timestamps for better log tracing
rh --timestamps build
```

## Troubleshooting

### Common Error: Port in Use

```
Error: Port 8080 is already in use
```

Resolution:
```bash
# Kill any instances using that port
rh kill --port 8080

# Or start on a different port
rh run --port 9090
```

### Common Error: Build Failure

```
Error: Maven build failed
```

Resolution:
```bash
# Check the Maven build directly
./mvnw clean package

# Try with verbose output
rh --verbose build
```

### Common Error: RESTHeart Not Starting

```
Error: RESTHeart failed to start
```

Resolution:
```bash
# Check the log file
cat restheart.log

# Try with debug mode
rh --debug run
```
