import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import {
  baseTestOptions,
  coveragePreset,
  pwaRegisterAlias,
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
      // statements 1409/1933, branches 1185/1608, functions 526/757,
      // lines 1275/1741 (le `pct` d'istanbul tronque à 2 décimales). Mesures
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
      // Remonté (+0,05 à +0,11 pt) à l'adoption du catalogue de la famille et
      // du bandeau de mise à jour du socle. Deux suppressions, aucune perte de
      // test : `src/links.ts` (6 lignes, 2 couvertes — `appUrl()` n'avait plus
      // d'appelant) et le balisage local du bandeau (UpdateBanner : 6 → 2
      // statements, tous couverts). Les 10 statements retirés n'étaient
      // couverts qu'à 60 % (6/10), sous la moyenne du dépôt : leur départ tire
      // donc le ratio vers le HAUT. `APP_ID` ajoute la seule ligne neuve, et
      // elle est couverte. Net : statements −9 dont −5 couverts, branches −4
      // dont −2, functions −2 dont −1, lines −8 dont −4.
      // Rebasé (−0,17 à −0,37 pt) à l'adoption du `BottomNav` du socle. Le
      // balisage local de la barre (tiroir, voile, bouton « Fermer »,
      // navigation impérative) a été SUPPRIMÉ au profit du paquet, testé chez
      // lui ; il ne reste que la liste des onze destinations. Baisse purement
      // MÉCANIQUE : le dénominateur perd des unités TOUTES couvertes, donc le
      // ratio cède alors qu'aucun test n'a disparu. La preuve tient dans le
      // nombre d'unités NON couvertes, rigoureusement identique avant/après :
      // statements 524, branches 423, functions 231, lines 466. Mesures :
      // statements 1409/1933 → 1397/1921 (−12 dont −12 couverts), branches
      // 1185/1608 → 1175/1598 (−10 dont −10), functions 526/757 → 517/748
      // (−9 dont −9), lines 1275/1741 → 1264/1730 (−11 dont −11). La suite
      // gagne au passage 4 tests (10 sur la barre contre 6), dont l'onglet
      // courant sous basename — le cas qui ne casse qu'en production.
      // Remonté (+0,03 à +0,04 pt) au remplacement du dernier `window.alert`
      // (refus de suppression, RG-CONTACT-03) par le mode MONO-ACTION du
      // `ConfirmDialog` du socle. L'appel natif était hors du DOM : le test ne
      // pouvait qu'espionner « ça a sonné » ; le texte du refus et sa prise
      // d'acte sont désormais assertés. Mesures au 2026-08-31 : statements
      // 1397/1921 → 1399/1923, branches 1175/1598 → 1177/1600, functions
      // 517/748 → 518/749, lines 1264/1730 → 1266/1732. Les unités ajoutées
      // sont TOUTES couvertes — le nombre d'unités NON couvertes ne bouge pas
      // (statements 524, branches 423, functions 231, lines 466).
      // Remonté (+0,10 à +0,14 pt) à l'adoption du bandeau réseau du socle et
      // du garde d'écriture distante. Trois unités neuves — le bandeau
      // (`components/ConnectionBanner.tsx`), le garde
      // (`hooks/useRemoteWriteGuard.ts`) et les quatre corbeilles qui
      // l'étalent — et 15 tests pour aller avec. Le nombre d'unités NON
      // couvertes ne bouge PAS : statements 524, branches 423, functions 231,
      // lines 466, exactement comme au relevé précédent. Autrement dit, tout
      // ce qui a été ajouté est couvert, y compris les DEUX branches qui
      // comptent vraiment ici : bandeau muet avec le backend local, bandeau
      // affiché avec Supabase. Mesures au 2026-08-31 : statements 1399/1923 →
      // 1408/1932 (+9 dont +9 couverts), branches 1177/1600 → 1183/1606
      // (+6 dont +6), functions 518/749 → 521/752 (+3 dont +3), lines
      // 1266/1732 → 1275/1741 (+9 dont +9).
      // 02/09/2026 : six tables *_LABELS mortes retirées de types/index.ts
      // (PARC.md, chantier 10) — des lignes couvertes trivialement en moins,
      // le ratio recule de 0,1 point sans qu'un test ait disparu.
      thresholds: {
        statements: 72.75,
        branches: 73.66,
        functions: 69.28,
        lines: 73.1,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      // `virtual:pwa-register` n'est fourni que par vite-plugin-pwa, absent
      // d'ici. La copie locale annonçait que « le vi.mock du setup partagé
      // reprend la main » : ce vi.mock a été RETIRÉ du socle, il n'a jamais pu
      // rendre ce service — un mock agit à l'exécution, quand Vite a déjà
      // refusé de transformer l'importateur. Le double du socle est PILOTABLE
      // (`swStub.needRefresh()`), là où la copie était muette.
      ...pwaRegisterAlias,
    },
  },
});
