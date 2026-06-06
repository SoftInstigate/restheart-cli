import { beforeEach, describe, expect, it, vi } from 'vitest'

const fsMocks = vi.hoisted(() => ({
    existsSync: vi.fn(),
}))

vi.mock('node:fs', () => ({
    default: fsMocks,
}))

describe('resolveBuildSystem', () => {
    let resolveBuildSystem

    beforeEach(async () => {
        vi.resetModules()
        vi.clearAllMocks()
        fsMocks.existsSync.mockReturnValue(false)
        ;({ resolveBuildSystem } = await import('../lib/build-systems/index.js'))
    })

    it('defaults to maven in auto mode when no build files are present', () => {
        const system = resolveBuildSystem('/repo')
        expect(system.getName()).toBe('maven')
    })

    it('detects gradle in auto mode when gradle files exist', () => {
        fsMocks.existsSync.mockImplementation((p) => p === '/repo/build.gradle.kts')
        const system = resolveBuildSystem('/repo', 'auto')
        expect(system.getName()).toBe('gradle')
    })

    it('uses explicit preference over auto-detection', () => {
        fsMocks.existsSync.mockImplementation((p) => p === '/repo/pom.xml')
        const system = resolveBuildSystem('/repo', 'gradle')
        expect(system.getName()).toBe('gradle')
    })
})
