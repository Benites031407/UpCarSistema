import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 60000, // 60 seconds for tests
    hookTimeout: 60000, // 60 seconds for hooks (beforeAll, afterAll)
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
})