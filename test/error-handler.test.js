import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('ErrorHandler', () => {
    // We need to control the logger singleton used by ErrorHandler.
    // Import after setting up the spy on the logger.
    let ErrorHandler
    let loggerModule

    beforeEach(async () => {
        // Re-import fresh modules for each test using vi.resetModules()
        vi.resetModules()
        loggerModule = await import('../lib/logger.js')
        ;({ ErrorHandler } = await import('../lib/error-handler.js'))
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('logs error message via logger.error()', () => {
        const spy = vi.spyOn(loggerModule.logger, 'error')
        ErrorHandler.handleError(new Error('boom'), { exitProcess: false })
        expect(spy).toHaveBeenCalledOnce()
        expect(spy.mock.calls[0][0]).toContain('boom')
    })

    it('does not exit when exitProcess is false', () => {
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {})
        ErrorHandler.handleError(new Error('no exit'), { exitProcess: false })
        expect(exitSpy).not.toHaveBeenCalled()
    })

    it('exits with code 1 by default when exitProcess is true', () => {
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {})
        ErrorHandler.handleError(new Error('exit'), { exitProcess: true })
        expect(exitSpy).toHaveBeenCalledWith(1)
    })

    it('exits with custom exit code', () => {
        const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {})
        ErrorHandler.handleError(new Error('exit'), { exitProcess: true, exitCode: 42 })
        expect(exitSpy).toHaveBeenCalledWith(42)
    })

    it('shows stack trace when showStack is true', () => {
        const debugSpy = vi.spyOn(loggerModule.logger, 'debug')
        const error = new Error('with stack')
        ErrorHandler.handleError(error, { exitProcess: false, showStack: true })
        expect(debugSpy).toHaveBeenCalledOnce()
    })

    it('does not show stack trace when showStack is false', () => {
        const debugSpy = vi.spyOn(loggerModule.logger, 'debug')
        ErrorHandler.handleError(new Error('no stack'), { exitProcess: false, showStack: false })
        expect(debugSpy).not.toHaveBeenCalled()
    })

    it('commandNotFound includes the command name in the error', () => {
        const spy = vi.spyOn(loggerModule.logger, 'error')
        ErrorHandler.commandNotFound('mvn', { exitProcess: false })
        expect(spy.mock.calls[0][0]).toContain('mvn')
    })
})
