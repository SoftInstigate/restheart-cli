---
type: Guide
title: RESTHeart CLI Testing Guidance
description: Testing strategies, patterns, and best practices for RESTHeart CLI development and maintenance
tags: [testing, vitest, unit-tests, integration-tests, mocking]
timestamp: 2026-03-15T10:30:00Z
---

# RESTHeart CLI Testing Guidance

This guide covers testing strategies, patterns, and best practices for RESTHeart CLI development and maintenance.

## Testing Overview

### Test Framework

**Framework**: Vitest

**Version**: ^4.0.18

**Configuration**: `package.json` test script

**Run Tests**:
```bash
# Run all tests
npm test

# Run with watch mode
npm test -- --watch

# Run specific file
npx vitest run test/builder.test.js

# Run with coverage
npx vitest run --coverage
```

### Test Philosophy

**Unit Tests**: Test individual components in isolation
**Integration Tests**: Test component interactions
**CLI Tests**: Test command routing and option handling

**Coverage Goals**:
- All major components have test files
- Both success and failure paths tested
- Edge cases covered

## Test File Organization

### Directory Structure

```
test/
├── build-system-resolver.test.js  # Build system detection
├── builder.test.js                # Build and deploy logic
├── cli.test.js                    # CLI command routing
├── config.test.js                 # Configuration management
├── error-handler.test.js          # Error handling
├── logger.test.js                 # Logging infrastructure
├── process-manager.test.js        # Process management
├── utils.test.js                  # Utility functions
└── watcher.test.js                # File watching
```

### Naming Conventions

**Test Files**: `[component].test.js`
**Test Suites**: `describe('ComponentName', () => { ... })`
**Test Cases**: `it('should do something', () => { ... })`

## Testing Patterns

### 1. Mocking Shell Commands

**Pattern**: Mock `shell.exec` for build/install operations

```javascript
import { vi } from 'vitest'
import shell from 'shelljs'

// Mock shell.exec
vi.mock('shelljs', () => ({
    default: {
        exec: vi.fn(),
        cd: vi.fn(),
        rm: vi.fn(),
        cp: vi.fn(),
    },
}))

// Setup mock behavior
shell.exec.mockReturnValue({ code: 0, stdout: 'Success', stderr: '' })

// Test
const result = shell.exec('mvn clean package')
expect(result.code).toBe(0)
```

**When to Use**:
- Testing Builder.build()
- Testing Installer.install()
- Testing ProcessManager.run()

### 2. Mocking File System

**Pattern**: Mock `fs` operations for configuration tests

```javascript
import { vi } from 'vitest'
import fs from 'node:fs'

// Mock fs.existsSync
vi.mock('node:fs', () => ({
    default: {
        existsSync: vi.fn(),
        readFileSync: vi.fn(),
        mkdirSync: vi.fn(),
    },
}))

// Setup mock behavior
fs.existsSync.mockReturnValue(true)

// Test
const result = fs.existsSync('/path/to/file')
expect(result).toBe(true)
```

**When to Use**:
- Testing ConfigManager
- Testing file existence checks
- Testing directory creation

### 3. Mocking Process Management

**Pattern**: Mock process.kill and ps-list for process tests

```javascript
import { vi } from 'vitest'
import psList from 'ps-list'

// Mock ps-list
vi.mock('ps-list', () => ({
    default: vi.fn(),
}))

// Setup mock behavior
psList.mockResolvedValue([
    { pid: 1234, name: 'java', cmd: 'java -jar restheart.jar' },
])

// Test
const processes = await psList()
expect(processes.length).toBe(1)
```

**When to Use**:
- Testing ProcessManager.kill()
- Testing ProcessManager.isRunning()
- Testing process detection

### 4. Mocking External Dependencies

**Pattern**: Mock external modules like chalk, ora, yargs

```javascript
import { vi } from 'vitest'

// Mock chalk
vi.mock('chalk', () => ({
    default: {
        green: vi.fn((text) => text),
        red: vi.fn((text) => text),
        cyan: vi.fn((text) => text),
    },
}))

// Mock ora
vi.mock('ora', () => ({
    default: vi.fn(() => ({
        start: vi.fn(),
        succeed: vi.fn(),
        fail: vi.fn(),
    })),
}))
```

**When to Use**:
- Testing logger output
- Testing spinner behavior
- Testing colored output

### 5. Testing CLI Commands

**Pattern**: Mock RESTHeartManager and test command routing

