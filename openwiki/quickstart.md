---
type: Guide
title: RESTHeart CLI Quickstart
description: Getting started with RESTHeart CLI - installation, basic usage, and navigation to detailed documentation
tags: [quickstart, getting-started, restheart-cli]
timestamp: 2026-03-15T10:30:00Z
---

# RESTHeart CLI Quickstart

Welcome to the RESTHeart CLI documentation. This guide provides a fast introduction to the tool and links to detailed documentation for deeper exploration.

## What is RESTHeart CLI?

RESTHeart CLI (`rh`) is a command-line tool that automates the local development workflow for RESTHeart plugin developers. It eliminates repetitive manual steps by providing a single interface for:

- **Installing** and updating RESTHeart
- **Building** and deploying Java plugins (Maven/Gradle)
- **Starting** and stopping RESTHeart instances
- **Watching** for code changes and automatically rebuilding/restarting

The tool is designed to accelerate the development feedback loop, allowing developers to focus on writing code rather than managing build and deployment processes.

## Installation

### Prerequisites

- Node.js v18 or later
- Java JDK v21 or later
- Maven 3.8+ or Gradle 7+ (or use wrapper scripts)

### Install from npm (Recommended)

```bash
# Global installation
npm install -g @softinstigate/rh

# Or use without global install
npx @softinstigate/rh --help
```

### Install from Source

```bash
git clone https://github.com/SoftInstigate/restheart-cli.git
cd restheart-cli
npm install
npm link
```

## Quick Start Workflow

Here's the typical development workflow:

```bash
# 1. Install RESTHeart (latest version)
rh install

# 2. Build and deploy your plugin
rh build

# 3. Run RESTHeart
rh run

# 4. Enable file watching (auto-rebuild on changes)
rh watch
```

### What Happens

1. `rh install` downloads RESTHeart into `.cache/restheart` in your project directory
2. `rh build` runs the auto-detected build system (Maven or Gradle) and deploys plugin JARs
3. `rh run` starts RESTHeart (default HTTP port: 8080)
4. `rh watch` monitors source/config changes and automatically rebuilds/restarts

## Essential Commands

| Command | Description |
|---------|-------------|
| `rh install [version\|path]` | Install or update RESTHeart |
| `rh build` | Build and deploy plugins |
| `rh run [options]` | Start RESTHeart |
| `rh watch [options]` | Watch for changes and auto-rebuild |
| `rh kill` | Stop running RESTHeart instances |
| `rh status` | Check if RESTHeart is running |

## Common Options

- `--port PORT` - HTTP port (default: 8080)
- `--build-system auto\|maven\|gradle` - Build system preference
- `--debug` - Enable debug mode
- `--verbose` - Show verbose output
- `--quiet` - Suppress non-error output

## Documentation Structure

This documentation is organized into focused sections:

### Core Documentation

- **[Architecture Overview](architecture/overview.md)** - Technical architecture, component relationships, and design decisions
- **[Source Map](architecture/source-map.md)** - Navigate the codebase effectively with file organization and entry points
- **[Development Workflows](workflows/development-workflow.md)** - Common development patterns and step-by-step guides

### Reference Documentation

- **[Domain Concepts](domain/concepts.md)** - Core terminology, build systems, and RESTHeart ecosystem concepts
- **[Operations Runbook](operations/runbook.md)** - Troubleshooting, debugging, and operational procedures
- **[Testing Guidance](testing/guidance.md)** - Testing framework, patterns, and quality standards

## Quick Reference

### Build System Selection

```bash
# Auto-detect (default)
rh build

# Force Maven
rh build --build-system maven

# Force Gradle
rh build --build-system gradle
```

### Development with MongoDB

```bash
# Standalone mode (no MongoDB required)
rh run -- -s

# Connect to specific MongoDB instance
RHO='/mclient/connection-string->"mongodb://192.168.1.100:27017"' rh watch
```

### Debugging

```bash
# Enable debug mode
rh --debug [command]

# Check RESTHeart status
rh status

# View logs
tail -f restheart.log
```

## Getting Help

- **CLI Help**: `rh --help` or `rh [command] --help`
- **Usage Guide**: See [usage-guide.md](../usage-guide.md) for detailed examples
- **RESTHeart Documentation**: [restheart.org/docs](https://restheart.org/docs/plugins/overview)

## Next Steps

1. **New to RESTHeart?** Start with the [Development Workflows](workflows/development-workflow.md)
2. **Understanding the code?** Explore the [Architecture Overview](architecture/overview.md)
3. **Contributing?** Check the [Testing Guidance](testing/guidance.md) and [Source Map](architecture/source-map.md)
4. **Having issues?** Consult the [Operations Runbook](operations/runbook.md)

## Project Information

- **Package**: `@softinstigate/rh`
- **Version**: 1.0.1
- **License**: MIT
- **Repository**: [github.com/SoftInstigate/restheart-cli](https://github.com/SoftInstigate/restheart-cli)

---

*This documentation is maintained alongside the codebase. For the latest information, always check the source files and git history.*