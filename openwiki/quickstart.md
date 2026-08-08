---
type: Guide
title: RESTHeart CLI Quickstart
description: Getting started with RESTHeart CLI - installation, basic usage, and navigation to detailed documentation
tags: [quickstart, getting-started, restheart-cli]
timestamp: 2026-03-15T10:30:00Z
openwiki:
  roles: [workflow]
  change_kinds: [public-api, lifecycle]
  source_paths: [rh.js, lib/cli.js]
  symbols: [initCLI, runCommand]
  test_paths: [test/cli.test.js]
  validation_commands: [npm test]
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

## Task Routing Table

Use this table to find the right starting point for common change types.

| Change Area | Wiki Page | Source Entry Points | Key Symbols / Types | Focused Tests | Validation Command |
|---|---|---|---|---|---|
| Add or modify a CLI command | [Architecture](architecture/overview.md), [Source Map](architecture/source-map.md) | `lib/cli.js`, `lib/restheart.js` | `initCLI`, `runCommand`, `RESTHeartManager` | `test/cli.test.js` | `npx vitest run test/cli.test.js` |
| Change build/deploy behavior | [Architecture](architecture/overview.md), [Source Map](architecture/source-map.md) | `lib/builder.js`, `lib/build-systems/index.js` | `Builder`, `resolveBuildSystem` | `test/builder.test.js`, `test/build-system-resolver.test.js` | `npx vitest run test/builder.test.js` |
| Add a new build system | [Architecture](architecture/overview.md) | `lib/build-systems/` | `MavenBuildSystem`, `GradleBuildSystem` | `test/build-system-resolver.test.js` | `npx vitest run test/build-system-resolver.test.js` |
| Modify installer logic | [Source Map](architecture/source-map.md) | `lib/installer.js` | `Installer` | (no dedicated test) | `npm test` |
| Change process/port management | [Operations Runbook](operations/runbook.md), [Source Map](architecture/source-map.md) | `lib/process-manager.js` | `ProcessManager` | `test/process-manager.test.js` | `npx vitest run test/process-manager.test.js` |
| Modify file watcher behavior | [Development Workflows](workflows/development-workflow.md), [Source Map](architecture/source-map.md) | `lib/watcher.js` | `Watcher` | `test/watcher.test.js` | `npx vitest run test/watcher.test.js` |
| Update configuration defaults | [Domain Concepts](domain/concepts.md), [Source Map](architecture/source-map.md) | `lib/config.js` | `ConfigManager` | `test/config.test.js` | `npx vitest run test/config.test.js` |
| Change logging or error handling | [Architecture](architecture/overview.md) | `lib/logger.js`, `lib/error-handler.js` | `Logger`, `ErrorHandler` | `test/logger.test.js`, `test/error-handler.test.js` | `npx vitest run test/logger.test.js test/error-handler.test.js` |
| Add utility functions | [Source Map](architecture/source-map.md) | `lib/utils.js` | `checkPort`, `commandExists`, `ensureDir`, `createSpinner` | `test/utils.test.js` | `npx vitest run test/utils.test.js` |
| Troubleshoot runtime issues | [Operations Runbook](operations/runbook.md) | `lib/process-manager.js`, `lib/watcher.js` | `ProcessManager`, `Watcher` | `test/process-manager.test.js` | `npm test` |
| Understand build system detection | [Domain Concepts](domain/concepts.md), [Source Map](architecture/source-map.md) | `lib/build-systems/index.js` | `resolveBuildSystem` | `test/build-system-resolver.test.js` | `npx vitest run test/build-system-resolver.test.js` |

## Project Information

- **Package**: `@softinstigate/rh`
- **Version**: 1.0.1
- **License**: MIT
- **Repository**: [github.com/SoftInstigate/restheart-cli](https://github.com/SoftInstigate/restheart-cli)

---

*This documentation is maintained alongside the codebase. For the latest information, always check the source files and git history.*