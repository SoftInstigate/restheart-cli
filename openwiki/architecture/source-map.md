---
type: reference
title: RESTHeart CLI Source Map
description: Codebase navigation guide mapping every source file to its purpose, key exports, and when to modify it
tags: [source-map, navigation, codebase, files, architecture]
verified:
  - by: openwiki/0.5.1
    at: 2026-09-12T08:36:22.976Z
sources:
  - id: openwiki-source-164e2da859b5277df81c7d94
    resource: repo://.github/workflows/ci.yml
  - id: openwiki-source-5a75137c1627218d1d963bfe
    resource: repo://lib/build-systems/gradle.js
  - id: openwiki-source-d951bb075777a6947b30eb30
    resource: repo://lib/build-systems/index.js
  - id: openwiki-source-163477361a6809fc17d8749d
    resource: repo://lib/build-systems/maven.js
  - id: openwiki-source-ff0ec4e942fc180be46342e6
    resource: repo://lib/builder.js
  - id: openwiki-source-0b4729d2a1304d7f82525861
    resource: repo://lib/cli.js
  - id: openwiki-source-f6f99b85088f1716c38ca8bf
    resource: repo://lib/config.js
  - id: openwiki-source-33099cbd41d12f89cbfbc48c
    resource: repo://lib/error-handler.js
  - id: openwiki-source-beac0c2e3ce2872cb1f6b895
    resource: repo://lib/installer.js
  - id: openwiki-source-4827a4a071cdc2becf01c047
    resource: repo://lib/logger.js
  - id: openwiki-source-24e86caa9e81b482d3e67372
    resource: repo://lib/process-manager.js
  - id: openwiki-source-9ad26f3f70a2843208d349e4
    resource: repo://lib/restheart.js
  - id: openwiki-source-2e7ca1db4d594a92e4265908
    resource: repo://lib/watcher.js
  - id: openwiki-source-5b54a58d1b51cd490b0e7162
    resource: repo://package.json
  - id: openwiki-source-77eac4028c91607535aab330
    resource: repo://rh.js
  - id: openwiki-source-768836e002432df2a3472afc
    resource: repo://test/build-system-resolver.test.js
  - id: openwiki-source-24146808fc85cd824c74979a
    resource: repo://test/builder.test.js
  - id: openwiki-source-50f3fd31b652e7ee35122bbb
    resource: repo://test/cli.test.js
  - id: openwiki-source-fd8840bb85ccd0829274124c
    resource: repo://test/config.test.js
  - id: openwiki-source-ba30c51348ae59f069ca2733
    resource: repo://test/error-handler.test.js
  - id: openwiki-source-ac69ef011b93ef990cac407a
    resource: repo://test/logger.test.js
  - id: openwiki-source-1e10f3627cb690b8445579cf
    resource: repo://test/process-manager.test.js
  - id: openwiki-source-730739190a7cf55a7a90fb6f
    resource: repo://test/utils.test.js
  - id: openwiki-source-86a549c0952e7e496d1d4f12
    resource: repo://test/watcher.test.js
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
│   ├── ci.yml              # CI pipeline (test, lint, format)
│   └── openwiki-update.yml # Scheduled OpenWiki documentation refresh
├── .github/copilot-instructions.md # Agent instruction context
├── AGENTS.md               # Repository agent guidance (OpenWiki section)
├── CLAUDE.md               # Claude Code agent brief
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
- `initCLI()`: Sets up yargs, registers commands, handles global options, prints welcome banner
- `runCommand(command, argv, rh)`: (exported) Routes commands to RESTHeartManager methods

**Command Routing** (`runCommand`):
- `install` → `rh.install(version, force)`
- `build` → `rh.build('clean package')` + `rh.deploy()` (tests enabled)
- `run` → `rh.checkAndKill()` → optionally `rh.build('clean package', true)` + `rh.deploy()` → `rh.run(options)`
- `kill` → `rh.checkAndKill()`
- `watch` → `rh.checkAndKill()` → optionally build/deploy → `rh.run()` → `rh.watchFiles()`
- `status` → `rh.status()`

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
- Kills running instances (SIGTERM with SIGKILL fallback after 15s)
- Checks port availability on both IPv4 and IPv6
- Monitors process status (checks both httpPort and httpPort+1000)
- Detects RESTHeart config-print flags (`-t`, `-c`, `-v`) via `onlyPrintConfig`

**Constructor**: Receives `ConfigManager`; captures `originalRHO` environment variable at startup

