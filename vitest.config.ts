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
      // statements 1420/1958, branches 1177/1616, functions 522/758,
      // lines 1285/1764 (le `pct` d'istanbul tronque à 2 décimales). Mesures
      // identiques sur Linux (CI) et Windows, d'où la tolérance zéro.
      // Cliquet strict : toute régression casse la CI, et tout gain de
      // couverture doit être répercuté ici. À monter, jamais à baisser pour
      // faire passer le rouge au vert.
      // Rebasé (à la baisse de ~0,4 pt) lors de la migration du kit UI vers
      // les composants du socle : ~200 lignes locales couvertes à ~100 %
      // (Badge, Button, EmptyState, Toast, Dialog) ont été SUPPRIMÉES au
      // profit du paquet, testé chez lui. Aucune ligne restante n'a perdu
      // de test — le dénominateur a changé, pas la discipline.
      thresholds: {
        statements: 72.52,
        branches: 72.83,
        functions: 68.86,
        lines: 72.84,
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
