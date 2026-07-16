import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.js'],
    restoreMocks: true,
    clearMocks: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    fileParallelism: false,
    sequence: {
      concurrent: false,
      shuffle: false,
    },
    pool: 'forks',
    maxWorkers: 1,
    coverage: {
      provider: 'v8',
      include: ['src/controllers/**', 'src/middlewares/**', 'src/services/**', 'src/utils/**'],
      exclude: ['src/models/**', 'src/**/*.test.js', 'src/test/**'],
    },
  },
});
