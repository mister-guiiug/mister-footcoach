import {
  createContext,
  useCallback,
  useContext,
  useState,
  useTransition,
  type ComponentProps,
  type MouseEvent,
} from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  LoaderCircle,
  Users,
  Calendar,
  Dumbbell,
  Trophy,
  ClipboardList,
  Layers,
  BarChart3,
  BookOpen,
  Contact,
  Settings,
} from 'lucide-react';
import { BottomNav as SharedBottomNav } from '@mister-guiiug/dev-pwa-config/react/bottom-nav';
import type { BottomNavItem } from '@mister-guiiug/dev-pwa-config/react/bottom-nav';
import { useI18n } from '../../i18n';

/**
 * Barre de navigation basse — enveloppe du `BottomNav` du socle.
 *
 * NE RESTE ICI QUE CE QUI EST PROPRE À L'APP : les onze destinations, leurs
 * icônes et leurs libellés traduits. Le balisage, le repli sous « Plus », la
 * fermeture à Échap et l'état courant viennent du paquet.
 *
 * TROIS DÉFAUTS RÉPARÉS AU PASSAGE, tous relevés par le socle sur cette copie :
 *  1. le `<nav>` n'avait aucun nom accessible — deux repères anonymes sont
 *     indiscernables dans la liste d'un lecteur d'écran ;
 *  2. l'onglet courant n'était signalé que par l'encre et l'épaisseur du trait
 *     de l'icône (WCAG 1.4.1) — le socle y ajoute `aria-current`, un liseré et
 *     un « Page actuelle » lu mais non vu ;
 *  3. le bouton « Plus » ouvrait le tiroir sans `aria-expanded` ni
 *     `aria-controls`, et les entrées du tiroir étaient des `<button>` qui
 *     naviguaient à la main — ce sont maintenant de vrais liens, ouvrables
 *     dans un nouvel onglet et annoncés comme des liens.
 *
 * `currentPath` EST OBLIGATOIRE ICI. Le routeur est monté sur
 * `basename={import.meta.env.BASE_URL}` : en production `window.location.
 * pathname` vaut `/mister-footcoach/equipes` quand les destinations sont
 * écrites `/equipes`. Le repli du socle sur `location.pathname` ne
 * correspondrait donc à AUCUN onglet — et seulement en production, où
 * `BASE_URL` n'est plus `/`. `useLocation()` rend le chemin déjà débarrassé du
 * basename, ce que le test « l'onglet courant survit à un basename » vérifie.
 *
 * `Link` ET NON `NavLink` : l'état actif est calculé par le socle, qui ne
 * transmet pas `end` au composant de lien. Un `NavLink` le recalculerait avec
 * `end` à `false` et poserait son propre `aria-current` PAR-DESSUS celui du
 * socle (il le redéclare après le spread) — deux sources de vérité pour une
 * seule barre. Même choix, et pour la même raison, que mister-cim10.
 */

/**
 * Le geste de navigation de la barre, porté jusqu'au `linkComponent` du socle.
 *
 * POURQUOI UN CONTEXTE. `BottomNav` construit lui-même le `onClick` de chaque
 * lien — `onClick: () => { setMoreOpen(false); onNavigate?.(item); }`, SANS
 * l'événement — donc ni `preventDefault`, ni touche de modification, ni
 * transition ne peuvent passer par `onNavigate`. Le seul point d'entrée qui
 * reçoit l'événement est le composant de lien. Un contexte l'atteint sans
 * redéfinir le composant à chaque rendu (ce qui le remonterait, et perdrait le
 * focus au clavier).
 */
const NavigationDeLaBarre = createContext<{
  versLaPage: (e: MouseEvent<HTMLAnchorElement>, to: string) => void;
  enAttente: string | null;
} | null>(null);

function LienDeBarre({ to, onClick, ...reste }: ComponentProps<typeof Link>) {
  const barre = useContext(NavigationDeLaBarre);
  const cible = typeof to === 'string' ? to : '';
  return (
    <Link
      to={to}
      aria-busy={barre?.enAttente === cible || undefined}
      onClick={e => {
        onClick?.(e);
        barre?.versLaPage(e, cible);
      }}
      {...reste}
    />
  );
}

