import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { useLocalStorage } from '@mister-guiiug/dev-pwa-config/react/use-local-storage';

interface BandeauDemoProps {
  /** Le mot qui reste visible, bandeau replié compris : « Démonstration ». */
  etiquette: string;
  /** Ce qu'il faut savoir, en une phrase, après l'étiquette. */
  message: string;
  /**
   * Où retenir « replié ». PRÉFIXÉE par l'application : tout le parc partage
   * une seule origine, donc un seul `localStorage` — une clé nue serait lue
   * par les sœurs.
   */
  cleStockage: string;
  className?: string;
}

/**
 * LE SITE PUBLIÉ EST UNE DÉMONSTRATION, ET L'ÉCRAN LE DIT.
 *
 * En production, `VITE_BACKEND` n'est pas posé : l'application tourne sur le
 * magasin local, sans compte ni serveur, et s'ouvre sur deux équipes U13
 * fictives. Seuls les Réglages le mentionnaient — un coach pouvait saisir sa
 * saison en croyant la partager avec son club.
 *
 * DISCRET, PAS ESCAMOTABLE. Le bandeau se replie (le choix est retenu), mais
 * replié il garde son étiquette : l'information reste à l'écran, à un appui
 * d'être relue. Un bouton à `aria-expanded`, et non un `<details>` : axe ne lit
 * pas l'intérieur d'un `<details>` fermé, et `open` au montage déclenche
 * `toggle`.
 *
 * Écrit à l'identique dans mister-family-map : le socle ne promeut un
 * composant que lorsque deux applications l'ont écrit chacune de leur côté.
 */
export function BandeauDemo({
  etiquette,
  message,
  cleStockage,
  className = '',
}: BandeauDemoProps) {
  const [replie, setReplie] = useLocalStorage(cleStockage, false);
  const Chevron = replie ? ChevronDown : ChevronUp;

  return (
    <div
      role="note"
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100 ${
        replie ? 'w-fit' : ''
      } ${className}`}
    >
      <button
        type="button"
        aria-expanded={!replie}
        onClick={() => setReplie(v => !v)}
        className="inline-flex min-h-6 items-center gap-1 font-semibold"
      >
        <Info size={14} aria-hidden="true" />
        {etiquette}
        <Chevron size={14} aria-hidden="true" />
      </button>
      {!replie && <span>{message}</span>}
    </div>
  );
}