```javascript
import { vi } from 'vitest'
import { runCommand } from '../lib/cli.js'

// Create mock RESTHeartManager
function createRh() {
    return {
        install: vi.fn(),
        build: vi.fn(),
        deploy: vi.fn(),
        run: vi.fn().mockResolvedValue(undefined),
        kill: vi.fn().mockResolvedValue(undefined),
        watchFiles: vi.fn(),
        status: vi.fn().mockResolvedValue(undefined),
    }
}

// Test command routing
it('routes build command to build and deploy', async () => {
    const rh = createRh()
    await runCommand('build', {}, rh)
    expect(rh.build).toHaveBeenCalledWith('clean package')
    expect(rh.deploy).toHaveBeenCalledTimes(1)
})
```

**When to Use**:
- Testing command routing
- Testing option passing
- Testing command aliases

### 6. Testing Error Handling

**Pattern**: Test both success and failure paths

```javascript
import { vi } from 'vitest'
import { ErrorHandler } from '../lib/error-handler.js'

// Mock ErrorHandler
vi.mock('../lib/error-handler.js', () => ({
    ErrorHandler: {
        handleError: vi.fn(),
        processError: vi.fn(),
    },
}))

// Test error handling
it('should handle build failure', async () => {
    shell.exec.mockReturnValue({ code: 1, stdout: '', stderr: 'Build failed' })
    
    await builder.build()
    
    expect(ErrorHandler.processError).toHaveBeenCalledWith(
        expect.stringContaining('Build failed'),
        expect.any(Object)
    )
})
```

**When to Use**:
- Testing error scenarios
- Testing validation failures
- Testing recovery mechanisms

## Test Coverage by Component

### CLI Tests (`test/cli.test.js`)

**Coverage**:
- Command routing (build, run, watch, kill, status)
- Option passing (--build, --port, --debounce-time)
- RESTHeart options (after -- separator)
- Command aliases (i, b, r)

**Test Count**: ~10 tests

**Key Test Scenarios**:
- Build command routes to build and deploy
- Run with --build flag
- Watch with --build flag
- Kill command routing
- Status command routing

### Builder Tests (`test/builder.test.js`)

**Coverage**:
- Build success and failure paths
- Deploy behavior
- Build system resolution
- Error handling

**Test Count**: ~15 tests

**Key Test Scenarios**:
- Successful build
- Build failure
- Deploy JARs
- Clean target directory
- Return to original directory

### Config Tests (`test/config.test.js`)

**Coverage**:
- Configuration validation
- Default values
- Error handling
- Directory creation

**Test Count**: ~10 tests

**Key Test Scenarios**:
- Valid configuration
- Invalid port
- Invalid debug mode
- Missing directories
- Configuration updates

### Watcher Tests (`test/watcher.test.js`)

**Coverage**:
- File watching setup
- Debounce behavior
- Rebuild triggering
- Watch path validation

**Test Count**: ~10 tests

**Key Test Scenarios**:
- Watch files setup
- Debounce timeout
- File change handling
- Build trigger

### Process Manager Tests (`test/process-manager.test.js`)

**Coverage**:
- Process running check
- Port availability
- Process killing

**Test Count**: ~5 tests

**Key Test Scenarios**:
- Check if running
- Kill process
- Port availability

### Utils Tests (`test/utils.test.js`)

**Coverage**:
- Port checking
- Command existence
- Directory creation
- Spinner creation

**Test Count**: ~10 tests

**Key Test Scenarios**:
- Check port availability
- Command exists
- Ensure directory

### Error Handler Tests (`test/error-handler.test.js`)

**Coverage**:
- Error handling
- Error categorization
- Exit behavior

**Test Count**: ~8 tests

**Key Test Scenarios**:
- Handle error
- Process error
- Config error
- File system error

### Logger Tests (`test/logger.test.js`)

**Coverage**:
- Log levels
- Output formatting
- Timestamps

**Test Count**: ~8 tests

**Key Test Scenarios**:
- Debug logging
- Info logging
- Warning logging
- Error logging

### Build System Resolver Tests (`test/build-system-resolver.test.js`)

**Coverage**:
- Auto-detection
- Maven selection
- Gradle selection
- Default behavior

**Test Count**: ~8 tests

**Key Test Scenarios**:
- Auto-detect Maven
- Auto-detect Gradle
- Explicit Maven
- Explicit Gradle

## Test Data Management

### Mock Data

**File System Mocks**:
```javascript
// Mock file existence
fs.existsSync.mockImplementation((path) => {
    const existingPaths = ['/valid/path', '/another/path']
    return existingPaths.includes(path)
})
```

**Process Mocks**:
```javascript
// Mock process list
psList.mockResolvedValue([
    { pid: 1234, name: 'java', cmd: 'java -jar restheart.jar' },
    { pid: 5678, name: 'node', cmd: 'node app.js' },
])
```

**Shell Mocks**:
```javascript
// Mock shell commands
shell.exec.mockImplementation((cmd) => {
    if (cmd.includes('mvn')) {
        return { code: 0, stdout: 'BUILD SUCCESS', stderr: '' }
    }
    return { code: 1, stdout: '', stderr: 'Command failed' }
})
```

