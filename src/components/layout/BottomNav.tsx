import type { ComponentType } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
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
import { BottomNav as SharedBottomNav } from '@mister-guiiug/dev-wpa-config/react/bottom-nav';
import type { BottomNavItem } from '@mister-guiiug/dev-wpa-config/react/bottom-nav';
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
export function BottomNav() {
  const { t } = useI18n();
  const { pathname } = useLocation();

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
    <SharedBottomNav
      items={items}
      currentPath={pathname}
      label={t('nav.label')}
      moreLabel={t('nav.more')}
      // `linkComponent` est typé `ComponentType<Record<string, unknown>>`, qui
      // refuse un composant à prop obligatoire — donc `Link` et son `to`,
      // alors que c'est l'usage documenté du socle. La conversion est sûre :
      // `hrefProp` fournit précisément `to`. Même motif que les quatre apps
      // déjà migrées (miss-genius, miss-lookhouse, miss-supaboss, mister-cim10).
      linkComponent={Link as unknown as ComponentType<Record<string, unknown>>}
      hrefProp="to"
      className="fixed bottom-0 left-0 right-0 z-40"
    />
  );
}
