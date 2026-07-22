---
type: Guide
title: RESTHeart CLI Development Workflows
description: Common development patterns, step-by-step guides, and practical workflows for RESTHeart plugin development
tags: [workflows, development, patterns, guides]
timestamp: 2026-03-15T10:30:00Z
---

# RESTHeart CLI Development Workflows

This guide covers common development patterns and step-by-step workflows for RESTHeart plugin development using the CLI.

## Core Development Loop

The primary workflow for RESTHeart plugin development follows this cycle:

```
Install → Build → Run → Watch → Iterate → Kill
```

### Basic Workflow

```bash
# 1. Install RESTHeart (first time or update)
rh install

# 2. Build and deploy your plugin
rh build

# 3. Run RESTHeart with your plugin
rh run

# 4. Enable file watching for automatic rebuilds
rh watch

# 5. Make code changes - RESTHeart automatically rebuilds and restarts

# 6. When done, stop RESTHeart
rh kill
```

## Detailed Workflows

### 1. Initial Project Setup

#### Prerequisites Check

```bash
# Verify Node.js installation
node --version  # Should be v18+

# Verify Java installation
java --version  # Should be JDK 21+

# Verify Maven or Gradle
mvn --version   # Maven 3.8+
# OR
gradle --version  # Gradle 7+
```

#### Create Plugin Project

```bash
# Clone the plugin skeleton
git clone https://github.com/SoftInstigate/restheart-plugin-skeleton my-plugin
cd my-plugin

# Customize project (optional)
# Edit pom.xml to update groupId and artifactId
```

#### Install RESTHeart

```bash
# Install latest version
rh install

# Install specific version
rh install 9.4.0

# Install from local RESTHeart build
rh install ~/restheart/core/target

# Force reinstall
rh install --force
```

### 2. Build System Selection

RESTHeart CLI supports Maven and Gradle projects with automatic detection.

#### Auto-Detection (Default)

```bash
# CLI automatically detects build system from project files
rh build

# Detection logic:
# 1. Check for pom.xml → Use Maven
# 2. Check for build.gradle → Use Gradle
# 3. Default to Maven
```

#### Explicit Build System

```bash
# Force Maven
rh build --build-system maven

# Force Gradle
rh build --build-system gradle

# Auto-detect (explicit)
rh build --build-system auto
```

#### Build System Files

**Maven**:
- `pom.xml` - Project configuration
- `mvnw` - Maven wrapper (optional)

**Gradle**:
- `build.gradle` - Groovy DSL
- `build.gradle.kts` - Kotlin DSL
- `settings.gradle` - Project settings
- `gradlew` - Gradle wrapper (optional)

### 3. Development with File Watching

#### Basic Watch Mode

```bash
# Start watching with auto-rebuild
rh watch

# Watch with initial build
rh watch --build

# Watch with custom RESTHeart options
rh watch -- -o etc/localhost.yml
```

#### What Gets Watched

The watcher monitors these file types:

1. **Java Source Files**: `src/main/**/*.java`
2. **Maven Configuration**: `**/pom.xml`
3. **Gradle Configuration**:
   - `**/build.gradle`
   - `**/build.gradle.kts`
   - `**/settings.gradle`
   - `**/settings.gradle.kts`
4. **RESTHeart Configuration**: Files specified with `-o` option

#### Watch Behavior

- **Debounce**: 1000ms delay after last change (configurable)
- **Rebuild Trigger**: Any watched file change
- **Automatic Sequence**: Build → Deploy → Kill → Restart
- **Error Handling**: Continues watching after build failures

#### Custom Watch Options

```bash
# Custom debounce time (milliseconds)
rh watch --debounce-time 2000

# Custom port
rh watch --port 9090

# Combine options
rh watch --build --port 9090 --debounce-time 1500 -- -s
```

### 4. Standalone Development (No MongoDB)

#### Standalone Mode