**Key Methods**:
- `run(restheartOptions)`: Starts RESTHeart
- `kill()`: Terminates RESTHeart processes
- `isRunning()`: Checks if RESTHeart is active (ports httpPort and httpPort+1000)
- `status()`: Logs running status
- `checkAndKill()`: Conditionally kills if already running
- `onlyPrintConfig(restheartOptions)`: Checks for config-print flags
- `parseConfigPath(restheartOptions)`: Extracts `-o` config file path
- `getHostAndPortFromConfig(configPath)`: Parses RESTHeart YAML config for host/port

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
- `**/settings.gradle`, `**/settings.gradle.kts`: Gradle settings
- RESTHeart config files (from `-o` option)

**When to modify**: When changing watch behavior, adding new file types, or modifying rebuild logic.

### Orchestration: `lib/restheart.js`

**Class**: `RESTHeartManager`

**Constructor**: `(httpPort, debugMode)` - creates ConfigManager, then Builder, ProcessManager, Installer, Watcher

**Key Responsibilities**:
- Coordinates all components
- Provides public API for CLI commands
- Manages component lifecycle

**Key Methods**:
- `install(version, force)`: Delegates to Installer
- `build(mvnParams, skipTests)`: Delegates to Builder
- `deploy()`: Delegates to Builder.deploy()
- `run(restheartOptions)`: Delegates to ProcessManager
- `watchFiles(restheartOptions)`: Delegates to Watcher
- `kill()`: Delegates to ProcessManager.kill()
- `status()`: Delegates to ProcessManager.status()
- `isRunning()`: Delegates to ProcessManager.isRunning()
- `checkAndKill()`: Delegates to ProcessManager.checkAndKill()
- `onlyPrintConfig(restheartOptions)`: Checks for config-print flags
- `printConfiguration()`: Logs all config values
- `setHttpPort(port)`, `setDebugMode(debug)`, `setBuildSystem(buildSystem)`: Config setters

**When to modify**: When adding new top-level features or changing component coordination.

## Infrastructure Components

### CLI Help: `lib/help.js`

**Exported**: `getVersion`, `commandDescriptions`, `addCommandExamples`

**Key Responsibilities**:
- Reads version from `package.json` via `getVersion()`
- Provides command descriptions and usage examples for all CLI commands
- `commandDescriptions`: Object with keys for each command (`install`, `build`, `run`, `kill`, `watch`, `status`)
- `addCommandExamples(yargs, commandName)`: Attaches examples to yargs command definitions

**When to modify**: When adding new commands, updating help text, or changing examples.

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
- `checkPort(port)`: Checks port availability on IPv4 (`127.0.0.1`) and IPv6 (`::1`) via TCP connection
- `commandExists(command)`: Verifies system command exists; exits process if not found
- `ensureDir(dir)`: Creates directory recursively
- `createSpinner(text)`: Creates progress spinner (via `ora`)

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
2. Auto-detect: `pom.xml` or `mvnw` → Maven; `gradlew`, `build.gradle`, `build.gradle.kts`, `settings.gradle`, `settings.gradle.kts` → Gradle
3. Default to Maven if neither detected

**MavenBuildSystem** (`maven.js`):
- Prefers `./mvnw -f pom.xml` wrapper, falls back to `mvn`
- Uses `-DskipTests={true|false}` for test control
- Output directory: `target`

**GradleBuildSystem** (`gradle.js`):
- Prefers `./gradlew` wrapper, falls back to `gradle`
- Uses `-x test` to skip tests
- Maps Maven-style params: `'package'` → `'build'`, `'clean package'` → `'clean build'`
- Output directory: `build`

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
- Runs on push and pull request (ignores changes to `openwiki/**`, `AGENTS.md`, `CLAUDE.md`)
- Tests Node.js 22.x and 24.x
- Steps: checkout, setup node, install, format check, lint, test

**When to modify**: When changing CI requirements or adding new checks.

### `.github/workflows/openwiki-update.yml`

**OpenWiki Update Workflow**:
- Runs on schedule (Saturdays at 04:13 UTC) and manual dispatch
- Installs OpenWiki globally, runs `openwiki code --update --print`
- Creates a pull request via `peter-evans/create-pull-request` with branch `openwiki/update`

**When to modify**: When changing the documentation update schedule or OpenWiki configuration.

### `.github/copilot-instructions.md`

Context file for AI coding assistants. Contains repository conventions and patterns.

**When to modify**: When updating agent guidance for the repository.

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