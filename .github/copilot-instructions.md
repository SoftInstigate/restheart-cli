## RESTHeart CLI — quick onboarding for AI coding agents

This file contains focused, actionable knowledge for an AI assistant to be productive in this repository.

### High-level architecture

**Entry & CLI layer**
- Entry: `rh.js` — minimal ES module that calls `initCLI()` in `lib/cli.js`
- CLI: `lib/cli.js` — yargs-based command registration with `populate--: true` to pass through RESTHeart options after `--`
- Single-instance pattern: Creates one `RESTHeartManager` at startup and reuses it for all commands
- Signal handling: SIGINT (CTRL-C) kills RESTHeart before exit; exit handler prints "Done." message

**Orchestration layer**
- `lib/restheart.js` — `RESTHeartManager` composes subsystems: `Builder`, `Installer`, `ProcessManager`, `Watcher`, `ConfigManager`
- Each subsystem receives `ConfigManager` in constructor to share state (http port, paths, debug mode)
- Manager methods are thin wrappers that delegate to subsystem methods

**Worker subsystems**
- `lib/builder.js` — Maven wrapper that prefers `./mvnw`, falls back to `mvn` with warnings. Cleans `target/`, builds, then calls `deploy()` to copy JARs
- `lib/installer.js` — downloads RESTHeart tarballs from GitHub releases, extracts to `.cache/restheart`, verifies Java availability
- `lib/process-manager.js` — starts RESTHeart via `java -jar`, kills via `ps-list` + SIGTERM, checks running state via port probing (http port and http port + 1000)
- `lib/watcher.js` — chokidar-based file watcher with debounce (default 1s). Watches `src/main/**/*.java`, triggers rebuild → kill → restart cycle

### Key patterns and conventions

