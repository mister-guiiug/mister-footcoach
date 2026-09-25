import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { Button } from '@mister-guiiug/dev-pwa-config/react/button';
import { GESTES, trackEvent } from '@mister-guiiug/dev-pwa-config/analytics';
import { recordError } from '@mister-guiiug/dev-pwa-config/react/observability';
import type { PdfOutcome } from '../../../pdf/deliver';
import { useI18n } from '../../../i18n';

interface PdfExportButtonProps {
  /**
   * Fabrique et livre le PDF. C'est l'appelant qui charge `src/pdf` par
   * `import()` ici même : le module n'est téléchargé qu'au clic.
   */
  onExport: () => Promise<PdfOutcome>;
  /**
   * Nom accessible. Il COMMENCE par le libellé visible (« Exporter en PDF :
   * feuille de match ») : la commande vocale « clique sur Exporter en PDF »
   * doit trouver le bouton (WCAG 2.5.3).
   */
  ariaLabel: string;
  /** Le type de document, pour la mesure — jamais son contenu. */
  objet: 'feuille_de_match' | 'rapport_assiduite';
  /** Bloque le bouton sans lui retirer le focus (motif affiché à côté). */
  blocked?: boolean;
  /** Identifiant de l'élément qui dit pourquoi le bouton est bloqué. */
  describedBy?: string;
}

/**
 * « Exporter en PDF » : un bouton, et une zone d'état qui dit ce qui s'est
 * RÉELLEMENT passé — partagé, téléchargé, ou échoué. Elle existe dès le
 * premier rendu, vide : une région `status` insérée au moment du message
 * n'est pas toujours annoncée par les lecteurs d'écran.
 */
export function PdfExportButton({
  onExport,
  ariaLabel,
  objet,
  blocked = false,
  describedBy,
}: PdfExportButtonProps) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<PdfOutcome | null>(null);

  async function run() {
    setBusy(true);
    setOutcome(null);
    let result: PdfOutcome;
    try {
      result = await onExport();
    } catch (error) {
      // Le morceau PDF introuvable (déploiement entre deux clics, réseau
      // coupé sans précache) ou une donnée qui fait lever la mise en page :
      // l'utilisateur le lit, et l'erreur remonte à l'observabilité.
      recordError(error, { source: 'export-pdf', objet });
      result = 'failed';
    }
    /*
     * L'ISSUE, PAS LE CLIC — comme le bilan PDF de miss-uwh : `shared`,
     * `downloaded` et `failed` ne disent pas la même chose, et compter le
     * clic masquerait les échecs. `cancelled` ne compte rien : l'utilisateur
     * a fermé la feuille de partage, c'est un non-geste.
     *
     * NI ÉQUIPE, NI ADVERSAIRE, NI JOUEUR : des mineurs figurent sur ces
     * documents. Le type de document et l'issue suffisent.
     */
    if (result !== 'cancelled') {
      trackEvent(GESTES.EXPORT, { format: 'pdf', objet, issue: result });
    }
    setOutcome(result);
    setBusy(false);
  }

  const message = busy
    ? t('pdf.exporting')
    : outcome && outcome !== 'cancelled'
      ? t(`pdf.outcome.${outcome}`)
      : '';

  return (
    <div>
      <Button
        variant="secondary"
        block
        loading={busy}
        aria-disabled={blocked || undefined}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        onClick={() => void run()}
      >
        <FileDown size={16} aria-hidden="true" />
        {t('pdf.export')}
      </Button>
      <p
        role="status"
        className={`mt-2 text-xs ${
          outcome === 'failed'
            ? 'text-red-600 dark:text-red-400'
            : 'text-fg-muted'
        }`}
      >
        {message}
      </p>
    </div>
  );
}
