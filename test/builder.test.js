import { beforeEach, describe, expect, it, vi } from 'vitest'

const shellMocks = vi.hoisted(() => ({
    pwd: vi.fn(() => '/start'),
    rm: vi.fn(),
    cd: vi.fn(),
    exec: vi.fn(() => ({ code: 0 })),
    find: vi.fn(() => []),
    cp: vi.fn(() => ({ code: 0, stderr: '' })),
    ls: vi.fn(() => []),
}))

const fsMocks = vi.hoisted(() => ({
    existsSync: vi.fn(),
    chmodSync: vi.fn(),
}))

const utilsMocks = vi.hoisted(() => ({
    commandExists: vi.fn(),
    ensureDir: vi.fn(),
    createSpinner: vi.fn(() => ({
        text: '',
        succeed: vi.fn(),
        fail: vi.fn(),
    })),
}))

const loggerMocks = vi.hoisted(() => ({
    logger: {
        status: vi.fn(),
        warning: vi.fn(),
        info: vi.fn(),
        success: vi.fn(),
        debug: vi.fn(),
    },
}))

const errorHandlerMocks = vi.hoisted(() => ({
    ErrorHandler: {
        processError: vi.fn(() => {
            throw new Error('processError called')
        }),
        fileSystemError: vi.fn(() => {
            throw new Error('fileSystemError called')
        }),
    },
}))

vi.mock('shelljs', () => ({
    default: shellMocks,
}))

vi.mock('node:fs', () => ({
    default: fsMocks,
}))

vi.mock('../lib/utils.js', () => utilsMocks)
vi.mock('../lib/logger.js', () => loggerMocks)
vi.mock('../lib/error-handler.js', () => errorHandlerMocks)

