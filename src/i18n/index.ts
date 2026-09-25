import { createI18n } from '@mister-guiiug/dev-pwa-config/react/i18n';
import { BACKEND } from '../backend/config';
import { messages, type Locale } from './messages';
import { connectedMessages } from './messages.connected';

export type { Locale, Messages } from './messages';

type Catalog = (typeof messages)['fr'] & (typeof connectedMessages)['fr'];

/**
 * LE CATALOGUE DU MODE CONNECTÉ N'ENTRE QU'EN MODE CONNECTÉ. `BACKEND` est une
 * constante de build : en mode local (le défaut, et la production), le
 * bundler replie la condition, `connectedMessages` n'est plus référencé, et
 * ses libellés — inscription, page du joueur, invitations, push — ne pèsent
 * rien sur le premier chargement. La fusion est groupe par groupe : les deux
 * fichiers n'ont aucun groupe en commun.
 *
 * Le type, lui, porte toujours les deux : un écran du mode connecté se
 * vérifie à la compilation comme les autres. En mode local, ces écrans ne
 * sont jamais rendus — et une clé absente se lirait telle quelle, sans lever.
 */
const catalog = (BACKEND === 'supabase'
  ? {
      fr: { ...messages.fr, ...connectedMessages.fr },
      en: { ...messages.en, ...connectedMessages.en },
    }
  : messages) as unknown as Record<Locale, Catalog>;

export const { I18nProvider, useI18n } = createI18n({
  messages: catalog,
  locales: ['fr', 'en'],
  fallbackLocale: 'fr',
  storageKey: 'footcoach_locale',
});
