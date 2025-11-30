import { describe, it, expect } from 'vitest'
import { createLogger } from './logger'

describe('Logger', () => {
  it('should create a logger instance', () => {
    const logger = createLogger('test')
    expect(logger).toBeDefined()
    expect(typeof logger.info).toBe('function')
    expect(typeof logger.error).toBe('function')
  })
})