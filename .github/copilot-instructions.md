## RESTHeart CLI — quick onboarding for AI coding agents

This file contains focused, actionable knowledge for an AI assistant to be productive in this repository.

High-level architecture
- Entry: `rh.js` — small ES module that calls `initCLI()` in `lib/cli.js`.
- CLI: `lib/cli.js` — yargs-based command registration. Each command delegates to a single `RESTHeartManager` instance.
- Orchestration: `lib/restheart.js` — `RESTHeartManager` composes the main subsystems: `Builder`, `Installer`, `ProcessManager`, `Watcher`, and `ConfigManager`.
- Workers:
  - `lib/builder.js` — runs Maven (prefers `./mvnw`), builds (`clean package`) and copies JARs to the plugins dir.
  - `lib/installer.js` — downloads/extracts RESTHeart tarballs into `.cache/restheart` and verifies Java is present.
  - `lib/process-manager.js` — manages starting/stopping RESTHeart processes (see file for ps-list usage).
  - `lib/watcher.js` — uses `chokidar` to watch source files and trigger rebuild/redeploy.

Key patterns and conventions
- Configuration is repository-scoped and stored in `.cache` by default (see `lib/config.js`). Default HTTP port is 8080.
- Centralized error handling: `lib/error-handler.js` is used across modules to control exit behavior and show/hide stacks.
- Logging: `lib/logger.js` exposes a `logger` instance and `LogLevel` constants. CLI sets level via `--verbose`/`--quiet`/`--debug` flags.
- Shell operations: `shelljs` is used for external commands (`mvn`, `tar`, file copies). Prefer inspecting `Builder` and `Installer` for exact commands.
- Command presence: use `utils.commandExists()` before running system commands; missing commands are surfaced as fatal errors.

Developer workflows (how this project is normally used)
- Install from source:
  - `npm install` then `npm link` (bin `rh` comes from `rh.js`, see `package.json`).
- Common CLI flows (documented in `README.md` and wired in `lib/cli.js`):
  - `rh install [version]` — downloads and extracts RESTHeart into `.cache/restheart` (requires `java`).
  - `rh build` — runs Maven (`./mvnw` or `mvn`) with `clean package` and populates `target`.
  - `rh deploy` — (called by build flow) copies JARs from `target` to `.cache/restheart/plugins`.
  - `rh run [--build] [--port]` — optionally builds, then starts RESTHeart via `ProcessManager`.
  - `rh watch` — starts RESTHeart and watches file changes to rebuild/redeploy.

Important integration points
- Java / RESTHeart JAR (`java -jar restheart.jar -v`) — installation and verification (see `installer.js`).
- Maven (`./mvnw` or `mvn`) — building plugins (`builder.js`). The code attempts `./mvnw` first, falls back to `mvn` and warns.
- GitHub releases — `installer.js` downloads release tarballs from `github.com/SoftInstigate/restheart/releases`.
- Process discovery: `ps-list` is used to find running RESTHeart processes (in `process-manager.js`).

Practical examples for an AI to use when changing code
- If modifying a command in `lib/cli.js`, update the corresponding method call on `RESTHeartManager` rather than inserting shell logic directly in the CLI.
- When changing build/deploy behavior, update `lib/builder.js` (it centralizes mvn execution and file copy behavior).
- When adding new external commands, add checks with `commandExists()` in `lib/utils.js` to keep behavior consistent.

Project-specific gotchas
- The code relies on side-effectful shell commands (shelljs). Tests or code that run these paths should either mock shelljs or isolate command execution.
- Many flows call `process.exit()` on success/failure (e.g., installer). When writing unit tests or refactoring, avoid immediate exits or wrap them for testability.
- `ConfigManager` uses `process.cwd()` as the repo root — bot actions that change working directory should account for that.

Quick pointers to files
- entry: `rh.js`
- CLI and help: `lib/cli.js`, `lib/help.js`
- Core orchestrator: `lib/restheart.js`
- Build/deploy: `lib/builder.js`
- Install: `lib/installer.js`
- Config: `lib/config.js`
- Logging: `lib/logger.js`
- Utilities: `lib/utils.js`
- Watch & process control: `lib/watcher.js`, `lib/process-manager.js`

How to validate small changes locally
- Run `npm install` then `npm link` to get the `rh` bin in PATH.
- Use `rh build` to verify build changes (watch for `mvnw` vs `mvn` fallback messages).
- Use `rh install` in a throwaway repo to test installer (requires Java and network access).

If anything here is unclear or you want more detail on a specific component (e.g., `process-manager` internals or the watch-rebuild loop), tell me which file or workflow to expand and I'll update this guidance.
