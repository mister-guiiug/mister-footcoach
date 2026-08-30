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
      // statements 1432/1967, branches 1182/1616, functions 528/764,
      // lines 1297/1773 (le `pct` d'istanbul tronque à 2 décimales). Mesures
      // identiques sur Linux (CI) et Windows, d'où la tolérance zéro.
      // Cliquet strict : toute régression casse la CI, et tout gain de
      // couverture doit être répercuté ici. À monter, jamais à baisser pour
      // faire passer le rouge au vert.
      // Rebasé (à la baisse de ~0,4 pt) lors de la migration du kit UI vers
      // les composants du socle : ~200 lignes locales couvertes à ~100 %
      // (Badge, Button, EmptyState, Toast, Dialog) ont été SUPPRIMÉES au
      // profit du paquet, testé chez lui. Aucune ligne restante n'a perdu
      // de test — le dénominateur a changé, pas la discipline.
      // Remonté (+0,24 à +0,31 pt) au remplacement des trois `window.confirm`
      // par le `ConfirmDialog` du socle : les chemins « confirme » et
      // « annule » sont enfin du DOM, donc testables — celui de la blessure
      // en direct n'était couvert par rien.
      thresholds: {
        statements: 72.8,
        branches: 73.14,
        functions: 69.1,
        lines: 73.15,
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
