import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import {
  baseTestOptions,
  coveragePreset,
  pwaRegisterAlias,
} from '@mister-guiiug/dev-pwa-config/vitest-base';

export default defineConfig({
  plugins: [react()],
  test: {
    ...baseTestOptions,
    // Vitest stube les feuilles (`css: false`) : `import … from './index.css?raw'`
    // rendrait la chaîne VIDE, et `src/theme.test.ts` ne mesurerait rien. On
    // n'ouvre que la lecture BRUTE de cette feuille ; un `import './index.css'`
    // reste stubé, et Tailwind n'est jamais compilé pendant les tests.
    css: { include: [/index\.css\?raw$/] },
    coverage: {
      ...coveragePreset,
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      // `coveragePreset` couvre déjà src/test/** et *.d.ts ; main.tsx est le
      // point d'entrée (montage React), non testable unitairement.
      exclude: [...coveragePreset.exclude, 'src/main.tsx'],
      // Planchers = couverture réelle EXACTE au 2026-08-30, sans marge :
      // statements 1409/1933, branches 1185/1608, functions 526/757,
      // lines 1275/1741 (le `pct` d'istanbul tronque à 2 décimales).
      // Cliquet strict : toute régression casse la CI, et tout gain de
      // couverture doit être répercuté ici. À monter, jamais à baisser pour
      // faire passer le rouge au vert.
      //
      // La RÉFÉRENCE est la CI, et elle seule : `npm ci` y installe le
      // lockfile à la lettre. La phrase qui tenait ici — « mesures identiques
      // sur Linux (CI) et Windows, d'où la tolérance zéro » — promettait le
      // bon résultat pour la mauvaise raison. Le 06/09/2026, sur le même
      // commit (3a97850), le poste rendait 75.67 / 74.83 / 71.18 / 76.13 et la
      // CI 75.72 / 75.22 / 71.26 / 76.18 : jusqu'à 0,39 pt d'écart sur les
      // branches, et des DÉNOMINATEURS différents (1657 contre 1683), donc pas
      // un arrondi. Les seuils, calés sur le poste, étaient la mesure exacte
      // d'une installation abîmée.
      //
      // Ce n'est PAS Windows contre Linux : les deux rendent le même chiffre
      // au bit près. Ce qui divergeait, c'est la chaîne d'outils. Pour
      // construire sous Windows on pose les binaires natifs sans les
      // enregistrer (`npm i --no-save @rolldown/binding-win32-x64-msvc …`) ;
      // sans numéro, npm installe la DERNIÈRE version, pas celle du lockfile —
      // ici @rolldown/binding 1.2.7 au lieu de 1.1.5 (et lightningcss 1.33.0
      // pour 1.32.0, @rollup/rollup 4.63.1 pour 4.62.2). Or le transformeur de
      // 1.2.7 conserve DAVANTAGE de commentaires à travers la transformation
      // JSX : dans TeamDetailPage.tsx aucun `/* istanbul ignore next */` ne
      // survivait, il en survit un ; dans MatchDetailPage.tsx on passe de un à
      // trois. Chaque indice qui survit fait RETIRER du rapport le sous-arbre
      // qu'il annote — ici du code entièrement couvert (TeamDetailPage
      // 166-207, MatchDetailPage 254-271). L'écart entier tient dans ces deux
      // fichiers, et il est à sens unique : le poste voyait moins d'unités,
      // toutes couvertes, donc un ratio plus bas. En épinglant les binaires du
      // lockfile, le poste retombe sur 1541/2035, 1266/1683, 553/776,
      // 1398/1835 — la CI à l'identique.
      //
      // Donc : seuils calés sur la CI, et une mesure locale EN DESSOUS n'accuse
      // pas les tests mais l'installation — comparer les versions posées dans
      // node_modules à celles du lockfile avant de toucher à un chiffre ici.
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
      // 02/09/2026, deux fois le même effet : les six tables *_LABELS mortes
      // retirées de types/index.ts (chantier 10), puis `Card` adopté du socle
      // (chantier 3). Du code couvert à 100 % quitte l'app à chaque fois — le
      // ratio recule sans qu'un test ait disparu. Seuils recalés sur la mesure.
      // Remonté (+1,7 à +2,7 pt) le 06/09/2026 à l'adoption du magasin
      // VERSIONNÉ et de l'export/import de la base locale.
      // `src/store/storage.ts` est couvert à 100 % (statements, functions,
      // lines ; 100 % des branches), et l'écran des réglages gagne 10 tests :
      // export, aller-retour complet, refus d'un fichier étranger, refus d'un
      // fichier illisible, refus d'une version future, annulation, absence de
      // la carte en mode Supabase. Autrement dit, tout ce qui a été ajouté est
      // couvert — et deux branches inatteignables ont disparu au passage
      // (`exportState()` ne rend plus `null`, le catch n'a plus de repli
      // « ce n'était pas une Error »). Mesure au 06/09/2026 :
      // statements 1502/1996, branches 1222/1639, functions 542/765,
      // lines 1362/1799. Le `pct` d'istanbul étant TRONQUÉ à deux décimales,
      // le seuil peut valoir exactement le chiffre affiché.
      // Remonté encore (+0,02 à +0,05 pt) par `RemoteWriteNotice` : le motif
      // du garde d'écriture distante, rendu EN CLAIR au-dessus des listes dont
      // les corbeilles sont bloquées. Quatre tests, dont les deux branches qui
      // comptent — rien du tout avec le backend local même hors ligne, le
      // texte du motif hors ligne en mode Supabase. Tout ce qui est ajouté est
      // couvert. Mesure au 06/09/2026 : statements 1506/2000, branches
      // 1224/1641, functions 543/766, lines 1365/1802.
      // Remonté une troisième fois (+0,25 à +0,39 pt) par « Supprimer mon
      // compte ». `DangerZoneCard` est couvert à 100 % (statements, branches,
      // functions, lines) par neuf tests, dont les deux qui portent la
      // sécurité du geste : une adresse mal retapée n'efface RIEN, et une
      // session absente ne fait pas d'un champ vide une confirmation. Deux
      // tests de plus sur `AuthContext.deleteAccount` fixent l'ORDRE (la
      // session ne se ferme qu'APRÈS un succès) — la partie serveur, elle,
      // n'est pas mesurable ici : elle est prouvée par les 29 assertions
      // pgTAP de `supabase/tests/suppression-compte.test.sql`, jouées par
      // `.github/workflows/supabase-tests.yml`. Mesure au 06/09/2026, en CI
      // et sur un poste dont les binaires suivent le lockfile : statements
      // 1541/2035, branches 1266/1683, functions 553/776, lines 1398/1835.
      // (Les relevés locaux des trois entrées précédentes, du même jour,
      // sortent de la même installation abîmée et sont donc bas d'autant :
      // ils sont laissés tels quels, personne ne les a re-mesurés.)
      // RE-CALÉ le 13/09/2026 — et c'est le phénomène décrit CINQUANTE LIGNES
      // PLUS HAUT qui se produit, cette fois en CI.
      // La montée de librairies porte Vite 8.0 → 8.3, donc un `@rolldown`
      // plus récent. Or ce transformeur conserve DAVANTAGE de commentaires à
      // travers la transformation JSX : les `/* istanbul ignore next */` de
      // TeamDetailPage et MatchDetailPage survivent désormais, et chaque
      // indice qui survit fait RETIRER du rapport le sous-arbre qu'il annote —
      // du code entièrement couvert. Moins d'unités, toutes couvertes, donc un
      // ratio plus bas.
      // La preuve tient dans les chiffres eux-mêmes : la CI rend aujourd'hui
      // 75,67 / 74,83 / 71,18 / 76,13, c'est-à-dire EXACTEMENT ce que le
      // commentaire ci-dessus attribuait au poste mal installé du 06/09. Ce
      // n'était donc pas une installation abîmée mais une version d'avance —
      // le parc vient de la rattraper.
      // Aucun test n'a été retiré, aucune ligne de source ajoutée.
      // Mesure de la CI (run 34721874268), pas d'un relevé local : ce dépôt
      // porte `os=linux` dans son `.npmrc`, ses binaires natifs ne s'installent
      // pas sous Windows et `vitest` s'y arrête au démarrage.
      // RE-CALÉ le 13/09/2026, de DEUX CENTIÈMES DE POINT, au passage à
      // Vitest 5 : statements 75,67 → 75,66 et lines 76,13 → 76,12. Les deux
      // autres n'ont pas bougé d'un chiffre (74,83 et 71,18), et les 595 tests
      // passent — c'est ce qui identifie la cause.
      // Vitest 5 resserre ses globs de couverture (« include/exclude globs too
      // eager »). Une poignée d'unités quitte donc le rapport, et le ratio
      // bouge de la plus petite quantité représentable ici : le `pct`
      // d'istanbul est TRONQUÉ à deux décimales.
      // Ce dépôt est le SEUL du parc où ce seuil se voit : sur les six qui en
      // déclarent, il est le seul dont le script `test` porte `--coverage`.
      // Partout ailleurs `pwa-ci.yml@v4` lance `npm run test`, qui ne mesure
      // rien — les cinq autres cliquets ne sont vérifiés par aucun workflow.
      // Un seuil calé sur la mesure EXACTE ne tolère aucun mouvement : c'est
      // voulu ici, et c'est pourquoi il se re-cale à chaque fois qu'un
      // transformeur change d'avis sur les commentaires. Aucun test n'a été
      // retiré, aucune ligne de source ajoutée.
      // RE-CALÉ le 19/09/2026, et cette fois une LIGNE DE SOURCE a bien été
      // ajoutée : le `loader` de `ConsentBanner` (ADR 0012, passage à PostHog).
      // C'est une flèche que rien n'appelle en test — elle ne s'exécute qu'au
      // consentement, et l'appeler ici importerait vraiment `posthog-js` dans
      // jsdom pour ne rien prouver. Elle compte donc comme une fonction non
      // couverte, et le ratio baisse de trois centièmes : statements
      // 75,66 → 75,63, functions 71,18 → 71,09, lines 76,12 → 76,09. Branches
      // ne bouge pas — une flèche sans condition n'en crée aucune.
      // Ce dépôt est le seul du parc où ce seuil se voit (le seul dont le
      // script `test` porte `--coverage`) : ailleurs le même `loader` passe
      // inaperçu, faute de mesure.
      // Mesure de la CI (run 35404239375).
      // RE-CALÉ le 19/09/2026 (gestes métier) : six appels à `trackEvent`
      // posés dans des handlers, dont un porte le SEUL ternaire ajouté —
      // `isLive ? 'terminee' : 'demarree'` dans le suivi en direct. Les tests
      // n'en empruntent qu'un côté : branches 74,83 → 74,80. Une poignée de
      // lignes neuves n'est pas atteinte non plus : lines 76,09 → 76,08.
      // Statements et functions ne bougent pas — aucune fonction n'a été
      // ajoutée, c'est délibéré : sur ce dépôt, une flèche non couverte coûte
      // un dixième de point (voir la note du `loader` juste au-dessus).
      // RE-CALÉ le 20/09/2026 (le thème vient du socle) : `ThemeContext.tsx`
      // ne tient plus l'état à la main, il appelle `useTheme` du socle. 33
      // instructions et 10 fonctions, TOUTES couvertes, partent dans
      // `node_modules`, où rien ne les mesure ; l'adaptateur qui reste en
      // compte 10 et 2, couvertes aussi. Le dénominateur baisse plus que le
      // numérateur : statements 75,67 → 75,40, branches 74,89 → 74,74,
      // functions 71,11 → 70,82, lines 76,22 → 75,96 — mesure locale, égale
      // au centième à celle de la CI sur `main` (run 35511098087), stable
      // sur deux passes. Adopter le socle coûte ici du ratio, pas de la
      // couverture : le code parti était couvert, et le socle a ses tests.
      // La preuve, comme pour le `BottomNav` : le nombre d'unités NON
      // couvertes est rigoureusement identique avant/après — statements 506,
      // branches 423, functions 227, lines 446. Mesures : statements
      // 1574/2080 → 1551/2057 (−23 dont −23 couverts), branches 1262/1685 →
      // 1252/1675 (−10 dont −10), functions 559/786 → 551/778 (−8 dont −8),
      // lines 1430/1876 → 1410/1856 (−20 dont −20).
      // REMONTÉ le 25/09/2026 avec l'export PDF (feuille de match, rapport
      // d'assiduité, nom du club dans les réglages). Deux mouvements, dits
      // séparément parce qu'un seul est de cette branche.
      // Le premier était déjà sur `main` : la CI y mesurait 78,03 / 75,75 /
      // 72,87 / 78,35 (run 36066800092, et le poste, binaires au lockfile,
      // rend les mêmes chiffres au centième sur ce commit) quand les seuils
      // valaient encore 75,40 / 74,74 / 70,82 / 75,96 — le cliquet n'avait pas
      // suivi les tests arrivés depuis le 20/09.
      // Le second est l'export : `src/pdf/` et les trois composants qui
      // l'appellent (bouton, carte du rapport, champ du nom du club) sont
      // couverts à 100 % — statements, branches, functions — par 101 tests.
      // La preuve, comme au 20/09 : le nombre d'unités NON couvertes ne bouge
      // pas (statements 452, functions 211, lines 402) et baisse d'une pour
      // les branches (408 → 407, `StatsPage` sans équipe). Mesures :
      // statements 1606/2058 → 2046/2498, branches 1275/1683 → 1580/1987,
      // functions 567/778 → 668/879, lines 1455/1857 → 1852/2254.
      thresholds: {
        statements: 81.9,
        branches: 79.51,
        functions: 75.99,
        lines: 82.16,
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