```bash
# Run without MongoDB requirement
rh run -- -s

# Watch mode without MongoDB
rh watch --build -- -s
```

#### Why Use Standalone Mode

- RESTHeart tries to connect to MongoDB at `localhost:27017` by default
- Without MongoDB, RESTHeart fails to start
- The `-s` flag disables MongoDB-dependent plugins
- Useful for plugin development that doesn't require database access

### 5. Development with MongoDB

#### Connect to Local MongoDB

```bash
# Default connection (localhost:27017)
rh run

# With custom configuration
rh run -- -o etc/localhost.yml
```

#### Connect to Remote MongoDB

```bash
# Set connection string via RHO environment variable
RHO='/mclient/connection-string->"mongodb://192.168.1.100:27017"' rh watch

# Combine with other options
RHO='/mclient/connection-string->"mongodb://192.168.1.100:27017"' rh watch --build -- -o etc/custom.yml
```

#### RHO Environment Variable

The `RHO` variable allows overriding RESTHeart configuration at runtime:

```bash
# Format: RHO='/config/path->"value"'
RHO='/mclient/connection-string->"mongodb://host:port"' rh run

# Multiple overrides
RHO='/http-listener/port->8081' rh run
```

### 6. Debugging and Troubleshooting

#### Debug Mode

```bash
# Enable debug output
rh --debug [command]

# Examples
rh --debug install
rh --debug build
rh --debug watch
```

#### Verbose Output

```bash
# Show verbose output
rh --verbose [command]

# Combine with debug
rh --debug --verbose watch
```

#### Check Status

```bash
# Check if RESTHeart is running
rh status

# Check specific port
rh status --port 9090
```

#### View Logs

```bash
# RESTHeart log file
tail -f restheart.log

# Search for errors
grep -i error restheart.log
```

### 7. Process Management

#### Start RESTHeart

```bash
# Basic start
rh run

# With build
rh run --build

# Custom port
rh run --port 9090

# With RESTHeart options
rh run -- -o etc/localhost.yml -s
```

#### Stop RESTHeart

```bash
# Kill default port (8080)
rh kill

# Kill specific port
rh kill --port 9090
```

#### Port Management

```bash
# Check port availability
rh status --port 8080

# Use different port
rh run --port 9090
rh watch --port 9090
```

### 8. Build Variations

#### Standard Build

```bash
# Clean and package
rh build

# Equivalent to: mvn clean package
# OR: gradle clean build
```

#### Build with Tests

```bash
# Build with tests (default)
rh build

# Skip tests
rh build --skip-tests
```

#### Build with Parameters

```bash
# Maven-specific parameters
rh build --mvn-params "-DskipTests -Pproduction"

# Note: --mvn-params is for advanced Maven usage
```

### 9. Installation Scenarios

#### Fresh Installation

```bash
# Install latest RESTHeart
rh install

# Verify installation
rh status
```

#### Update RESTHeart

```bash
# Install latest version
rh install

# Install specific version
rh install 9.5.0

# Force reinstall
rh install --force
```

#### Local RESTHeart Build

```bash
# Build RESTHeart from source
cd ~/restheart
mvn clean package

# Install from local build
cd ~/my-plugin
rh install ~/restheart/core/target

# Verify installation
java -jar .cache/restheart/restheart.jar -v
```

### 10. Configuration Management

#### Default Configuration

```javascript
{
    repoDir: process.cwd(),      // Current directory
    cacheDir: '.cache',          // Cache directory
    rhDir: '.cache/restheart',   // RESTHeart installation
    httpPort: 8080,              // HTTP port
    debugMode: false,            // Debug output
    buildSystem: 'auto'          // Build system detection
}
```

#### Custom Configuration

```bash
# Custom port
rh run --port 9090

# Custom build system
rh build --build-system gradle

# Debug mode
rh --debug run
```

## Advanced Workflows

### Multi-Module Projects

For projects with multiple modules:

