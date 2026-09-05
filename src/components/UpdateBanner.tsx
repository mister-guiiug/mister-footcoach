import { registerSW } from 'virtual:pwa-register';
import { UpdatePromptBanner } from '@mister-guiiug/dev-pwa-config/react/update-prompt-banner';
import { useI18n } from '../i18n';

/**
 * Bandeau « Mise à jour disponible ». Le balisage, l'état et l'application de
 * la mise à jour viennent du socle ; ce fichier ne fait plus que du câblage :
 *
 *  - `registerSW` INJECTÉ depuis `virtual:pwa-register`. C'est lui qui pose les
 *    écouteurs du service worker : sans cette prop, `needRefresh` reste faux et
 *    le bandeau ne s'affiche jamais (il compile pourtant sans broncher) ;
 *  - les libellés pris dans l'i18n de l'app, qui parle français ET anglais,
 *    alors que le socle ne retomberait que sur le français faute de
 *    `LabelsProvider` monté ici ;
 *  - le positionnement, seule chose que `components.css` ne fixe pas.
 *
 * `snoozeHours` reste à 0 : le bouton secondaire masque le bandeau pour la
 * session, il ne le reporte pas dans `localStorage`. Écarter la mise à jour
 * pour N heures garderait une version périmée entre les mains de l'utilisateur
 * au prochain lancement ; là, le bandeau revient.
 */
export function UpdateBanner() {
  const { t } = useI18n();

  return (
    <UpdatePromptBanner
      registerSW={registerSW}
      title={t('update.available')}
      updateLabel={t('update.refresh')}
      updatingLabel={t('update.refreshing')}
      dismissLabel={t('update.dismiss')}
      className="fixed bottom-4 left-1/2 z-50 max-w-[calc(100vw-2rem)] -translate-x-1/2"
    />
  );
}
