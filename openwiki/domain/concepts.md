---
type: Reference
title: RESTHeart CLI Domain Concepts
description: Core terminology, concepts, and domain knowledge for understanding RESTHeart CLI and the RESTHeart ecosystem
tags: [domain, concepts, terminology, restheart, plugins]
timestamp: 2026-03-15T10:30:00Z
---

# RESTHeart CLI Domain Concepts

This document explains the core terminology, concepts, and domain knowledge essential for understanding RESTHeart CLI and the broader RESTHeart ecosystem.

## RESTHeart Ecosystem

### RESTHeart

**Definition**: RESTHeart is a Java-based REST API server for MongoDB. It automatically maps MongoDB collections to REST endpoints, providing a complete REST API without writing code.

**Key Characteristics**:
- Built on Java (requires JDK 21+)
- Connects to MongoDB (standalone mode available)
- Extensible through plugins
- Configuration-driven behavior
- High performance and low latency

**Version History**:
- Version 9.x: Current stable series
- Regular releases with new features and bug fixes
- LTS (Long Term Support) versions available

### RESTHeart Plugin

**Definition**: A Java module that extends RESTHeart's functionality. Plugins can add custom endpoints, modify request/response processing, integrate with external services, and more.

**Plugin Types**:
- **Request Interceptors**: Modify incoming requests
- **Response Interceptors**: Modify outgoing responses
- **Services**: Custom REST endpoints
- **Plugins**: General-purpose extensions

**Plugin Lifecycle**:
1. **Development**: Write Java code implementing plugin interfaces
2. **Build**: Compile and package into JAR file
3. **Deployment**: Copy JAR to RESTHeart plugins directory
4. **Runtime**: RESTHeart loads and initializes plugin

### Plugin Project Structure

```
my-restheart-plugin/
├── src/
│   └── main/
│       └── java/
│           └── com/
│               └── example/
│                   └── MyPlugin.java
├── pom.xml                    # Maven project
├── build.gradle               # Gradle project (alternative)
└── README.md
```

## Build Systems

### Maven

**Definition**: Apache Maven is a build automation and project management tool primarily for Java projects.

**Key Concepts**:
- **POM (Project Object Model)**: `pom.xml` configuration file
- **Lifecycle**: `clean`, `compile`, `package`, `install`, `deploy`
- **Dependencies**: Managed in `pom.xml`
- **Plugins**: Extend build functionality
- **Repositories**: Download dependencies from Maven Central

**RESTHeart CLI Usage**:
```bash
# Build with Maven
rh build --build-system maven

# Maven commands executed:
# mvn clean package (default)
# mvn clean package -DskipTests (skip tests)
```

**Maven Files**:
- `pom.xml`: Project configuration
- `mvnw`: Maven wrapper (optional)
- `.mvn/`: Maven wrapper configuration

### Gradle

**Definition**: Gradle is a build automation tool that uses Groovy or Kotlin DSL for configuration.

**Key Concepts**:
- **Build Script**: `build.gradle` or `build.gradle.kts`
- **Tasks**: Units of work (build, test, deploy)
- **Plugins**: Extend build functionality
- **Dependencies**: Managed in build script
- **Wrapper**: `gradlew` for consistent builds

**RESTHeart CLI Usage**:
```bash
# Build with Gradle
rh build --build-system gradle

# Gradle commands executed:
# gradle clean build (default)
# gradle clean build -x test (skip tests)
```

**Gradle Files**:
- `build.gradle`: Groovy DSL configuration
- `build.gradle.kts`: Kotlin DSL configuration
- `settings.gradle`: Project settings
- `gradlew`: Gradle wrapper

### Build System Auto-Detection

**Detection Logic**:
1. Check for `pom.xml` → Use Maven
2. Check for `build.gradle` or `build.gradle.kts` → Use Gradle
3. Default to Maven if no detection

**Priority**: Maven takes precedence over Gradle when both exist

**Override**: Use `--build-system` option to force specific system

## Process Management

### RESTHeart Process

**Definition**: The running instance of the RESTHeart server, executing as a Java process.

**Process Characteristics**:
- Runs as Java application
- Listens on configured HTTP port (default: 8080)
- Requires JDK 21+
- Can run in standalone mode (no MongoDB)

**Process Lifecycle**:
1. **Start**: `rh run` or `rh watch`
2. **Running**: Accepts HTTP requests
3. **Stop**: `rh kill` or CTRL-C
4. **Restart**: Automatic in watch mode

### Port Management

**HTTP Port**: The network port where RESTHeart listens for HTTP requests.

**Default Port**: 8080

**Port Configuration**:
```bash
# Use specific port
rh run --port 9090
rh watch --port 9090

# Check port status
rh status --port 9090
```

