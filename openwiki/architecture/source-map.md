---
type: Reference
title: RESTHeart CLI Source Map
description: Codebase navigation guide with file organization, entry points, and key source locations
tags: [source-map, navigation, codebase, files]
timestamp: 2026-03-15T10:30:00Z
---

# RESTHeart CLI Source Map

This guide helps you navigate the RESTHeart CLI codebase efficiently. It explains the directory structure, key files, and where to find specific functionality.

## Directory Structure

```
restheart-cli/
├── lib/                    # Core implementation
│   ├── build-systems/      # Build system abstractions
│   ├── builder.js          # Build and deploy logic
│   ├── cli.js              # CLI entry point and command routing
│   ├── config.js           # Configuration management
│   ├── error-handler.js    # Centralized error handling
│   ├── help.js             # Help text and examples
│   ├── installer.js        # RESTHeart installation
│   ├── logger.js           # Logging infrastructure
│   ├── process-manager.js  # Process lifecycle management
│   ├── restheart.js        # Main orchestration manager
│   ├── utils.js            # Shared utility functions
│   └── watcher.js          # File watching and auto-rebuild
├── test/                   # Test files
│   ├── build-system-resolver.test.js
│   ├── builder.test.js
│   ├── cli.test.js
│   ├── config.test.js
│   ├── error-handler.test.js
│   ├── logger.test.js
│   ├── process-manager.test.js
│   ├── utils.test.js
│   └── watcher.test.js
├── .github/workflows/      # CI/CD configuration
│   └── ci.yml              # GitHub Actions workflow
├── rh.js                   # Executable entry point
├── package.json            # Project configuration
├── README.md               # Main documentation
├── usage-guide.md          # Detailed usage examples
└── RELEASE_NOTES_1.0.0.md  # Version release notes
```

## Entry Points

### Primary Entry Point: `rh.js`

The executable entry point for the CLI tool.

```javascript
#!/usr/bin/env node
import { initCLI } from './lib/cli.js'
initCLI()
```

**Purpose**: Bootstraps the CLI application by calling `initCLI()`.

**When to modify**: Only when changing the executable behavior or adding global initialization.

### CLI Initialization: `lib/cli.js`

The main CLI setup and command routing.

**Key Functions**:
- `initCLI()`: Sets up yargs, registers commands, handles global options
- `runCommand()`: Routes commands to appropriate RESTHeartManager methods

**Command Registration Pattern**:
```javascript
yargs(hideBin(process.argv))
    .command(
        ['command [args]', 'alias'],
        description,
        (yargs) => { /* options setup */ },
        (argv) => runCommand('command', argv, rh)
    )
```

**When to modify**: When adding new commands, changing options, or modifying command routing.

## Core Components

### Configuration: `lib/config.js`

**Class**: `ConfigManager`

**Key Responsibilities**:
- Stores runtime configuration (repoDir, cacheDir, httpPort, etc.)
- Validates configuration values
- Ensures cache directories exist

**Key Methods**:
- `constructor(options)`: Initializes with default values
- `get(key)`: Retrieves configuration value
- `set(key, value)`: Updates configuration
- `getAll()`: Returns all configuration
- `validateConfig()`: Validates all settings

**When to modify**: When adding new configuration options or changing validation rules.

### Build System: `lib/builder.js`

**Class**: `Builder`

**Key Responsibilities**:
- Executes Maven/Gradle builds
- Deploys plugin JARs to RESTHeart
- Handles build output deduplication

**Key Methods**:
- `build(mvnParams, skipTests)`: Runs build command
- `deploy()`: Copies JARs to plugins directory
- `resolveCurrentBuildSystem()`: Determines build system to use

**Dependencies**:
- `lib/build-systems/index.js`: Build system resolution
- `lib/build-systems/maven.js`: Maven-specific logic
- `lib/build-systems/gradle.js`: Gradle-specific logic

