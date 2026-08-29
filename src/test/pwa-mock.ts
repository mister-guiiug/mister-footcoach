// Doublure de `virtual:pwa-register` (module virtuel de vite-plugin-pwa,
// inexistant hors build Vite) : l'alias de vitest.config.ts pointe ici pour
// que l'import de UpdateBanner se résolve sous Vitest. À l'exécution, le
// vi.mock du setup partagé (@mister-guiiug/dev-wpa-config/vitest-setup)
// reprend la main.
export const registerSW = () => () => Promise.resolve();