```bash
# Build entire project
rh build

# Watch all modules
rh watch

# The watcher monitors:
# - All pom.xml files (Maven)
# - All build.gradle files (Gradle)
# - All Java source files
```

### Custom Build Scripts

If you need custom build logic:

1. Create build script in project
2. Configure in `pom.xml` or `build.gradle`
3. Use `rh build` to execute

### Integration with IDEs

#### VS Code

1. Install RESTHeart CLI globally
2. Use integrated terminal
3. Run `rh watch` in terminal
4. Edit code - auto-rebuild triggers

#### IntelliJ IDEA

1. Configure npm script runner
2. Add `rh watch` as run configuration
3. Use IDE terminal for CLI commands

## Workflow Patterns

### Pattern 1: Rapid Iteration

```bash
# Setup once
rh install
rh build

# Development loop
rh watch
# Edit code → Auto-rebuild → Test → Repeat

# Cleanup
rh kill
```

### Pattern 2: Debug Session

```bash
# Start with debug output
rh --debug watch --build

# Monitor logs
tail -f restheart.log

# Check status frequently
rh status
```

### Pattern 3: Version Testing

```bash
# Test with specific RESTHeart version
rh install 9.4.0
rh watch --build

# Test with another version
rh install 9.5.0
rh watch --build
```

### Pattern 4: Build System Comparison

```bash
# Test with Maven
rh build --build-system maven
rh run

# Test with Gradle
rh build --build-system gradle
rh run
```

## Best Practices

### 1. Use Watch Mode

- Always use `rh watch` during active development
- Saves time by automating rebuild/restart cycle
- Configure debounce time based on your workflow

### 2. Standalone Mode for Plugin Development

- Use `-s` flag when not needing MongoDB
- Faster startup, fewer dependencies
- Focus on plugin logic without database concerns

### 3. Version Management

- Pin RESTHeart version for production-like testing
- Use `latest` for development
- Document version requirements in project README

### 4. Port Management

- Use consistent ports across development
- Document port requirements
- Use `rh status` to verify running instances

### 5. Log Monitoring

- Keep `tail -f restheart.log` running
- Watch for errors during development
- Use debug mode when troubleshooting

## Common Scenarios

### Scenario 1: New Plugin Development

```bash
# 1. Setup
git clone https://github.com/SoftInstigate/restheart-plugin-skeleton my-plugin
cd my-plugin
rh install

# 2. Initial build and test
rh build
rh run -- -s

# 3. Development
rh watch --build -- -s

# 4. Cleanup
rh kill
```

### Scenario 2: Existing Project

```bash
# 1. Clone and setup
git clone https://github.com/your-org/your-plugin
cd your-plugin
npm install -g @softinstigate/rh
rh install

# 2. Build and run
rh build
rh run

# 3. Development
rh watch

# 4. Cleanup
rh kill
```

### Scenario 3: RESTHeart Version Testing

```bash
# Test with version 9.4.0
rh install 9.4.0
rh watch --build

# After testing, upgrade to latest
rh install latest
rh watch --build
```

## Troubleshooting Workflows

### Build Failures

```bash
# 1. Check build output
rh build

# 2. Verify build system
rh build --build-system maven  # or gradle

# 3. Check project structure
ls -la pom.xml build.gradle

# 4. Clean and rebuild
rh build --force
```

### Port Conflicts

```bash
# 1. Check what's using the port
lsof -i :8080

# 2. Kill conflicting process
rh kill --port 8080

# 3. Use different port
rh run --port 9090
```

### Watch Issues

```bash
# 1. Check watch paths
rh --debug watch

# 2. Verify file permissions
ls -la src/main/**/*.java

# 3. Increase debounce time
rh watch --debounce-time 2000
```

---

*For architectural context, see the [Architecture Overview](../architecture/overview.md). For operational procedures, see the [Operations Runbook](../operations/runbook.md).*