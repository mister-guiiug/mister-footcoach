import { createContext, useContext, type ReactNode } from 'react';
import {
  useTheme as useDwcTheme,
  type ResolvedTheme,
  type ThemePreference,
} from '@mister-guiiug/dev-pwa-config/react/use-theme';

/** La clé de toujours — celle que lit aussi l'IIFE anti-FOUC d'`index.html`. */
const STORAGE_KEY = 'mister_footcoach_theme';

type Theme = ThemePreference;

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: ResolvedTheme;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Le thème de l'app, bâti sur `useTheme` du socle (`react/use-theme`).
 *
 * CE QUI DISPARAÎT. Ce fichier tenait à la main la préférence (`useState` +
 * `localStorage`), la résolution `system → dark | light`, l'abonnement à
 * `matchMedia`, la classe `dark` et `style.colorScheme` sur `<html>`. Les cinq
 * sont dans le hook du socle. Ne reste ici que le contexte qui PARTAGE cet
 * état entre les écrans : le hook porte le sien dans un `useState` local, et
 * deux appels seraient deux états qui écriraient tous deux la classe sur
 * `<html>`. Appelé UNE fois, ici, il n'y a qu'un écrivain côté React — l'IIFE
 * anti-FOUC d'`index.html` étant l'autre, avant tout rendu.
 *
 * POURQUOI LE HOOK, ET PAS `react/theme-provider`. Le fournisseur du socle
 * ferait la même chose — mais il importe le catalogue des dix-sept palettes
 * (`themes.js`, 26 ko bruts) par un `import()` que le `manualChunks` de
 * `vite.config.ts` replie dans `vendor`, qui est PRÉCHARGÉ : mesuré à +5,1 kB
 * gzip préchargés (163,1 → 168,2) pour zéro variable peinte, cette app ayant
 * ses propres jetons (`index.css`). Le hook seul n'importe rien de tel.
 *
 * CE QUI EST GARDÉ, ET DIT :
 * - `storageKey` : la même clé `mister_footcoach_theme`, celle que lit l'IIFE.
 *   Pas de `legacyKeys` — il n'y a pas d'ancienne clé, la préférence de chaque
 *   utilisateur est relue telle quelle.
 * - `attribute: 'class'` : la classe `dark` sur `<html>`, PAS `data-theme` —
 *   `index.css` déclare `@custom-variant dark (&:where(.dark, .dark *))` et
 *   redéfinit ses variables sous `html.dark` ; l'IIFE pose la même classe.
 * - la même API pour les écrans (`SettingsPage`) : `theme`, `setTheme`,
 *   `resolvedTheme` — le socle nomme le dernier `resolved` et expose en plus
 *   `toggle`, dont rien ici n'a l'usage.
 *
 * CE QUI CHANGE, EN MIEUX : une valeur stockée hors `light | dark | system`
 * (clé corrompue, écriture étrangère) retombe sur `system` au lieu de se
 * propager telle quelle dans `colorScheme`.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme, resolved, setTheme } = useDwcTheme({
    storageKey: STORAGE_KEY,
    attribute: 'class',
  });
  return (
    <ThemeContext value={{ theme, setTheme, resolvedTheme: resolved }}>
      {children}
    </ThemeContext>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
