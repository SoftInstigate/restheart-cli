import { describe, it, expect, vi, beforeEach } from 'vitest'
import path from 'path'
import os from 'os'

// We run ConfigManager against the real tmpdir to avoid mocking fs
describe('ConfigManager', () => {
    let ConfigManager

    beforeEach(async () => {
        vi.resetModules()
        ;({ ConfigManager } = await import('../lib/config.js'))
    })

    it('initializes with default values', () => {
        const cm = new ConfigManager({ cacheDir: path.join(os.tmpdir(), 'rh-test-cache') })
        expect(cm.get('httpPort')).toBe(8080)
        expect(cm.get('debugMode')).toBe(false)
        expect(cm.get('repoDir')).toBe(process.cwd())
    })

    it('accepts custom httpPort', () => {
        const cm = new ConfigManager({
            httpPort: 9090,
            cacheDir: path.join(os.tmpdir(), 'rh-test-cache'),
        })
        expect(cm.get('httpPort')).toBe(9090)
    })

    it('get() returns undefined and warns for unknown key', () => {
        const cm = new ConfigManager({ cacheDir: path.join(os.tmpdir(), 'rh-test-cache') })
        expect(cm.get('nonExistentKey')).toBeUndefined()
    })

    it('set() updates a valid key', () => {
        const cm = new ConfigManager({ cacheDir: path.join(os.tmpdir(), 'rh-test-cache') })
        cm.set('httpPort', 7070)
        expect(cm.get('httpPort')).toBe(7070)
    })

    it('set() rejects an invalid port', () => {
        const cm = new ConfigManager({ cacheDir: path.join(os.tmpdir(), 'rh-test-cache') })
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {})
        cm.set('httpPort', 99999)
        // port should remain unchanged
        expect(cm.get('httpPort')).toBe(8080)
        exitSpy.mockRestore()
    })

    it('getAll() returns a copy of the config', () => {
        const cm = new ConfigManager({ cacheDir: path.join(os.tmpdir(), 'rh-test-cache') })
        const config = cm.getAll()
        config.httpPort = 1234
        // original should be unchanged
        expect(cm.get('httpPort')).toBe(8080)
    })

    it('throws during construction for invalid port', () => {
        expect(
            () =>
                new ConfigManager({
                    httpPort: -1,
                    cacheDir: path.join(os.tmpdir(), 'rh-test-cache'),
                })
        ).toThrow()
    })
})
