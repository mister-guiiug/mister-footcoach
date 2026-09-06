import { useRemoteWriteGuard } from '../hooks/useRemoteWriteGuard';

/**
 * Le motif du garde, EN CLAIR, à côté des gestes qu'il bloque.
 *
 * POURQUOI IL FALLAIT L'ÉCRIRE. `useRemoteWriteGuard` fait déjà le difficile :
 * il empêche une suppression de partir quand le réseau manque en mode
 * `supabase`, et il pose le motif en `aria-label` et en `title` sur la
 * corbeille. Mais toutes les suppressions de cette application sont des icônes
 * SANS TEXTE, et une infobulle ne s'ouvre qu'à la souris. Or on se sert de
 * cette application au bord d'un terrain, sur un téléphone : le doigt appuie,
 * rien ne se passe, et rien n'explique. C'est exactement le « bouton grisé
 * sans explication » que le garde du socle existe pour empêcher — le socle le
 * dit lui-même, et montre le remède dans son propre exemple :
 * `{garde.reason && <p role="status">{garde.reason}</p>}`.
 *
 * CE QUE CE N'EST PAS. Ce n'est pas un second bandeau hors-ligne :
 * `ConnectionBanner` annonce l'état du RÉSEAU tout en haut du document, une
 * fois. Celui-ci annonce la conséquence LOCALE, au niveau de la liste, et
 * seulement quand un geste y est effectivement bloqué. En mode local — le
 * défaut — le garde est inerte, `reason` vaut `null`, et rien ne s'affiche :
 * pas un pixel, pas un nœud dans l'arbre.
 *
 * `role="status"` et non `role="alert"` : le motif accompagne une tentative,
 * il n'interrompt pas. Il ne promet rien non plus — il n'y a pas de file
 * d'attente, et le dire serait mentir (ADR-003).
 */
export function RemoteWriteNotice() {
  const { reason } = useRemoteWriteGuard();
  if (reason === null) return null;

  return (
    <p
      role="status"
      className="rounded-xl border border-border-ui bg-surface-muted px-3 py-2 text-xs text-fg-muted"
    >
      {reason}
    </p>
  );
}
