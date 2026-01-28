## RESTHeart CLI — AI Agent Onboarding Guide

This guide provides focused, actionable knowledge for AI coding agents to be productive in this repository.


### Architecture Overview

- **Entry Point & CLI**: `rh.js` launches the CLI by calling `initCLI()` in `lib/cli.js`. All commands are registered in `lib/cli.js` using yargs, with `populate--: true` to forward extra args to RESTHeart.
- **Manager Pattern**: A single `RESTHeartManager` (in `lib/restheart.js`) orchestrates all operations, delegating to subsystems: `Builder`, `Installer`, `ProcessManager`, `Watcher`, and `ConfigManager`.
- **Subsystems**:
    - `lib/builder.js`: Handles Maven builds, prefers `./mvnw` (makes executable if needed), falls back to `mvn` with warning.
    - `lib/installer.js`: Downloads/extracts RESTHeart from GitHub, checks Java availability.
    - `lib/process-manager.js`: Starts/kills RESTHeart via `java -jar`, finds processes with `ps-list`, checks ports.
    - `lib/watcher.js`: Watches for changes in:
            - Java sources: `src/main/**/*.java`
            - RESTHeart config files passed via `-o` (e.g., `etc/localhost.yml`)
            - Maven POM files: any `pom.xml` in the project (single or multi-module)
        Any change triggers rebuild/kill/restart.
    - `lib/config.js`: Manages config state (port, debug, paths) scoped to `process.cwd()`.

### Key Patterns & Conventions

- **Config**: All state is repo-scoped via `ConfigManager` (creates `.cache/` in repo root). Default HTTP port is 8080. Config is mutable at runtime.
- **Error Handling**: Centralized in `lib/error-handler.js` via `ErrorHandler.handleError()`. Always check external command presence with `utils.commandExists()`.
- **Logging**: `lib/logger.js` provides leveled logging (DEBUG, INFO, etc.), mapped to CLI flags (`--debug`, `--verbose`, `--quiet`). Timestamps optional via `--timestamps`.
- **Shell Execution**: All shell commands use `shelljs`. Builder always tries `./mvnw` first, warns if falling back to `mvn`.
- **Process Lifecycle**: RESTHeart runs as a child process. Kill via `ps-list` filtering for "restheart" in command, SIGTERM. Port checks use `checkPort()` util.

### Developer Workflows

- **Setup**:
    ```bash
    npm install
    npm link  # creates `rh` bin in PATH
    ```
- **Common CLI Commands** (see `lib/cli.js`):
    - `rh install [version]` — Download/extract RESTHeart
    - `rh build` — Run Maven build, deploy JARs
    - `rh run [--build] [--port PORT] [-- restheart-opts]` — Build (optional), start RESTHeart
    - `rh watch [--debounce-time MS]` — Watch Java sources, auto-rebuild/restart
    - `rh kill [--port PORT]` — Stop RESTHeart
    - `rh status [--port PORT]` — Check if RESTHeart is running
- **Pass-through Options**: Use `--` to forward args to RESTHeart, e.g. `rh run -- -o etc/localhost.yml`
- **Lint/Format**: `npm run lint:check` / `lint:fix` (ESLint), `npm run format:check` / `format:write` (Prettier)
- **No tests**: No test framework or test files present.

### Integration Points & External Dependencies

- **Java**: Required for running RESTHeart. Checked by installer.
- **Maven**: `./mvnw` preferred, `mvn` fallback. Builder logs warning if wrapper missing.
- **GitHub**: RESTHeart tarballs downloaded from GitHub releases.
- **Process List**: Uses `ps-list` to find/kill Java processes by command line.

### File/Directory Reference

- Entry/CLI: `rh.js`, `lib/cli.js`, `lib/help.js`
- Core logic: `lib/restheart.js`
- Build: `lib/builder.js`
- Install: `lib/installer.js`
- Process mgmt: `lib/process-manager.js`
- Watch: `lib/watcher.js`
- Config: `lib/config.js`
- Logging: `lib/logger.js`
- Error handling: `lib/error-handler.js`
- Utilities: `lib/utils.js`
- Lint: `eslint.config.mjs`

### Project-Specific Notes

- **Working Directory**: All paths/configs are relative to the repo root (`process.cwd()`).
- **Side Effects**: Code frequently calls `process.exit()`, writes files, and spawns processes.
- **Process Discovery**: Only finds RESTHeart if "restheart" is in the process command. Checks both http port and debug port (port+1000).
- **Maven Wrapper**: Builder ensures `./mvnw` is executable, falls back to `mvn` if missing, logs warning but does not fail.

### Example: Adding a CLI Command

1. Register in `lib/cli.js` with yargs `.command()`
2. Add method to `RESTHeartManager` in `lib/restheart.js`
3. Delegate to subsystem (builder, installer, etc.)
4. Update `lib/help.js` for help text

---
For unclear or incomplete sections, please provide feedback to improve these instructions.
**Passing RESTHeart options**
