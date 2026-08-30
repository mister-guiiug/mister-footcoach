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
      // statements 1414/1942, branches 1187/1612, functions 527/759,
      // lines 1279/1749 (le `pct` d'istanbul tronque à 2 décimales). Mesures
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
      // Rebasé à l'adoption du module `ical` du socle : `src/utils/ical.ts`
      // (108 lignes, couvertes à ~100 %) a été SUPPRIMÉ au profit du paquet,
      // testé chez lui. Le dénominateur perd donc des lignes toutes couvertes,
      // ce qui tire le ratio vers le bas MÉCANIQUEMENT. Le seul reste local —
      // la conversion match/entraînement → événement — est passé dans son
      // unique appelant et y est couvert à 100 % par un test qui relit le
      // `.ics` réellement téléchargé : branches +0,49 pt, functions +0,33 pt,
      // statements +0,01 pt ; seules les lines cèdent 0,03 pt, et aucune ligne
      // restante n'a perdu de test.
      thresholds: {
        statements: 72.81,
        branches: 73.63,
        functions: 69.43,
        lines: 73.12,
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
