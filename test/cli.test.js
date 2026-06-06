import { describe, expect, it, vi } from 'vitest'
import { runCommand } from '../lib/cli.js'

function createRh() {
    return {
        setHttpPort: vi.fn(),
        setBuildSystem: vi.fn(),
        printConfiguration: vi.fn(),
        install: vi.fn(),
        build: vi.fn(),
        deploy: vi.fn(),
        run: vi.fn().mockResolvedValue(undefined),
        onlyPrintConfig: vi.fn().mockReturnValue(false),
        checkAndKill: vi.fn().mockResolvedValue(undefined),
        watchFiles: vi.fn(),
        status: vi.fn().mockResolvedValue(undefined),
    }
}

describe('runCommand routing', () => {
    it('routes build command to build and deploy', async () => {
        const rh = createRh()

        await runCommand('build', {}, rh)

        expect(rh.setBuildSystem).not.toHaveBeenCalled()
        expect(rh.build).toHaveBeenCalledWith('clean package')
        expect(rh.deploy).toHaveBeenCalledTimes(1)
    })

    it('routes run --build through checkAndKill, build/deploy, then run', async () => {
        const rh = createRh()

        await runCommand('run', { build: true, '--': ['-o', 'etc/localhost.yml'] }, rh)

        expect(rh.checkAndKill).toHaveBeenCalledTimes(1)
        expect(rh.build).toHaveBeenCalledWith('clean package', true)
        expect(rh.deploy).toHaveBeenCalledTimes(1)
        expect(rh.run).toHaveBeenCalledWith('-o etc/localhost.yml')
    })

    it('routes watch --build through checkAndKill, build/deploy, run and watchFiles', async () => {
        const rh = createRh()

        await runCommand('watch', { build: true, '--': ['-o', 'etc/localhost.yml'] }, rh)

        expect(rh.checkAndKill).toHaveBeenCalledTimes(1)
        expect(rh.build).toHaveBeenCalledWith('clean package', true)
        expect(rh.deploy).toHaveBeenCalledTimes(1)
        expect(rh.run).toHaveBeenCalledWith('-o etc/localhost.yml')
        expect(rh.watchFiles).toHaveBeenCalledWith('-o etc/localhost.yml')
    })

    it('routes install and applies port configuration when provided', async () => {
        const rh = createRh()

        await runCommand(
            'install',
            {
                restheartVersion: '8.10.1',
                force: true,
                port: 9090,
            },
            rh
        )

        expect(rh.setHttpPort).toHaveBeenCalledWith(9090)
        expect(rh.install).toHaveBeenCalledWith('8.10.1', true)
    })

    it('applies build-system configuration when provided', async () => {
        const rh = createRh()

        await runCommand(
            'build',
            {
                buildSystem: 'gradle',
            },
            rh
        )

        expect(rh.setBuildSystem).toHaveBeenCalledWith('gradle')
        expect(rh.build).toHaveBeenCalledWith('clean package')
        expect(rh.deploy).toHaveBeenCalledTimes(1)
    })

    it('applies build-system configuration from hyphenated argv key', async () => {
        const rh = createRh()

        await runCommand(
            'build',
            {
                'build-system': 'maven',
            },
            rh
        )

        expect(rh.setBuildSystem).toHaveBeenCalledWith('maven')
        expect(rh.build).toHaveBeenCalledWith('clean package')
        expect(rh.deploy).toHaveBeenCalledTimes(1)
    })
})
