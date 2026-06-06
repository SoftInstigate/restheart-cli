# RESTHeart CLI 1.0.0 Release Notes

## Highlights

-   Added multi-build-system support for plugin workflows.
-   Build/deploy now supports:
    -   Maven projects
    -   Gradle projects
    -   Auto detection mode (default)
-   Added explicit CLI option: `--build-system auto|maven|gradle`.

## Build System Behavior

-   Default mode is `auto`.
-   In `auto` mode:
    -   Maven is selected when Maven files are detected.
    -   Gradle is selected when Gradle files are detected and Maven files are not present.
    -   Maven remains the fallback default when no build files are detected.
-   Explicit override is available per command with `--build-system`.

## Watcher Improvements

-   Watch mode now treats Gradle build files as rebuild triggers:
    -   `build.gradle`
    -   `build.gradle.kts`
    -   `settings.gradle`
    -   `settings.gradle.kts`

## Documentation

-   README, CLI help, and usage guide were updated to consistently document:
    -   Maven + Gradle support
    -   Auto-detected behavior
    -   `--build-system` examples
-   Version examples were normalized to `9.4.0` in docs/help examples.

## Quality and Stability

-   Regression test coverage expanded significantly for:
    -   Builder behavior (success + failure paths)
    -   Build-system auto-detection and explicit selection
    -   CLI routing including hyphenated option key handling
    -   Watcher behavior for Maven and Gradle build config changes
-   Current baseline: `64` tests passing.

## Validation Performed for 1.0.0

-   `npm run format:check`
-   `npm run lint:check`
-   `npm test`

All checks are passing.