**Port Validation**:
- Range: 1-65535
- Must be available (not in use)
- Validated before process start

### Process Detection

**Detection Methods**:
1. **lsof**: Check processes bound to specific port
2. **ps-list**: List all processes and filter by name

**Process Identification**:
- Process name: `java`
- Command line contains: `restheart`
- Port binding matches configured port

## Configuration

### Configuration Hierarchy

**Priority Order** (highest to lowest):
1. Command-line options
2. Environment variables
3. Default values

**Example**:
```bash
# Command-line option (highest priority)
rh run --port 9090

# Environment variable (medium priority)
export RH_PORT=9090
rh run

# Default value (lowest priority)
# port: 8080
```

### Configuration Keys

| Key | Description | Default |
|-----|-------------|---------|
| `repoDir` | Project root directory | `process.cwd()` |
| `cacheDir` | Cache directory | `.cache` |
| `rhDir` | RESTHeart installation | `.cache/restheart` |
| `httpPort` | HTTP port | `8080` |
| `debugMode` | Debug output | `false` |
| `buildSystem` | Build system | `auto` |

### RHO Environment Variable

**Definition**: Runtime HTTP Options environment variable for overriding RESTHeart configuration.

**Format**: `RHO='/config/path->"value"'`

**Examples**:
```bash
# Override MongoDB connection string
RHO='/mclient/connection-string->"mongodb://host:port"' rh run

# Override HTTP port
RHO='/http-listener/port->9090' rh run

# Multiple overrides
RHO='/mclient/connection-string->"mongodb://host:port" /http-listener/port->9090' rh run
```

**Use Cases**:
- Connect to remote MongoDB
- Override HTTP port
- Configure authentication
- Set custom headers

## File Watching

### Watch Mode

**Definition**: A development mode where RESTHeart CLI monitors file changes and automatically rebuilds and restarts RESTHeart.

**Watch Behavior**:
1. Monitor specified file paths
2. Detect file changes
3. Debounce changes (prevent rapid rebuilds)
4. Execute build → deploy → kill → restart sequence
5. Continue watching for more changes

### Watched Paths

**Default Watched Paths**:
- `src/main/**/*.java` - Java source files
- `**/pom.xml` - Maven configuration
- `**/build.gradle` - Gradle configuration
- `**/build.gradle.kts` - Gradle Kotlin DSL
- `**/settings.gradle` - Gradle settings
- RESTHeart config files (from `-o` option)

**Path Patterns**:
- `**` matches any directory depth
- `*` matches any filename
- `*.java` matches Java files

### Debouncing

**Definition**: A technique to prevent excessive function calls by waiting for a pause in events.

**Default Debounce Time**: 1000ms (1 second)

**Purpose**:
- Prevents multiple rebuilds during rapid file saves
- Reduces system load
- Provides smoother development experience

**Configuration**:
```bash
# Custom debounce time
rh watch --debounce-time 2000  # 2 seconds
```

## RESTHeart Configuration

### Configuration File

**Format**: YAML

**Default Location**: `etc/restheart.yml` (or custom via `-o` option)

**Key Sections**:
- `/http-listener`: HTTP server configuration
- `/mclient`: MongoDB client configuration
- `/plugins`: Plugin configuration

**Example**:
```yaml
/http-listener:
  host: 0.0.0.0
  port: 8080

/mclient:
  connection-string: "mongodb://localhost:27017"
```

### Configuration Override

**Methods**:
1. **File Override**: `-o path/to/config.yml`
2. **Environment Variable**: `RHO='/path->"value"'`
3. **Command Line**: `--port 9090`

**Priority**: Environment variable > File > Command line

## Plugin Development Concepts

### Plugin Interface

**Definition**: Java interface that plugins implement to extend RESTHeart functionality.

**Common Interfaces**:
- `Service`: Custom REST endpoints
- `RequestInterceptor`: Modify requests
- `ResponseInterceptor`: Modify responses
- `Plugin`: General-purpose extension

### Plugin Deployment

**Deployment Directory**: `.cache/restheart/plugins/`

**Deployment Process**:
1. Build plugin JAR
2. Copy JAR to plugins directory
3. Restart RESTHeart
4. RESTHeart loads plugin

**Automatic Deployment**: `rh build` handles both build and deploy

### Plugin Classpath

**Definition**: The set of JAR files and classes available to plugins at runtime.

**Components**:
- RESTHeart core JARs
- Plugin dependencies
- System libraries

**Management**: RESTHeart manages classpath automatically

## Development Environment

### Node.js Requirements

**Version**: v18 or later

**Purpose**: Run RESTHeart CLI tool

**Package Manager**: npm (included with Node.js)

### Java Requirements

**Version**: JDK 21 or later

**Purpose**: Run RESTHeart and build plugins

