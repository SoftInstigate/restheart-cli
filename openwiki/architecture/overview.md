---
type: Architecture
title: RESTHeart CLI Architecture Overview
description: Technical architecture, component relationships, and design decisions of the RESTHeart CLI tool
tags: [architecture, design, components, patterns]
timestamp: 2026-03-15T10:30:00Z
---

# RESTHeart CLI Architecture Overview

This document describes the technical architecture of RESTHeart CLI, explaining how the components work together to provide a streamlined development experience.

## High-Level Architecture

RESTHeart CLI follows a layered architecture with clear separation of concerns:

```
┌─────────────────────────────────────────┐
│              CLI Layer (cli.js)         │
│  • Command parsing (yargs)             │
│  • User interaction                    │
│  • Option handling                     │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│          Manager Layer (restheart.js)   │
│  • Orchestration                       │
│  • Component coordination              │
│  • Public API                          │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│        Component Layer                  │
│  • ConfigManager (config.js)           │
│  • Builder (builder.js)                │
│  • Installer (installer.js)            │
│  • ProcessManager (process-manager.js) │
│  • Watcher (watcher.js)                │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Infrastructure Layer            │
│  • Logger (logger.js)                  │
│  • ErrorHandler (error-handler.js)     │
│  • Utils (utils.js)                    │
│  • Build Systems (build-systems/)      │
└─────────────────────────────────────────┘
```

## Component Responsibilities

### CLI Layer (`lib/cli.js`)

The entry point for user interaction. Responsibilities:

- **Command Parsing**: Uses yargs to parse command-line arguments and options
- **Command Routing**: Routes commands to appropriate manager methods
- **User Feedback**: Displays welcome messages and handles CTRL-C gracefully
- **Option Validation**: Validates global and command-specific options

**Key Design Decisions**:
- Uses `populate--` to capture options after `--` separator for RESTHeart
- Implements strict mode for command validation
- Handles uncaught exceptions and unhandled rejections globally

### Manager Layer (`lib/restheart.js`)

The orchestration layer that coordinates all components. Responsibilities:

- **Component Initialization**: Creates and wires all component instances
- **Public API**: Exposes high-level methods for CLI commands
- **Configuration Management**: Delegates to ConfigManager
- **Lifecycle Management**: Handles startup, shutdown, and cleanup

**Key Design Decisions**:
- Single responsibility: each component handles one domain
- Dependency injection: components receive ConfigManager in constructor
- Facade pattern: provides simplified interface to complex subsystems

### Component Layer

#### ConfigManager (`lib/config.js`)

Manages all configuration settings. Responsibilities:

- **Configuration Storage**: Maintains runtime configuration state
- **Validation**: Validates configuration values (ports, paths, etc.)
- **Directory Management**: Ensures cache directories exist
- **Default Values**: Provides sensible defaults for all settings

**Configuration Hierarchy**:
1. Command-line options (highest priority)
2. Environment variables
3. Default values (lowest priority)

**Key Settings**:
- `repoDir`: Current working directory (project root)
- `cacheDir`: `.cache` directory for RESTHeart installation
- `rhDir`: `.cache/restheart` - RESTHeart installation directory
- `httpPort`: HTTP port (default: 8080)
- `debugMode`: Debug output flag
- `buildSystem`: Build system preference (auto/maven/gradle)

#### Builder (`lib/builder.js`)

Handles building and deploying RESTHeart plugins. Responsibilities:

- **Build Execution**: Runs Maven or Gradle build commands
- **Artifact Deployment**: Copies built JARs to RESTHeart plugins directory
- **Build System Resolution**: Determines which build system to use
- **Error Handling**: Deduplicates and formats build output

**Key Design Decisions**:
- Delegates build system specifics to `build-systems/` module
- Cleans target directory before building
- Returns to original directory after build (even on failure)
- Uses silent shell execution with deduplicated error output

#### Installer (`lib/installer.js`)

Manages RESTHeart installation. Responsibilities:

- **Version Resolution**: Handles "latest", specific versions, and local paths
- **Download Management**: Downloads RESTHeart from GitHub releases
- **Local Installation**: Installs from local RESTHeart builds
- **Version Verification**: Checks existing installations

**Installation Strategies**:
1. **Remote**: Downloads from GitHub releases (latest or specific version)
2. **Local**: Copies from local RESTHeart build directory

**Key Design Decisions**:
- Checks for Java installation before proceeding
- Verifies existing installations to avoid redundant downloads
- Supports force reinstallation with `--force` flag
- Uses native Node.js HTTPS for downloads (no external dependencies)

#### ProcessManager (`lib/process-manager.js`)

Manages RESTHeart process lifecycle. Responsibilities:

- **Process Execution**: Starts RESTHeart with configured options
- **Process Termination**: Kills running RESTHeart instances
- **Port Management**: Checks port availability and finds free ports
- **Status Monitoring**: Checks if RESTHeart is running

**Key Design Decisions**:
- Prefers `lsof` for port-specific process detection
- Falls back to `ps-list` for process discovery
- Parses RESTHeart YAML config for host/port settings
- Captures and manages RHO environment variable
- Implements graceful shutdown with timeout

#### Watcher (`lib/watcher.js`)

Monitors file changes and triggers rebuilds. Responsibilities:

- **File Monitoring**: Watches Java source files and build configuration
- **Debouncing**: Prevents excessive rebuilds during rapid changes
- **Change Detection**: Identifies which files changed and why
- **Rebuild Coordination**: Triggers build, deploy, and restart sequence