**When to modify**: When changing build behavior, adding build parameters, or supporting new build systems.

### Installation: `lib/installer.js`

**Class**: `Installer`

**Key Responsibilities**:
- Downloads RESTHeart from GitHub releases
- Installs from local RESTHeart builds
- Verifies existing installations

**Key Methods**:
- `install(restheartVersion, forceInstall)`: Main installation logic
- `downloadRESTHeart(version)`: Downloads from GitHub
- `installFromLocal(localPath)`: Installs from local build

**When to modify**: When changing installation sources, adding version resolution, or modifying download logic.

### Process Management: `lib/process-manager.js`

**Class**: `ProcessManager`

**Key Responsibilities**:
- Starts RESTHeart process
- Kills running instances
- Checks port availability
- Monitors process status

**Key Methods**:
- `run(restheartOptions)`: Starts RESTHeart
- `kill()`: Terminates RESTHeart processes
- `isRunning()`: Checks if RESTHeart is active
- `checkPortAvailability(port)`: Verifies port is free

**When to modify**: When changing process lifecycle, adding health checks, or modifying port management.

### File Watching: `lib/watcher.js`

**Class**: `Watcher`

**Key Responsibilities**:
- Monitors Java source files
- Watches build configuration files
- Triggers rebuild on changes
- Implements debouncing

**Key Methods**:
- `watchFiles(restheartOptions, watchOptions)`: Starts file watching
- `processFileUpdate(filePath, restheartOptions, configFiles)`: Handles file changes

**Watched Paths**:
- `src/main/**/*.java`: Java source files
- `**/pom.xml`: Maven configuration
- `**/build.gradle`, `**/build.gradle.kts`: Gradle configuration
- RESTHeart config files (from `-o` option)

**When to modify**: When changing watch behavior, adding new file types, or modifying rebuild logic.

### Orchestration: `lib/restheart.js`

**Class**: `RESTHeartManager`

**Key Responsibilities**:
- Coordinates all components
- Provides public API for CLI commands
- Manages component lifecycle

**Key Methods**:
- `install(version, force)`: Delegates to Installer
- `build(mvnParams, skipTests)`: Delegates to Builder
- `run(restheartOptions)`: Delegates to ProcessManager
- `watchFiles(restheartOptions, watchOptions)`: Delegates to Watcher
- `kill()`: Delegates to ProcessManager
- `status()`: Delegates to ProcessManager

**When to modify**: When adding new top-level features or changing component coordination.

## Infrastructure Components

### Logging: `lib/logger.js`

**Exported**: `logger`, `LogLevel`

**Key Features**:
- Color-coded output (chalk)
- Log level filtering
- Optional timestamps
- Status messages with spinners

**When to modify**: When changing log format, adding new log levels, or modifying output behavior.

### Error Handling: `lib/error-handler.js`

**Class**: `ErrorHandler`

**Key Methods**:
- `handleError(error, options)`: Main error handler
- `processError(message, options)`: Processes and formats errors
- `configError(message, options)`: Configuration-specific errors
- `fileSystemError(message, options)`: File system errors

**When to modify**: When adding new error categories or changing error presentation.

### Utilities: `lib/utils.js`

**Key Functions**:
- `checkPort(port)`: Checks port availability
- `commandExists(command)`: Verifies system command exists
- `ensureDir(dir)`: Creates directory recursively
- `createSpinner(text)`: Creates progress spinner

**When to modify**: When adding new utility functions or changing existing behavior.

### Build Systems: `lib/build-systems/`

**Structure**:
```
build-systems/
├── index.js      # Resolution logic
├── maven.js      # Maven implementation
└── gradle.js     # Gradle implementation
```

**Resolution Logic** (`index.js`):
1. Check for explicit `--build-system` option
2. Auto-detect based on project files
3. Default to Maven if no detection

**When to modify**: When adding new build systems or changing detection logic.

## Test Files

### Test Organization