**Build Tools**: Maven 3.8+ or Gradle 7+

### Project Structure

**Typical Plugin Project**:
```
my-plugin/
├── src/main/java/          # Java source code
├── pom.xml                 # Maven configuration
├── build.gradle            # Gradle configuration (alternative)
├── etc/                    # RESTHeart configuration
│   └── restheart.yml
└── .cache/                 # Generated by RESTHeart CLI
    └── restheart/          # RESTHeart installation
```

## CLI Concepts

### Command Structure

**Pattern**: `rh [command] [options]`

**Commands**:
- `install`: Install RESTHeart
- `build`: Build and deploy plugins
- `run`: Start RESTHeart
- `watch`: Watch for changes
- `kill`: Stop RESTHeart
- `status`: Check status

**Options**:
- Global: `--debug`, `--verbose`, `--quiet`, `--port`
- Command-specific: `--build-system`, `--force`, `--debounce-time`

### Command Aliases

**Short Forms**:
- `i` for `install`
- `b` for `build`
- `r` for `run`

**Example**:
```bash
rh i          # Same as rh install
rh b          # Same as rh build
rh r          # Same as rh run
```

### Option Parsing

**Parser**: yargs

**Features**:
- Positional arguments
- Named options
- Short aliases
- Default values
- Validation
- Help generation

**Separator**: `--` separates CLI options from RESTHeart options

**Example**:
```bash
rh run -- -o etc/localhost.yml -s
# CLI options: (none after run)
# RESTHeart options: -o etc/localhost.yml -s
```

## Error Handling Concepts

### Error Categories

**Configuration Errors**: Invalid settings, missing directories
**Filesystem Errors**: Permission issues, missing files
**Process Errors**: Build failures, process crashes
**Network Errors**: Download failures, connection issues

### Error Recovery

**Graceful Degradation**: Continue with warnings when possible
**User Feedback**: Clear error messages with actionable suggestions
**Process Cleanup**: Kill RESTHeart on CTRL-C or fatal errors
**Directory Restoration**: Return to original directory after operations

### Debug Mode

**Activation**: `rh --debug [command]`

**Output**:
- Detailed command execution
- Configuration values
- File paths
- Process information

**Use Cases**:
- Troubleshooting build failures
- Understanding configuration
- Diagnosing process issues

## Version Management

### RESTHeart Versions

**Version Format**: `major.minor.patch` (e.g., 9.4.0)

**Version Sources**:
- GitHub releases (remote)
- Local build (path)

**Version Selection**:
```bash
# Latest version
rh install

# Specific version
rh install 9.4.0

# Local build
rh install ~/restheart/core/target
```

### CLI Version

**Package**: `@softinstigate/rh`

**Versioning**: Semantic versioning (semver)

**Current Version**: 1.0.1

**Check Version**:
```bash
rh --version
```

## Integration Concepts

### MongoDB Integration

**Connection**: RESTHeart connects to MongoDB at startup

**Configuration**:
```yaml
/mclient:
  connection-string: "mongodb://localhost:27017"
```

**Standalone Mode**: `-s` flag disables MongoDB plugins

### REST API

**Default Endpoint**: `http://localhost:8080`

**API Format**: RESTful JSON API

**Documentation**: [restheart.org/docs](https://restheart.org/docs)

### Plugin Ecosystem

**Plugin Repository**: GitHub organizations and Maven Central

**Plugin Discovery**: Manual installation via `rh install`

**Plugin Dependencies**: Managed by build system (Maven/Gradle)

## Performance Concepts

### Build Performance

**Factors**:
- Project size
- Dependency count
- Build system efficiency
- Test execution

**Optimization**:
- Skip tests: `rh build --skip-tests`
- Incremental builds (build system dependent)
- Parallel execution (Gradle)

### Runtime Performance

**Factors**:
- MongoDB connection
- Plugin complexity
- Request volume
- Configuration

**Monitoring**:
- RESTHeart logs
- MongoDB metrics
- System resources

### Watch Performance

**Factors**:
- Number of watched files
- File change frequency
- Debounce time
- Build duration

**Optimization**:
- Adjust debounce time
- Limit watch paths
- Use fast build system

## Security Concepts

### Local Development

**Scope**: RESTHeart CLI is designed for local development

**Security Model**:
- Local file system access
- Local network access
- No remote management

### Process Isolation

**Working Directory**: Returns to original after operations

**Environment Variables**: Managed carefully (RHO)

**Process Termination**: Uses SIGTERM for graceful shutdown

### Input Validation

**Port Validation**: Range 1-65535
**Path Validation**: Directory existence
**Command Validation**: Valid options only

---

*For practical workflows, see [Development Workflows](../workflows/development-workflow.md). For operational procedures, see the [Operations Runbook](../operations/runbook.md).*