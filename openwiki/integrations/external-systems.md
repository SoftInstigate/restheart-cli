---
type: "Reference"
title: "RESTHeart CLI External Integrations"
openwiki_generated: true
verified:
  - by: openwiki/0.5.1
    at: 2026-09-12T08:36:22.976Z
sources:
  - id: openwiki-source-5a75137c1627218d1d963bfe
    resource: repo://lib/build-systems/gradle.js
  - id: openwiki-source-163477361a6809fc17d8749d
    resource: repo://lib/build-systems/maven.js
  - id: openwiki-source-ff0ec4e942fc180be46342e6
    resource: repo://lib/builder.js
  - id: openwiki-source-beac0c2e3ce2872cb1f6b895
    resource: repo://lib/installer.js
  - id: openwiki-source-24e86caa9e81b482d3e67372
    resource: repo://lib/process-manager.js
  - id: openwiki-source-7e6abb6577c4cd283206381b
    resource: repo://lib/utils.js
  - id: openwiki-source-2e7ca1db4d594a92e4265908
    resource: repo://lib/watcher.js
generated: { by: "openwiki/0.5.1", at: "2026-09-12T08:36:22.976Z" }
---


# RESTHeart CLI External Integrations

This document details all external systems and libraries that the RESTHeart CLI (`rh`) depends on to provide its functionality. Understanding these integrations is essential for troubleshooting, extending, or operating the CLI effectively.

## Java/JVM Integration

The CLI requires a Java Development Kit (JDK) 21 or later to run RESTHeart and build plugins.

### Java Execution Model

RESTHeart is executed as a Java process using `java -jar` with the following characteristics:

- **JDK Requirement**: JDK 21+ is required (validated via `commandExists('java')`)
- **Process Spawning**: Uses `nohup` to run RESTHeart in the background with output redirected to `restheart.log`
- **JDWP Debug Agent**: Always enabled with `address=0.0.0.0:<httpPort+1000>` for remote debugging
- **RHO Environment**: Environment variables are passed via the `RHO` variable to configure RESTHeart at runtime

**Execution Command Pattern**:
```bash
nohup java -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=0.0.0.0:<port+1000> -jar restheart.jar [options] &> restheart.log &
```

### Process Lifecycle

1. **Startup**: ProcessManager spawns Java process with nohup
2. **Health Check**: Uses `checkPort()` to verify RESTHeart is listening on both HTTP port and debug port
3. **Shutdown**: Sends SIGTERM, waits 15 seconds, then SIGKILL if process doesn't exit
4. **Cleanup**: Restores original working directory and environment

## Port Checking and Network Probing

The CLI uses Node.js `net` module to probe ports with dual-stack support:

- **IPv4 First**: Probes `127.0.0.1` (localhost)
- **IPv6 Fallback**: Falls back to `::1` if IPv4 fails
- **Timeout**: 2-second timeout per host attempt
- **Purpose**: Determines if RESTHeart is running by checking both HTTP port and debug port (httpPort+1000)

```javascript
// From lib/utils.js
export function checkPort(port) {
    const hosts = ['127.0.0.1', '::1']
    // ... dual-stack probing logic with 2-second timeout
}
```

## GitHub Releases Integration

The CLI downloads RESTHeart from GitHub releases with full redirect handling.

### Download Flow

1. **URL Resolution**: Constructs download URL based on version:
   - `latest`: `https://github.com/SoftInstigate/restheart/releases/latest/download/restheart.tar.gz`
   - Specific version: `https://github.com/SoftInstigate/restheart/releases/download/{version}/restheart.tar.gz`

2. **Redirect Handling**: Automatically follows HTTP 301/302 redirects
3. **Extraction**: Extracts tar.gz archive to cache directory
4. **Verification**: Runs `java -jar restheart.jar -v` to validate installation

### Error Handling

- **Network Errors**: 30-second timeout, retry logic for transient failures
- **HTTP Errors**: Handles non-200 status codes gracefully
- **File System**: Cleans up incomplete downloads on failure

## Build System Integrations

### Maven Integration

The CLI supports Maven builds with wrapper preference:

- **Wrapper Preference**: Uses `./mvnw` if present, falls back to `mvn` with warning
- **Permission Handling**: Automatically makes `mvnw` executable (`chmod +x`)
- **Build Parameters**: Maps CLI parameters to Maven goals:
  - `package` → `package -DskipTests=<skipTests>`
  - `clean package` → `clean package -DskipTests=<skipTests>`
- **Artifact Locations**: Targets `target/` directory for JAR discovery

### Gradle Integration

The CLI supports Gradle builds with similar wrapper preference:

- **Wrapper Preference**: Uses `./gradlew` if present, falls back to `gradle` with warning
- **Permission Handling**: Automatically makes `gradlew` executable (`chmod +x`)
- **Build Parameter Mapping**: Converts Maven-style parameters:
  - `package` → `build`
  - `clean package` → `clean build`