Each component has a corresponding test file:

| Component | Test File |
|-----------|-----------|
| CLI | `test/cli.test.js` |
| Builder | `test/builder.test.js` |
| Config | `test/config.test.js` |
| Watcher | `test/watcher.test.js` |
| Process Manager | `test/process-manager.test.js` |
| Utils | `test/utils.test.js` |
| Logger | `test/logger.test.js` |
| Error Handler | `test/error-handler.test.js` |
| Build Systems | `test/build-system-resolver.test.js` |

### Test Patterns

**CLI Tests** (`test/cli.test.js`):
- Mock RESTHeartManager methods
- Test command routing
- Verify option passing

**Builder Tests** (`test/builder.test.js`):
- Mock shell.exec
- Test build success/failure
- Test deploy behavior

**Config Tests** (`test/config.test.js`):
- Test validation
- Test default values
- Test error handling

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npx vitest run test/builder.test.js

# Run with coverage
npx vitest run --coverage
```

## Configuration Files

### `package.json`

**Key Sections**:
- `name`: `@softinstigate/rh`
- `bin`: `rh.js` executable
- `scripts`: Build, test, lint commands
- `dependencies`: Runtime dependencies
- `devDependencies`: Development dependencies

**When to modify**: When adding dependencies, changing scripts, or updating metadata.

### `.github/workflows/ci.yml`

**CI Pipeline**:
- Runs on push and pull request
- Tests Node.js 22.x and 24.x
- Steps: checkout, setup node, install, format check, lint, test

**When to modify**: When changing CI requirements or adding new checks.

## Key Code Patterns

### Command Registration Pattern

```javascript
yargs(hideBin(process.argv))
    .command(
        ['command [args]', 'alias'],
        description,
        (yargs) => {
            yargs.positional('arg', { ... })
            yargs.option('opt', { ... })
            addCommandExamples(yargs, 'command')
        },
        (argv) => runCommand('command', argv, rh)
    )
```

### Error Handling Pattern

```javascript
try {
    // Operation
} catch (error) {
    ErrorHandler.processError(`Operation failed: ${error.message}`, {
        exitProcess: true,
        showStack: true,
    })
}
```

### Component Initialization Pattern

```javascript
constructor(configManager) {
    this.configManager = configManager
    // Initialize component-specific state
}
```

## Navigation Shortcuts

### Finding Command Implementation

1. **Command Definition**: `lib/cli.js` - search for `.command(`
2. **Command Handler**: `lib/restheart.js` - search for method name
3. **Business Logic**: Corresponding component file

### Finding Configuration Options

1. **CLI Options**: `lib/cli.js` - yargs configuration
2. **Default Values**: `lib/config.js` - constructor
3. **Validation Rules**: `lib/config.js` - `validateConfig()`

### Finding Test Coverage

1. **Component Tests**: `test/[component].test.js`
2. **CLI Tests**: `test/cli.test.js`
3. **Integration Tests**: Look for tests that mock multiple components

## Common Modification Points

### Adding a New Command

1. Define command in `lib/cli.js`
2. Add handler method in `lib/restheart.js`
3. Implement logic in appropriate component
4. Add tests in `test/cli.test.js`
5. Update help text in `lib/help.js`

### Adding a New Configuration Option

1. Add to `ConfigManager` constructor in `lib/config.js`
2. Add validation in `validateConfig()`
3. Add CLI option in `lib/cli.js`
4. Use in relevant components
5. Add tests in `test/config.test.js`

### Modifying Build Behavior

1. Update `lib/builder.js` for general changes
2. Update `lib/build-systems/maven.js` for Maven-specific
3. Update `lib/build-systems/gradle.js` for Gradle-specific
4. Update tests in `test/builder.test.js`

---

*This source map reflects the current codebase structure. For architectural context, see the [Architecture Overview](overview.md). For development workflows, see [Development Workflows](../workflows/development-workflow.md).*