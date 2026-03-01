import { describe, it, expect, vi, afterEach } from 'vitest'
import net from 'node:net'

describe('checkPort', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('returns true when port is open (connection succeeds)', async () => {
        // Spin up a real server on a random port
        const server = net.createServer()
        await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
        const { port } = server.address()

        const { checkPort } = await import('../lib/utils.js')
        const result = await checkPort(port)

        server.close()
        expect(result).toBe(true)
    })

    it('returns false when nothing is listening on the port', async () => {
        // Use a port that is almost certainly not in use
        const { checkPort } = await import('../lib/utils.js')
        const result = await checkPort(19999)
        expect(result).toBe(false)
    })

    it('returns false on timeout instead of hanging', async () => {
        // Simulate a port that is "filtered" (accepts TCP SYN but never responds)
        // by mocking net.createConnection to emit 'timeout'
        vi.resetModules()
        const { EventEmitter } = await import('node:events')

        const fakeSocket = new EventEmitter()
        fakeSocket.setTimeout = () => {
            // Emit timeout after a tick
            setImmediate(() => fakeSocket.emit('timeout'))
        }
        fakeSocket.destroy = vi.fn()
        fakeSocket.end = vi.fn()

        vi.spyOn(net, 'createConnection').mockReturnValue(fakeSocket)

        const { checkPort } = await import('../lib/utils.js')
        const result = await checkPort(12345)
        expect(result).toBe(false)
        expect(fakeSocket.destroy).toHaveBeenCalled()
    })
})