export function BottomNav() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [enCours, demarreLaTransition] = useTransition();
  const [ciblePendante, setCiblePendante] = useState<string | null>(null);

  /**
   * LA TRANSITION EST LA NÔTRE, et c'est tout l'intérêt.
   *
   * react-router 7 en ouvre déjà une de son côté — `startTransition(() =>
   * setStateImpl(newState))` dans son `BrowserRouter` — mais ne l'expose nulle
   * part hors d'un routeur de données. Or React 19 garde délibérément l'écran
   * déjà affiché pendant une transition : le repli de `<Suspense>` d'`App` ne
   * paraît donc JAMAIS sur un clic, seulement sur un atterrissage direct.
   * Mesuré à froid sur deux sites du parc le 20/09/2026 : 133 ms et 161 ms
   * d'écran figé, `aria-busy` faux d'un bout à l'autre.
   *
   * En pilotant `navigate` depuis ici, `enCours` reste vrai tant que le morceau
   * de la page n'est pas arrivé : c'est la seule information qui manquait.
   */
  const versLaPage = useCallback(
    (e: MouseEvent<HTMLAnchorElement>, to: string) => {
      // On laisse le navigateur faire son travail quand le visiteur le lui
      // demande : nouvel onglet, nouvelle fenêtre, enregistrement de la cible.
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }
      e.preventDefault();
      setCiblePendante(to);
      demarreLaTransition(() => navigate(to));
    },
    [navigate]
  );

  // Les quatre premières restent visibles ; les sept suivantes passent sous le
  // bouton « Plus » (`maxVisible` vaut 5, dont une place pour ce bouton).
  const items: BottomNavItem[] = [
    {
      href: '/',
      label: t('nav.home'),
      icon: <LayoutDashboard size={20} />,
      end: true,
    },
    { href: '/equipes', label: t('nav.teams'), icon: <Users size={20} /> },
    { href: '/matchs', label: t('nav.matches'), icon: <Calendar size={20} /> },
    {
      href: '/entrainements',
      label: t('nav.trainingsShort'),
      icon: <Dumbbell size={20} />,
    },
    {
      href: '/tournois',
      label: t('nav.tournaments'),
      icon: <Trophy size={18} />,
    },
    {
      href: '/sondages',
      label: t('nav.surveys'),
      icon: <ClipboardList size={18} />,
    },
    {
      href: '/compositions',
      label: t('nav.lineups'),
      icon: <Layers size={18} />,
    },
    {
      href: '/statistiques',
      label: t('nav.stats'),
      icon: <BarChart3 size={18} />,
    },
    {
      href: '/exercices',
      label: t('nav.exercises'),
      icon: <BookOpen size={18} />,
    },
    {
      href: '/contacts',
      label: t('nav.contacts'),
      icon: <Contact size={18} />,
    },
    {
      href: '/parametres',
      label: t('nav.settings'),
      icon: <Settings size={18} />,
    },
  ];

  return (
    <NavigationDeLaBarre.Provider
      value={{ versLaPage, enAttente: enCours ? ciblePendante : null }}
    >
      <SharedBottomNav
        // LA PASTILLE DE L'ENTRÉE CLIQUÉE TOURNE pendant que son morceau
        // arrive. C'est le seul retour visible : le repli de `Suspense` ne
        // paraîtra pas, React 19 gardant l'écran courant le temps de la
        // transition.
        items={items.map(item =>
          enCours && ciblePendante === item.href
            ? {
                ...item,
                icon: <LoaderCircle size={20} className="animate-spin" />,
              }
            : item
        )}
        currentPath={pathname}
        label={t('nav.label')}
        moreLabel={t('nav.more')}
        // Le socle 3.32.0 a élargi `linkComponent` à `ComponentType<any>` : le
        // type refusait jusque-là tout composant à prop OBLIGATOIRE, donc
        // précisément `Link` et son `to` — l'usage que sa propre documentation
        // donne en exemple. Sept apps portaient la même conversion ; elle n'a
        // plus lieu d'être.
        linkComponent={LienDeBarre}
        hrefProp="to"
        className="fixed bottom-0 left-0 right-0 z-40"
      />
      {/* HORS DES LIENS, pour ne pas changer leur nom accessible en cours de
          route : un lecteur d'écran annoncerait « Équipes, chargement… » puis
          « Équipes », sur le lien qui a le focus. */}
      <span className="sr-only" role="status" aria-live="polite">
        {enCours ? t('nav.loading') : ''}
      </span>
    </NavigationDeLaBarre.Provider>
  );
}