**Configuration & state**
- Repository-scoped: `ConfigManager` uses `process.cwd()` as repo root (`.cache/` and `.cache/restheart/` created there)
- Default HTTP port: 8080 (used for both port checking and as RESTHeart's `-p` argument)
- Config is mutable: `setHttpPort()` and `setDebugMode()` methods allow runtime changes
- Validation: `ConfigManager` validates paths exist, port is 1-65535, debug mode is boolean

**Error handling**
- Centralized: `lib/error-handler.js` — all errors go through `ErrorHandler.handleError()` with options for exit behavior and stack traces
- Unhandled exceptions: CLI registers `uncaughtException` and `unhandledRejection` handlers that exit with stack traces
- Command presence: Always check with `utils.commandExists(cmd)` before shelling out (throws if missing)

**Logging**
- Leveled logger: `lib/logger.js` exports `Logger` class with `LogLevel` enum (DEBUG=0, INFO=1, SUCCESS=2, WARNING=3, ERROR=4)
- CLI flag mapping: `--debug` → DEBUG, `--verbose` → INFO, default → INFO, `--quiet` → WARNING
- Timestamps: Optional via `--timestamps` flag (adds ISO timestamp prefix)
- Chalk colors: debug=gray, info=cyan, success=green, warning=yellow, error=red

**Shell execution**
- Library: `shelljs` for all external commands (non-blocking by default)
- Critical commands: `./mvnw` / `mvn`, `java -jar`, `tar`, file copies
- Maven wrapper handling: Builder tries `./mvnw`, checks if executable (`chmod 0o755`), falls back to `mvn` with warning if unavailable

**Process lifecycle**
- RESTHeart runs as child process spawned by `shell.exec()`
- Kill strategy: Find Java processes via `ps-list` where `cmd` includes "restheart", send SIGTERM
- Port checking: Uses `checkPort()` util to detect running instances (both http port and debug port +1000)

### Developer workflows

**Setup from source**
```bash
npm install
npm link  # creates `rh` bin in PATH from rh.js
```

**Common commands** (see `lib/cli.js` for full list)
- `rh install [version]` — downloads RESTHeart tarball from GitHub, extracts to `.cache/restheart/`
- `rh build` — runs `mvn clean package`, copies JARs to `.cache/restheart/plugins/`
- `rh run [--build] [--port PORT] [-- restheart-options]` — optionally builds, then starts RESTHeart
- `rh watch [--debounce-time MS]` — starts RESTHeart, watches `src/main/**/*.java`, rebuilds on change
- `rh kill [--port PORT]` — stops running RESTHeart processes
- `rh status [--port PORT]` — checks if RESTHeart is running

**Passing RESTHeart options**
```bash
rh run -- -o etc/localhost.yml  # the -- separator passes remaining args to RESTHeart
rh watch -- -o etc/dev.yml
```

**Code quality tooling**
- Linting: `npm run lint:check` / `lint:fix` (ESLint 9 with flat config in `eslint.config.mjs`)
- Formatting: `npm run format:check` / `format:write` (Prettier)
- No test framework configured (no `*.test.js` or `*.spec.js` files exist)

### Integration points

**External dependencies**
- Java: Required for `java -jar restheart.jar`. Installer verifies availability via `commandExists('java')`
- Maven: `./mvnw` (preferred) or `mvn` (fallback). Builder warns if wrapper missing
- GitHub API: Downloads releases from `github.com/SoftInstigate/restheart/releases/download/`
- Process list: `ps-list` package to find running Java processes by command line pattern

**File system layout**
```
repo-root/               # process.cwd()
├── .cache/              # created by ConfigManager
│   └── restheart/       # RESTHeart installation
│       └── plugins/     # deployed JARs
├── target/              # Maven build output
├── src/main/**/*.java   # watched by default
└── pom.xml              # Maven project file
```

### Practical examples for code changes

**Adding a new CLI command**
1. Register in `lib/cli.js` with yargs `.command()`
2. Add corresponding method to `RESTHeartManager` in `lib/restheart.js`
3. Delegate to appropriate subsystem (builder, installer, etc.)
4. Update `lib/help.js` with command description and examples

**Modifying build behavior**
- Change `lib/builder.js` → it owns all Maven execution
- Don't add Maven calls elsewhere; keep centralized
- Use `logger.info()` to show commands before execution

**Adding external command dependency**
1. Add `commandExists('mycmd')` check in appropriate subsystem
2. Use `ErrorHandler.commandNotFound('mycmd')` if missing
3. Execute via `shell.exec()` in shelljs

**Error handling pattern**
```javascript
try {
    // operation
} catch (error) {
    ErrorHandler.handleError(error, {
        exitProcess: true,
        exitCode: 1,
        showStack: debugMode
    })
}
```

### Project-specific gotchas

**Testing & side effects**
- No unit tests exist currently
- Code has many side effects: `process.exit()`, `shell.exec()`, file writes
- To add tests: mock shelljs, trap `process.exit()`, isolate ConfigManager's `process.cwd()` dependency

**Working directory assumptions**
- `ConfigManager` assumes `process.cwd()` is the user's plugin repo (not the CLI's install location)
- Builder calls `shell.cd(repoDir)` before Maven commands
- Installer and watcher also rely on this repo-centric model

**Process discovery limitations**
- `ps-list` filtering relies on process command containing "restheart" string
- Won't find RESTHeart if renamed or run from unusual path
- Checks both http port and http port + 1000 (for debug mode)

**Maven wrapper behavior**
- Builder makes `./mvnw` executable with `chmod 0o755`
- Falls back to `mvn` if wrapper missing or not executable
- Warning logged but doesn't fail — prefers graceful degradation

### Quick file reference

| Purpose | Files |
|---------|-------|
| Entry & CLI | `rh.js`, `lib/cli.js`, `lib/help.js` |
| Core logic | `lib/restheart.js` (RESTHeartManager) |
| Build/deploy | `lib/builder.js` |
| Installation | `lib/installer.js` |
| Process mgmt | `lib/process-manager.js` |
| File watching | `lib/watcher.js` |
| Config | `lib/config.js` |
| Logging | `lib/logger.js` |
| Error handling | `lib/error-handler.js` |
| Utilities | `lib/utils.js` |
| Linting | `eslint.config.mjs` |

### Validation workflow

**Local testing**
```bash
npm install
npm link                    # adds `rh` to PATH
rh install                  # test installer (needs Java, network)
cd /path/to/test-plugin     # go to Maven project
rh build                    # test builder (needs Maven)
rh run                      # test process manager
```

**Watch for common issues**
- Maven wrapper warnings (missing `./mvnw`)
- Port conflicts (default 8080)
- Missing Java installation
- Process kill failures (check `ps-list` output)
