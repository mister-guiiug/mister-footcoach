import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { baseTestOptions } from '@mister-guiiug/dev-wpa-config/vitest-base';

export default defineConfig({
  plugins: [react()],
  test: {
    ...baseTestOptions,
    // Override : 100% coverage exigé (spécifique projet).
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/test/**', 'src/vite-env.d.ts', 'src/main.tsx'],
      thresholds: {
        lines: 100,
        branches: 100,
        functions: 100,
        statements: 100,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      'virtual:pwa-register/react': resolve(
        __dirname,
        './src/test/pwa-mock.ts'
      ),
    },
  },
});
