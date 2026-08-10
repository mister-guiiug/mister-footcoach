import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import {
  baseTestOptions,
  coveragePreset,
} from '@mister-guiiug/dev-wpa-config/vitest-base';

export default defineConfig({
  plugins: [react()],
  test: {
    ...baseTestOptions,
    coverage: {
      ...coveragePreset,
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      // `coveragePreset` couvre déjà src/test/** et *.d.ts ; main.tsx est le
      // point d'entrée (montage React), non testable unitairement.
      exclude: [...coveragePreset.exclude, 'src/main.tsx'],
      // Planchers = couverture réelle mesurée le 2026-08-10 (72.5 / 73.1 /
      // 69.4 / 72.9), arrondie à la baisse pour absorber l'écart v8 entre
      // Linux (CI) et Windows. À monter au fil des tests, jamais à baisser
      // pour faire passer le rouge au vert.
      thresholds: {
        statements: 70,
        branches: 71,
        functions: 67,
        lines: 70,
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