### Test Fixtures

**Configuration Fixtures**:
```javascript
const validConfig = {
    repoDir: '/valid/path',
    cacheDir: '/valid/path/.cache',
    rhDir: '/valid/path/.cache/restheart',
    httpPort: 8080,
    debugMode: false,
    buildSystem: 'auto',
}
```

**Command Fixtures**:
```javascript
const buildCommand = 'build'
const runCommand = 'run'
const watchCommand = 'watch'
```

## Test Execution

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npx vitest run test/builder.test.js

# Run with watch mode
npm test -- --watch

# Run with coverage
npx vitest run --coverage

# Run tests matching pattern
npx vitest run --grep "build"
```

### Test Output

**Successful Test**:
```
✓ should build successfully (15 ms)
✓ should deploy JARs (10 ms)
```

**Failed Test**:
```
✗ should handle build failure (20 ms)
  → Expected: "Build failed"
  → Received: "Build succeeded"
```

### Coverage Report

**Coverage Metrics**:
- **Statements**: Percentage of statements executed
- **Branches**: Percentage of branches executed
- **Functions**: Percentage of functions called
- **Lines**: Percentage of lines executed

**Coverage Thresholds**:
- Statements: >80%
- Branches: >70%
- Functions: >80%
- Lines: >80%

## Writing New Tests

### Test Structure

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('ComponentName', () => {
    // Setup
    beforeEach(() => {
        vi.clearAllMocks()
    })
    
    describe('methodName', () => {
        it('should do something when condition', () => {
            // Arrange
            const input = 'test'
            
            // Act
            const result = component.method(input)
            
            // Assert
            expect(result).toBe('expected')
        })
        
        it('should handle error when invalid input', () => {
            // Arrange
            const invalidInput = null
            
            // Act & Assert
            expect(() => component.method(invalidInput)).toThrow()
        })
    })
})
```

### Test Naming Conventions

**Describe Blocks**: Component or method name
**Test Cases**: `should [expected behavior] when [condition]`

**Examples**:
- `should build successfully when valid project`
- `should throw error when invalid port`
- `should route to build when build command`

### Assertion Patterns

**Equality**:
```javascript
expect(result).toBe('expected')
expect(result).toEqual({ key: 'value' })
```

**Truthiness**:
```javascript
expect(result).toBeTruthy()
expect(result).toBeFalsy()
expect(result).toBeNull()
expect(result).toBeUndefined()
```

**Numbers**:
```javascript
expect(result).toBeGreaterThan(0)
expect(result).toBeLessThan(100)
expect(result).toBeCloseTo(3.14, 2)
```

**Strings**:
```javascript
expect(result).toContain('substring')
expect(result).toMatch(/pattern/)
expect(result).toHaveLength(10)
```

**Arrays**:
```javascript
expect(result).toContain('item')
expect(result).toHaveLength(3)
expect(result).toEqual(expect.arrayContaining(['item']))
```

**Objects**:
```javascript
expect(result).toHaveProperty('key')
expect(result).toEqual(expect.objectContaining({ key: 'value' }))
```

**Errors**:
```javascript
expect(() => function()).toThrow()
expect(() => function()).toThrow('error message')
expect(() => function()).toThrowError(Error)
```

**Mock Functions**:
```javascript
expect(mockFn).toHaveBeenCalled()
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2')
expect(mockFn).toHaveBeenCalledTimes(1)
expect(mockFn).toHaveReturnedWith('result')
```

## Test Best Practices

### 1. Test Isolation

**Principle**: Each test should be independent and not affect other tests.

**Implementation**:
```javascript
beforeEach(() => {
    vi.clearAllMocks()
    // Reset state
})
```

### 2. Arrange-Act-Assert

**Principle**: Structure tests with clear setup, execution, and verification.

**Implementation**:
```javascript
it('should build successfully', () => {
    // Arrange
    const builder = createBuilder()
    shell.exec.mockReturnValue({ code: 0, stdout: 'Success', stderr: '' })
    
    // Act
    const result = builder.build()
    
    // Assert
    expect(result).toBeTruthy()
    expect(shell.exec).toHaveBeenCalled()
})
```

### 3. Test One Thing

**Principle**: Each test should verify one specific behavior.

**Implementation**:
```javascript
// Good: Tests one behavior
it('should return true when port is available', () => {
    // ...
})

// Bad: Tests multiple behaviors
it('should handle port checking and process killing', () => {
    // ...
})
```

### 4. Descriptive Names

**Principle**: Test names should clearly describe what is being tested.

**Implementation**:
```javascript
// Good: Descriptive name
it('should throw TypeError when debug mode is not boolean', () => {
    // ...
})

// Bad: Vague name
it('should work', () => {
    // ...
})
```

