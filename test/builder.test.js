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

    beforeEach(async () => {
        vi.resetModules()
        vi.clearAllMocks()
        ;({ Builder } = await import('../lib/builder.js'))
    })

    it('uses mvnw when available', () => {
        fsMocks.existsSync.mockImplementation((p) => p === '/repo/mvnw' || p === '/repo/target')

        const builder = new Builder({
            getAll: () => ({
                repoDir: '/repo',
                rhDir: '/repo/.cache/restheart',
                debugMode: false,
            }),
        })

        builder.build('clean package', true)

        expect(utilsMocks.commandExists).toHaveBeenCalledWith('./mvnw')
        expect(shellMocks.exec).toHaveBeenCalledWith(
            './mvnw -f pom.xml clean package -DskipTests=true'
        )
    })

    it('falls back to mvn when mvnw is missing', () => {
        fsMocks.existsSync.mockImplementation((p) => p === '/repo/target')

        const builder = new Builder({
            getAll: () => ({
                repoDir: '/repo',
                rhDir: '/repo/.cache/restheart',
                debugMode: false,
            }),
        })

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

        const builder = new Builder({
            getAll: () => ({
                repoDir: '/repo',
                rhDir: '/repo/.cache/restheart',
                debugMode: false,
            }),
        })

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

        const builder = new Builder({
            getAll: () => ({
                repoDir: '/repo',
                rhDir: '/repo/.cache/restheart',
                debugMode: false,
            }),
        })

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
})
