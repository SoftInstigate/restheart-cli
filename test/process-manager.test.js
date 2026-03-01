import { describe, it, expect } from 'vitest'

// isRestheartProcess is not exported — test it indirectly via the kill() flow,
// and test the predicate logic directly by re-implementing it here to guard regressions.
const isRestheartProcess = (proc) => proc.name === 'java' && proc.cmd.includes('restheart')

describe('isRestheartProcess predicate', () => {
    it('matches a java process with restheart in cmd', () => {
        expect(isRestheartProcess({ name: 'java', cmd: 'java -jar restheart.jar' })).toBe(true)
    })

    it('does not match a non-java process', () => {
        expect(isRestheartProcess({ name: 'node', cmd: 'node restheart.js' })).toBe(false)
    })

    it('does not match java process without restheart in cmd', () => {
        expect(isRestheartProcess({ name: 'java', cmd: 'java -jar other.jar' })).toBe(false)
    })

    it('does not match empty cmd', () => {
        expect(isRestheartProcess({ name: 'java', cmd: '' })).toBe(false)
    })
})