**Watched Paths**:
- `src/main/**/*.java` - Java source files
- `**/pom.xml` - Maven configuration
- `**/build.gradle` - Gradle configuration
- `**/build.gradle.kts` - Gradle Kotlin DSL
- `**/settings.gradle` - Gradle settings
- RESTHeart config files (parsed from `-o` option)

**Key Design Decisions**:
- Uses chokidar for cross-platform file watching
- Implements debouncing (default: 1000ms) to prevent rapid rebuilds
- Validates watch paths exist before starting
- Handles both Maven and Gradle build file changes

### Infrastructure Layer

#### Logger (`lib/logger.js`)

Provides consistent logging output. Responsibilities:

- **Log Levels**: Supports debug, info, warning, error, and status levels
- **Formatting**: Color-coded output with optional timestamps
- **Verbosity Control**: Respects `--verbose`, `--quiet`, and `--debug` flags

#### ErrorHandler (`lib/error-handler.js`)

Centralized error handling. Responsibilities:

- **Error Classification**: Categorizes errors (config, filesystem, process, etc.)
- **User-Friendly Messages**: Formats errors for human consumption
- **Exit Control**: Determines whether to exit process on error
- **Stack Trace Management**: Shows/hides stack traces based on context

#### Utils (`lib/utils.js`)

Shared utility functions. Responsibilities:

- **Port Checking**: Verifies port availability across multiple hosts
- **Command Existence**: Checks if system commands are available
- **Directory Creation**: Ensures directories exist recursively
- **Spinner Management**: Creates and manages progress spinners

#### Build Systems (`lib/build-systems/`)

Abstracts build system differences. Responsibilities:

- **Build System Resolution**: Determines Maven vs Gradle based on project files
- **Command Generation**: Generates appropriate build commands
- **Output Directory**: Returns correct target directory for each build system

**Supported Build Systems**:
- **Maven**: `mvn clean package` with configurable parameters
- **Gradle**: `gradle build` with wrapper support

## Data Flow

### Build and Deploy Flow

```
CLI Command → RESTHeartManager.build()
    → Builder.build()
        → BuildSystem.resolveBuildCommand()
        → shell.exec(buildCommand)
        → Builder.deploy()
            → Copy JARs to plugins directory
```

### Watch and Rebuild Flow

```
CLI Command → RESTHeartManager.watchFiles()
    → Watcher.watchFiles()
        → chokidar.watch(paths)
        → File change detected
        → Debounce timeout
        → processFileUpdate()
            → Builder.build()
            → Builder.deploy()
            → ProcessManager.kill()
            → ProcessManager.run()
```

### Installation Flow

```
CLI Command → RESTHeartManager.install()
    → Installer.install()
        → Check Java installation
        → Determine strategy (local/remote)
        → Download or copy RESTHeart
        → Verify installation
```

## Error Handling Strategy

### Error Categories

1. **Configuration Errors**: Invalid settings, missing directories
2. **Filesystem Errors**: Permission issues, missing files
3. **Process Errors**: Build failures, process crashes
4. **Network Errors**: Download failures, connection issues

### Error Recovery

- **Graceful Degradation**: Continue with warnings when possible
- **User Feedback**: Clear error messages with actionable suggestions
- **Process Cleanup**: Kill RESTHeart on CTRL-C or fatal errors
- **Directory Restoration**: Return to original directory after operations

## Testing Architecture

### Test Organization

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test component interactions
- **CLI Tests**: Test command routing and option handling

### Mocking Strategy

- **Shell Commands**: Mock shell.exec for build/install operations
- **File System**: Mock fs operations for configuration tests
- **Process Management**: Mock process.kill and ps-list

### Test Coverage

- **Components**: All major components have corresponding test files
- **Error Paths**: Both success and failure scenarios tested
- **Edge Cases**: Invalid inputs, missing files, permission issues

## Performance Considerations

### Startup Performance

- **Lazy Loading**: Components initialized only when needed
- **Configuration Caching**: ConfigManager caches settings
- **Directory Validation**: Cached existence checks

### Runtime Performance

- **Debouncing**: Prevents excessive rebuilds during rapid changes
- **Silent Execution**: Reduces output overhead for shell commands
- **Process Reuse**: Reuses existing RESTHeart process when possible

### Memory Management

- **Event Cleanup**: Watcher cleans up event listeners
- **Process Cleanup**: Kills child processes on exit
- **Timeout Management**: Clears timeouts to prevent leaks

## Security Considerations

### Input Validation

- **Port Validation**: Validates port range (1-65535)
- **Path Validation**: Validates directory existence
- **Command Validation**: Validates build system options

### Process Isolation

- **Working Directory**: Returns to original directory after operations
- **Environment Variables**: Manages RHO variable carefully
- **Process Termination**: Uses SIGTERM for graceful shutdown

## Extension Points

### Adding New Build Systems

1. Create new file in `lib/build-systems/`
2. Implement required interface methods
3. Register in `lib/build-systems/index.js`
4. Add tests in `test/build-system-resolver.test.js`

### Adding New Commands

1. Add command definition in `lib/cli.js`
2. Implement handler in `lib/restheart.js`
3. Add tests in `test/cli.test.js`
4. Update help text in `lib/help.js`

## Future Considerations

### Potential Improvements

- **Plugin Templates**: Generate plugin project scaffolding
- **Remote Management**: Manage remote RESTHeart instances
- **Configuration Files**: Support `.rhrc` configuration files
- **Plugin Registry**: Browse and install community plugins

### Architecture Evolution

- **Service Layer**: Extract business logic from managers
- **Event System**: Implement pub/sub for component communication
- **Plugin Architecture**: Support CLI plugins for extensibility

---

*This architecture reflects the current state of the codebase. For implementation details, refer to the [Source Map](source-map.md) and individual source files.*