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
      // Planchers = couverture réelle EXACTE au 2026-08-30, sans marge :
      // statements 1456/1998, branches 1199/1641, functions 540/777,
      // lines 1316/1795 (le `pct` d'istanbul tronque à 2 décimales). Mesures
      // identiques sur Linux (CI) et Windows, d'où la tolérance zéro.
      // Cliquet strict : toute régression casse la CI, et tout gain de
      // couverture doit être répercuté ici. À monter, jamais à baisser pour
      // faire passer le rouge au vert.
      thresholds: {
        statements: 72.87,
        branches: 73.06,
        functions: 69.49,
        lines: 73.31,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      'virtual:pwa-register': resolve(__dirname, './src/test/pwa-mock.ts'),
    },
  },
});