### 5. Test Edge Cases

**Principle**: Test boundary conditions and error scenarios.

**Implementation**:
```javascript
describe('validatePort', () => {
    it('should accept valid port', () => {
        // Test port 8080
    })
    
    it('should reject port 0', () => {
        // Test port 0
    })
    
    it('should reject port 65536', () => {
        // Test port 65536
    })
    
    it('should reject negative port', () => {
        // Test port -1
    })
})
```

### 6. Mock External Dependencies

**Principle**: Isolate tests from external systems.

**Implementation**:
```javascript
// Mock file system
vi.mock('node:fs')

// Mock shell commands
vi.mock('shelljs')

// Mock process management
vi.mock('ps-list')
```

### 7. Test Error Messages

**Principle**: Verify error messages are helpful and accurate.

**Implementation**:
```javascript
it('should provide helpful error message', () => {
    expect(() => config.validate()).toThrow(
        expect.objectContaining({
            message: expect.stringContaining('Invalid port'),
        })
    )
})
```

## Continuous Integration

### CI Pipeline

**File**: `.github/workflows/ci.yml`

**Steps**:
1. Checkout code
2. Setup Node.js (22.x, 24.x)
3. Install dependencies
4. Check formatting
5. Lint code
6. Run tests

**Trigger**: Push and pull request events

### CI Commands

```bash
# Check formatting
npm run format:check

# Lint code
npm run lint:check

# Run tests
npm test
```

### CI Best Practices

1. **Run tests on every push**
2. **Test multiple Node.js versions**
3. **Check formatting and linting**
4. **Fail fast on errors**
5. **Provide clear error messages**

## Test Maintenance

### Updating Tests

**When to Update**:
- Adding new features
- Changing existing behavior
- Fixing bugs
- Refactoring code

**How to Update**:
1. Identify affected tests
2. Update test expectations
3. Add new test cases
4. Remove obsolete tests
5. Run full test suite

### Test Refactoring

**Common Refactoring**:
- Extract common setup
- Create test helpers
- Simplify assertions
- Remove duplication

**Example**:
```javascript
// Before: Duplicated setup
it('test1', () => {
    const config = { port: 8080 }
    // ...
})

it('test2', () => {
    const config = { port: 8080 }
    // ...
})

// After: Extracted setup
function createConfig(overrides = {}) {
    return { port: 8080, ...overrides }
}

it('test1', () => {
    const config = createConfig()
    // ...
})

it('test2', () => {
    const config = createConfig({ port: 9090 })
    // ...
})
```

## Debugging Tests

### Running Specific Tests

```bash
# Run specific test file
npx vitest run test/builder.test.js

# Run specific test case
npx vitest run test/builder.test.js -t "should build successfully"

# Run with verbose output
npx vitest run --reporter verbose
```

### Debugging Failed Tests

```bash
# Run with debug output
npx vitest run --debug

# Run with source maps
npx vitest run --sourcemap

# Run single test file
npx vitest run test/builder.test.js
```

### Common Test Issues

**Mock Not Working**:
```javascript
// Ensure mock is set up before import
vi.mock('shelljs')
import shell from 'shelljs'
```

**Async Test Issues**:
```javascript
// Use async/await
it('should handle async operation', async () => {
    const result = await asyncFunction()
    expect(result).toBe('expected')
})
```

**Timeout Issues**:
```javascript
// Increase timeout
it('should complete within time', async () => {
    // ...
}, 10000) // 10 seconds
```

## Test Coverage Analysis

### Coverage Commands

```bash
# Generate coverage report
npx vitest run --coverage

# View coverage in browser
npx vitest run --coverage --coverage-reporter html
open coverage/index.html
```

### Coverage Interpretation

**Statement Coverage**: Lines of code executed
**Branch Coverage**: If/else branches executed
**Function Coverage**: Functions called
**Line Coverage**: Lines of code executed

### Improving Coverage

**Identify Gaps**:
```bash
# View uncovered lines
npx vitest run --coverage --coverage-reporter text
```

**Add Tests**:
1. Find uncovered code
2. Write tests for missing scenarios
3. Focus on error paths
4. Test edge cases

## Best Practices Summary

### Do's

- ✅ Write tests before fixing bugs
- ✅ Test both success and failure paths
- ✅ Use descriptive test names
- ✅ Mock external dependencies
- ✅ Keep tests isolated
- ✅ Run tests frequently
- ✅ Maintain test coverage

### Don'ts

- ❌ Skip testing error paths
- ❌ Write brittle tests
- ❌ Test implementation details
- ❌ Ignore failing tests
- ❌ Leave commented-out tests
- ❌ Test multiple things in one test

---

*For architectural context, see the [Architecture Overview](../architecture/overview.md). For development workflows, see [Development Workflows](../workflows/development-workflow.md).*