- **Test Skipping**: Appends `-x test` when `skipTests` is true
- **Artifact Locations**: Targets `build/libs/` directory for JAR discovery

### Build System Detection

The CLI automatically detects the build system based on project files:

1. **Explicit Configuration**: `buildSystem: 'maven'` or `'gradle'` in config
2. **Auto-detection**: Checks for `pom.xml` or `mvnw` (Maven) and `gradlew`/`build.gradle` (Gradle)
3. **Default**: Falls back to Maven when both are present

## Process Discovery (ps-list)

The CLI uses `ps-list` for process discovery as a fallback when `lsof` is unavailable:

- **Process Identification**: Finds Java processes with command containing "restheart"
- **Usage**: Primary method for `rh kill` when `lsof` doesn't return results
- **Fallback Logic**: First tries `lsof -ti tcp:<port>`, then falls back to ps-list

```javascript
// From lib/process-manager.js
const isRestheartProcess = (proc) => 
    proc.name === 'java' && proc.cmd.includes('restheart')
```

## File Watching (chokidar)

The CLI uses `chokidar` for development file watching with automatic rebuild/restart:

### Watch Configuration

- **Default Paths**: 
  - `src/main/**/*.java` (Java source files)
  - `**/pom.xml`, `**/build.gradle*`, `**/settings.gradle*` (build files)
  - Config files specified in RESTHeart options
- **Dotfile Ignoring**: Ignores files starting with `.` by default
- **Write Stability**: `awaitWriteFinish` with 1000ms stability threshold and 200ms poll interval
- **Debounce**: 1000ms debounce to prevent rapid rebuilds

### Change Detection Logic

1. **Java Source Changes**: Triggers full build, deploy, and restart
2. **Build Config Changes**: Triggers full build, deploy, and restart
3. **Config File Changes**: Restarts RESTHeart without rebuilding
4. **Unknown Changes**: Falls back to full rebuild as safety measure

## Shell Execution (shelljs)

The CLI uses `shelljs` for cross-platform shell operations:

### Key Operations

- **Build Execution**: `shell.exec()` for running Maven/Gradle commands
- **File Discovery**: `shell.find()` for locating JAR files in build output
- **File Copying**: `shell.cp()` for deploying JARs to RESTHeart plugins directory
- **Directory Operations**: `shell.cd()`, `shell.mkdir()`, `shell.rm()` for filesystem manipulation
- **Command Checking**: `shell.which()` for verifying external commands exist

### Error Handling

All shell operations include error handling with appropriate user feedback:
- Build failures show stderr output
- File operation failures trigger ErrorHandler
- Command not found errors suggest installation steps

## RHO Environment Variable Passthrough

The CLI manages the `RHO` environment variable for RESTHeart configuration:

### Variable Management

- **Capture**: Captures original `RHO` value at CLI startup to prevent duplication
- **Composition**: Appends RESTHeart-specific settings:
  ```
  /http-listener/port-><httpPort>;/logging/full-stacktrace->true;
  ```
- **Preservation**: Maintains existing RHO values across CLI restarts
- **Injection**: Sets `shell.env['RHO']` before spawning RESTHeart process

### Configuration Format

The `RHO` variable uses RESTHeart's configuration format:
```
/key1->value1;/key2->value2;
```

## External Dependencies Summary

### Runtime Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `chokidar` | ^3.6.0 | File watching for development mode |
| `js-yaml` | ^4.1.1 | YAML configuration parsing |
| `ora` | ^8.0.1 | Terminal spinners for user feedback |
| `ps-list` | ^8.1.1 | Process discovery (fallback for lsof) |
| `shelljs` | ^0.10.0 | Cross-platform shell operations |
| `yargs` | ^17.7.2 | Command-line argument parsing |

### System Requirements

- **Node.js**: v18.0.0 or later
- **Java**: JDK 21+ (for running RESTHeart)
- **Build Tools**: Maven 3.8+ or Gradle 7+ (or wrapper scripts)
- **OS**: Cross-platform (Linux, macOS, Windows)

## Integration Points and Failure Modes

### Critical Integration Points

1. **Java Process Spawn**: Failure to find/execute Java prevents RESTHeart from running
2. **Build System Detection**: Incorrect detection leads to build failures
3. **Network Connectivity**: GitHub download requires internet access
4. **Port Availability**: RESTHeart needs available ports for HTTP and debugging

### Common Failure Scenarios

1. **Java Not Found**: CLI suggests installation steps
2. **Build Tool Missing**: Falls back to wrapper scripts with warnings
3. **Network Issues**: 30-second timeout with clear error messages
4. **Port Conflicts**: Detects and reports port-in-use errors
5. **Permission Issues**: Automatically handles wrapper permissions

### Recovery Mechanisms

- **Graceful Degradation**: Falls back to alternative methods when primary fails
- **User Guidance**: Provides specific error messages with suggested fixes
- **Cleanup**: Removes incomplete downloads and temporary files
- **Process Management**: Ensures clean shutdown before restart attempts
