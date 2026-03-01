import { describe, it, expect } from 'vitest'
import path from 'path'
import os from 'os'
import { parseConfigFiles } from '../lib/watcher.js'

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
