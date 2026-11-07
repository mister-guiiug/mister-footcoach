import { Link, useLocation, useNavigate } from 'react-router-dom';
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
 *
 * `navigate` : LA BARRE PILOTE LA NAVIGATION DANS SA PROPRE TRANSITION.
 * react-router 7 enveloppe déjà tout changement d'URL dans `startTransition`,
 * sans l'exposer hors d'un routeur de données ; or React 19 garde l'écran
 * affiché pendant une transition, et le repli de `<Suspense>` d'`App` ne
 * paraît donc jamais sur un clic. Mesuré à froid sur deux sites du parc le
 * 20/09/2026 : 133 ms et 161 ms d'écran figé, `aria-busy` faux d'un bout à
 * l'autre. En pilotant `navigate`, la barre sait que le morceau de la page
 * n'est pas arrivé : l'entrée cliquée porte `aria-busy`, son icône cède la
 * place à la pastille qui tourne (rôle `busy` du jeu lucide monté dans
 * `main.tsx`), une zone vive annonce le chargement HORS des liens, et un clic
 * à modificateur (nouvel onglet) reste au navigateur.
 *
 * Ce fichier le faisait lui-même jusqu'ici : un `linkComponent` maison, un
 * contexte pour lui porter le geste, sa transition, sa zone vive. Le socle
 * construisait alors le `onClick` de chaque lien SANS l'évènement, et quatre
 * apps du parc avaient écrit ce même contournement ; il l'a remonté dans la
 * barre (`navigate`). Les tests de `BottomNav.nav.test.tsx` tiennent le même
 * contrat qu'avant.
 */
export function BottomNav() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const navigate = useNavigate();

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
      linkComponent={Link}
      hrefProp="to"
      navigate={navigate}
      className="fixed bottom-0 left-0 right-0 z-40"
    />
  );
}
