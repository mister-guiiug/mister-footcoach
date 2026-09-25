/**
 * Livrer le PDF : la feuille de partage du système quand elle prend des
 * fichiers, le téléchargement sinon. Motif repris de miss-uwh (bilan PDF).
 *
 * POURQUOI LE PARTAGE D'ABORD. Au bord du terrain, le coach n'a qu'un
 * téléphone ; ce qu'il veut, c'est envoyer la feuille dans le groupe des
 * parents ou au dirigeant, pas la retrouver dans un dossier « Téléchargements ».
 *
 * `canShare({ files })` EST EXIGÉ, pas seulement consulté : sans lui, rien ne
 * dit que la plateforme accepte des fichiers, et `navigator.share` lèverait.
 *
 * `navigator.share` EST APPELÉ DIRECTEMENT, et non par `shareOrCopy` du socle
 * comme dans miss-uwh. Sur un refus autre que l'annulation (activation
 * utilisateur expirée, plateforme qui décline), `shareOrCopy` COPIE le titre
 * dans le presse-papiers avant de rendre la main : un effet de bord que
 * personne n'a demandé, sur un export de fichier. Ici, ce refus mène au
 * téléchargement, et à rien d'autre.
 *
 * L'ANNULATION N'EST PAS UN ÉCHEC : l'utilisateur a fermé la feuille de
 * partage, il a changé d'avis. Rien n'est téléchargé dans son dos.
 */
import { downloadPdf } from '@mister-guiiug/dev-pwa-config/pdf';

export type PdfOutcome = 'shared' | 'cancelled' | 'downloaded' | 'failed';

export async function shareOrDownloadPdf(
  bytes: Uint8Array,
  filename: string,
  title: string
): Promise<PdfOutcome> {
  // `share` et `canShare` sont typés présents ; ils manquent pourtant sur
  // plusieurs navigateurs de bureau (Firefox, Chrome sous Linux).
  const nav = globalThis.navigator as Partial<Navigator>;
  if (typeof nav.share === 'function' && typeof nav.canShare === 'function') {
    const file = new File([bytes as BlobPart], filename, {
      type: 'application/pdf',
    });
    const data: ShareData = { title, files: [file] };
    if (nav.canShare(data)) {
      try {
        await nav.share(data);
        return 'shared';
      } catch (error) {
        if ((error as Error).name === 'AbortError') return 'cancelled';
      }
    }
  }
  return downloadPdf(bytes, filename) ? 'downloaded' : 'failed';
}
