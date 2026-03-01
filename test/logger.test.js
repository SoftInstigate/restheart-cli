import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Logger, LogLevel } from '../lib/logger.js'

describe('Logger', () => {
    let outputFn
    let logger

    beforeEach(() => {
        outputFn = vi.fn()
        logger = new Logger({ outputFn })
    })

    it('emits info messages at INFO level', () => {
        logger.setLevel(LogLevel.INFO)
        logger.info('hello')
        expect(outputFn).toHaveBeenCalledOnce()
        expect(outputFn.mock.calls[0][0]).toContain('hello')
    })

    it('suppresses debug messages at INFO level', () => {
        logger.setLevel(LogLevel.INFO)
        logger.debug('hidden')
        expect(outputFn).not.toHaveBeenCalled()
    })

    it('emits debug messages at DEBUG level', () => {
        logger.setLevel(LogLevel.DEBUG)
        logger.debug('visible')
        expect(outputFn).toHaveBeenCalledOnce()
    })

    it('suppresses all messages except errors at ERROR level', () => {
        logger.setLevel(LogLevel.ERROR)
        logger.debug('no')
        logger.info('no')
        logger.success('no')
        logger.status('no')
        logger.warning('no')
        expect(outputFn).not.toHaveBeenCalled()
        logger.error('yes')
        expect(outputFn).toHaveBeenCalledOnce()
    })

    it('status() emits at INFO level', () => {
        logger.setLevel(LogLevel.INFO)
        logger.status('starting...')
        expect(outputFn).toHaveBeenCalledOnce()
    })

    it('status() is suppressed at WARNING level', () => {
        logger.setLevel(LogLevel.WARNING)
        logger.status('starting...')
        expect(outputFn).not.toHaveBeenCalled()
    })

    it('log() always emits regardless of level', () => {
        logger.setLevel(LogLevel.ERROR)
        logger.log('always shown')
        expect(outputFn).toHaveBeenCalledOnce()
    })

    it('prepends timestamp when enabled', () => {
        logger.setTimestamps(true)
        logger.info('timed')
        const output = outputFn.mock.calls[0][0]
        expect(output).toMatch(/\[\d{4}-\d{2}-\d{2}T/)
    })

    it('does not prepend timestamp when disabled', () => {
        logger.setTimestamps(false)
        logger.info('no-time')
        const output = outputFn.mock.calls[0][0]
        expect(output).not.toMatch(/^\[/)
    })
})
