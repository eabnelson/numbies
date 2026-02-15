import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'convex/**/*.test.ts'],
  },
  define: {
    __DEV__: false,
  },
})
