import { beforeEach, describe, expect, it, vi } from 'vitest'
import path from 'node:path'
import os from 'node:os'

const spinnerMocks = vi.hoisted(() => ({
    spinner: {
        text: '',
        succeed: vi.fn(),
        fail: vi.fn(),
    },
}))

vi.mock('../lib/utils.js', () => ({
    createSpinner: vi.fn(() => spinnerMocks.spinner),
}))

const { Watcher, parseConfigFiles } = await import('../lib/watcher.js')

describe('parseConfigFiles', () => {
    const repoDir = os.tmpdir()

    it('returns empty array for empty string', () => {
        expect(parseConfigFiles('', repoDir)).toEqual([])
    })

    it('returns empty array when no -o flag', () => {
        expect(parseConfigFiles('--port 8080', repoDir)).toEqual([])
    })

    it('parses -o <file> (space-separated)', () => {
        const result = parseConfigFiles('-o etc/config.yml', repoDir)
        expect(result).toHaveLength(1)
        expect(result[0]).toBe(path.join(repoDir, 'etc/config.yml'))
    })

    it('parses -o=<file> (equals-separated)', () => {
        const result = parseConfigFiles('-o=etc/config.yml', repoDir)
        expect(result).toHaveLength(1)
        expect(result[0]).toBe(path.join(repoDir, 'etc/config.yml'))
    })

    it('parses --options <file>', () => {
        const result = parseConfigFiles('--options etc/config.yml', repoDir)
        expect(result).toHaveLength(1)
        expect(result[0]).toBe(path.join(repoDir, 'etc/config.yml'))
    })

    it('passes through absolute paths unchanged', () => {
        const absPath = '/absolute/path/config.yml'
        const result = parseConfigFiles(`-o ${absPath}`, repoDir)
        expect(result[0]).toBe(absPath)
    })

    it('parses multiple -o flags', () => {
        const result = parseConfigFiles('-o a.yml -o b.yml', repoDir)
        expect(result).toHaveLength(2)
        expect(result[0]).toBe(path.join(repoDir, 'a.yml'))
        expect(result[1]).toBe(path.join(repoDir, 'b.yml'))
    })
})

describe('Watcher processFileUpdate', () => {
    let processManager
    let builder
    let watcher

    beforeEach(() => {
        vi.clearAllMocks()

        processManager = {
            isRunning: vi.fn().mockResolvedValue(true),
            kill: vi.fn().mockResolvedValue(undefined),
            run: vi.fn().mockResolvedValue(undefined),
        }

        builder = {
            build: vi.fn().mockResolvedValue(undefined),
            deploy: vi.fn().mockResolvedValue(undefined),
        }

        watcher = new Watcher(
            {
                getAll: () => ({ repoDir: '/repo', debugMode: false }),
            },
            processManager,
            builder
        )
    })

    it('java source change triggers build, deploy and restart', async () => {
        await watcher.processFileUpdate(
            '/repo/src/main/java/Foo.java',
            '-- -o etc/localhost.yml',
            []
        )

        expect(processManager.kill).toHaveBeenCalledTimes(1)
        expect(builder.build).toHaveBeenCalledWith('package', true)
        expect(builder.deploy).toHaveBeenCalledTimes(1)
        expect(processManager.run).toHaveBeenCalledWith('-- -o etc/localhost.yml')
    })

    it('pom.xml change triggers build, deploy and restart', async () => {
        await watcher.processFileUpdate('/repo/module/pom.xml', '', [])

        expect(builder.build).toHaveBeenCalledWith('package', true)
        expect(builder.deploy).toHaveBeenCalledTimes(1)
        expect(processManager.run).toHaveBeenCalledWith('')
    })

    it('build.gradle change triggers build, deploy and restart', async () => {
        await watcher.processFileUpdate('/repo/build.gradle', '', [])

        expect(builder.build).toHaveBeenCalledWith('package', true)
        expect(builder.deploy).toHaveBeenCalledTimes(1)
        expect(processManager.run).toHaveBeenCalledWith('')
    })

    it('settings.gradle.kts change triggers build, deploy and restart', async () => {
        await watcher.processFileUpdate('/repo/settings.gradle.kts', '', [])

        expect(builder.build).toHaveBeenCalledWith('package', true)
        expect(builder.deploy).toHaveBeenCalledTimes(1)
        expect(processManager.run).toHaveBeenCalledWith('')
    })

    it('config file change restarts without build/deploy', async () => {
        await watcher.processFileUpdate('/repo/etc/localhost.yml', '-- -o etc/localhost.yml', [
            '/repo/etc/localhost.yml',
        ])

        expect(builder.build).not.toHaveBeenCalled()
        expect(builder.deploy).not.toHaveBeenCalled()
        expect(processManager.run).toHaveBeenCalledWith('-- -o etc/localhost.yml')
    })

    it('unknown file change falls back to full rebuild path', async () => {
        await watcher.processFileUpdate('/repo/docs/readme.txt', '', [])

        expect(builder.build).toHaveBeenCalledWith('package', true)
        expect(builder.deploy).toHaveBeenCalledTimes(1)
        expect(processManager.run).toHaveBeenCalledWith('')
    })
})