describe('Builder', () => {
    let Builder

    const createBuilder = () =>
        new Builder({
            getAll: () => ({
                repoDir: '/repo',
                rhDir: '/repo/.cache/restheart',
                debugMode: false,
                buildSystem: 'auto',
            }),
        })

    beforeEach(async () => {
        vi.resetModules()
        vi.clearAllMocks()

        shellMocks.exec.mockReturnValue({ code: 0 })
        shellMocks.find.mockImplementation(() => [])
        shellMocks.cp.mockReturnValue({ code: 0, stderr: '' })
        utilsMocks.commandExists.mockImplementation(() => undefined)
        ;({ Builder } = await import('../lib/builder.js'))
    })

    it('uses mvnw when available', () => {
        fsMocks.existsSync.mockImplementation((p) => p === '/repo/mvnw' || p === '/repo/target')

        const builder = createBuilder()

        builder.build('clean package', true)

        expect(utilsMocks.commandExists).toHaveBeenCalledWith('./mvnw')
        expect(shellMocks.exec).toHaveBeenCalledWith(
            './mvnw -f pom.xml clean package -DskipTests=true'
        )
    })

    it('falls back to mvn when mvnw is missing', () => {
        fsMocks.existsSync.mockImplementation((p) => p === '/repo/target' || p === '/repo/pom.xml')

        const builder = createBuilder()

        builder.build('package', false)

        expect(utilsMocks.commandExists).toHaveBeenCalledWith('mvn')
        expect(shellMocks.exec).toHaveBeenCalledWith('mvn -f pom.xml package -DskipTests=false')
    })

    it('falls back to mvn when ./mvnw is not executable', () => {
        fsMocks.existsSync.mockImplementation((p) => p === '/repo/mvnw' || p === '/repo/target')
        utilsMocks.commandExists.mockImplementation((cmd) => {
            if (cmd === './mvnw') {
                throw new Error('not executable')
            }
        })

        const builder = createBuilder()

        builder.build('package', true)

        expect(utilsMocks.commandExists).toHaveBeenCalledWith('./mvnw')
        expect(utilsMocks.commandExists).toHaveBeenCalledWith('mvn')
        expect(shellMocks.exec).toHaveBeenCalledWith('mvn -f pom.xml package -DskipTests=true')
    })

    it('deploys both main and lib jars from target', () => {
        fsMocks.existsSync.mockImplementation((p) => p === '/repo/target')
        shellMocks.find.mockImplementation((p) => {
            if (p === '/repo/target') {
                return ['/repo/target/plugin.jar', '/repo/target/lib/dep.jar']
            }

            if (p === '/repo/target/lib') {
                return ['/repo/target/lib/dep.jar']
            }

            return []
        })

        const builder = createBuilder()

        builder.deploy()

        expect(utilsMocks.ensureDir).toHaveBeenCalledWith('/repo/.cache/restheart/plugins')
        expect(shellMocks.cp).toHaveBeenCalledWith(
            ['/repo/target/plugin.jar'],
            '/repo/.cache/restheart/plugins'
        )
        expect(shellMocks.cp).toHaveBeenCalledWith(
            ['/repo/target/lib/dep.jar'],
            '/repo/.cache/restheart/plugins'
        )
    })

    it('reports build failure when shell command exits non-zero', () => {
        fsMocks.existsSync.mockImplementation((p) => p === '/repo/target' || p === '/repo/pom.xml')
        shellMocks.exec.mockReturnValue({ code: 1 })

        const builder = createBuilder()

        expect(() => builder.build('clean package', true)).toThrow('processError called')
        expect(errorHandlerMocks.ErrorHandler.processError).toHaveBeenCalled()
        expect(errorHandlerMocks.ErrorHandler.processError.mock.calls[0][0]).toContain(
            'maven build failed with exit code 1'
        )
    })

    it('reports build failure when target directory is missing after successful build', () => {
        fsMocks.existsSync.mockReturnValue(false)
        shellMocks.exec.mockReturnValue({ code: 0 })

        const builder = createBuilder()

        expect(() => builder.build('clean package', true)).toThrow('processError called')
        expect(errorHandlerMocks.ErrorHandler.processError).toHaveBeenCalled()
        expect(errorHandlerMocks.ErrorHandler.processError.mock.calls[0][0]).toContain(
            'Build completed but target directory not found'
        )
    })

    it('fails deploy when target directory does not exist', () => {
        fsMocks.existsSync.mockReturnValue(false)

        const builder = createBuilder()

        expect(() => builder.deploy()).toThrow('fileSystemError called')
        expect(errorHandlerMocks.ErrorHandler.fileSystemError).toHaveBeenCalled()
        expect(errorHandlerMocks.ErrorHandler.fileSystemError.mock.calls[0][0]).toContain(
            'Target directory not found'
        )
    })

    it('fails deploy when no jars are found', () => {
        fsMocks.existsSync.mockReturnValue(true)
        shellMocks.find.mockReturnValue([])

        const builder = createBuilder()

        expect(() => builder.deploy()).toThrow('fileSystemError called')
        expect(errorHandlerMocks.ErrorHandler.fileSystemError).toHaveBeenCalled()
        expect(errorHandlerMocks.ErrorHandler.fileSystemError.mock.calls[0][0]).toContain(
            'No JAR files found to deploy'
        )
    })

    it('auto-detects gradle for gradle-only repositories', () => {
        fsMocks.existsSync.mockImplementation((p) => {
            const gradleFiles = ['/repo/gradlew', '/repo/build.gradle', '/repo/build']
            return gradleFiles.includes(p)
        })

        const builder = createBuilder()

        builder.build('clean package', true)

        expect(utilsMocks.commandExists).toHaveBeenCalledWith('./gradlew')
        expect(shellMocks.exec).toHaveBeenCalledWith('./gradlew clean build -x test')
    })

    it('keeps maven precedence when both maven and gradle files exist', () => {
        fsMocks.existsSync.mockImplementation((p) => {
            const bothFiles = ['/repo/pom.xml', '/repo/mvnw', '/repo/gradlew', '/repo/target']
            return bothFiles.includes(p)
        })

        const builder = createBuilder()

        builder.build('package', false)

        expect(utilsMocks.commandExists).toHaveBeenCalledWith('./mvnw')
        expect(shellMocks.exec).toHaveBeenCalledWith('./mvnw -f pom.xml package -DskipTests=false')
    })

    it('deploys gradle jars from build/libs in gradle-only repositories', () => {
        fsMocks.existsSync.mockImplementation((p) => {
            const gradleFiles = ['/repo/build.gradle', '/repo/build']
            return gradleFiles.includes(p)
        })

        shellMocks.find.mockImplementation((p) => {
            if (p === '/repo/build/libs') {
                return ['/repo/build/libs/plugin.jar']
            }

            if (p === '/repo/build/libs/lib') {
                return []
            }

            return []
        })

        const builder = createBuilder()

        builder.deploy()

        expect(shellMocks.cp).toHaveBeenCalledWith(
            ['/repo/build/libs/plugin.jar'],
            '/repo/.cache/restheart/plugins'
        )
    })
})
