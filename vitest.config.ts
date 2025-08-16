import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', '__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/**/*.test.ts',
        '__tests__/**/*.test.ts',
        'src/**/types.ts',
        'dist/',
        'coverage/',
        '**/*.d.ts'
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80
      }
    },
    // Enable watch mode by default for development
    watch: false,
    // Better error reporting
    reporter: ['verbose'],
    // Timeout settings for long-running tests
    testTimeout: 10000,
    hookTimeout: 10000
  },
  resolve: {
    alias: {
      '@core': '/src/core',
      '@plugins': '/src/plugins',
      '@mcp': '/src/mcp',
      '@tests': '/src/__tests__'
    }
  }
});