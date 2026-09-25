import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import {
  AppContext,
  EMPTY_APP_STATE,
  reducer,
  useCurrentUser,
  useNotificationPreferences,
  useNotifications,
  useUnreadNotificationCount,
  type AppState,
} from './AppContext';

/**
 * LE STORE, VU DU MODE CONNECTÉ : qui est connecté, et l'intention du joueur.
 *
 * `BACKEND` est forcé à `supabase`, et la session doublée : en mode local,
 * l'utilisateur est figé (`CURRENT_USER_ID`), et les autres fichiers de test
 * le tiennent déjà.
 */
vi.mock('../backend/config', () => ({ BACKEND: 'supabase' }));
const session = vi.hoisted(() => ({ userId: null as string | null }));
vi.mock('../auth/AuthContext', () => ({
  useSessionUserId: () => session.userId,
}));

const BASE: AppState = {
  ...EMPTY_APP_STATE,
  users: [
    {
      id: 'u1',
      authId: 'auth-coach',
      email: 'coach@exemple.fr',
      firstName: 'Éric',
      lastName: 'Coach',
      roles: ['coach'],
      teamIds: ['t1'],
    },
    {
      id: 'u-kid',
      authId: 'auth-kid',
      email: 'lucas@exemple.fr',
      firstName: 'Lucas',
      lastName: 'Dupont',
      roles: ['player'],
      teamIds: [],
      playerId: 'p1',
    },
  ],
  notifications: [
    {
      id: 'n1',
      userId: 'u1',
      type: 'match_nouveau',
      message: 'Pour le coach',
      read: false,
      createdAt: '2026-09-01T10:00:00Z',
    },
    {
      id: 'n2',
      userId: 'u9',
      type: 'match_nouveau',
      message: 'Pour un autre',
      read: false,
      createdAt: '2026-09-01T11:00:00Z',
    },
  ],
  notificationPreferences: {
    u1: { enabled: false, mutedCategories: [], reminderDelay: 'J-2' },
  },
};

function Sonde() {
  const me = useCurrentUser();
  const notifications = useNotifications();
  const unread = useUnreadNotificationCount();
  const prefs = useNotificationPreferences();
  return (
    <>
      <p>moi : {me?.id ?? 'personne'}</p>
      <p>notifications : {notifications.map(n => n.id).join(',')}</p>
      <p>non lues : {unread}</p>
      <p>rappel : {prefs.reminderDelay}</p>
    </>
  );
}

function monter(children: ReactNode = <Sonde />) {
  return render(
    <AppContext.Provider value={{ state: BASE, dispatch: vi.fn() }}>
      {children}
    </AppContext.Provider>
  );
}

describe('qui est connecté, en mode supabase', () => {
  beforeEach(() => {
    session.userId = null;
  });

  it('la SESSION désigne la fiche, par `authId` — pas la constante du mode local', () => {
    session.userId = 'auth-coach';
    monter();
    expect(screen.getByText('moi : u1')).toBeInTheDocument();
    // Ses notifications, ses préférences : les siennes, pas celles d'un autre.
    expect(screen.getByText('notifications : n1')).toBeInTheDocument();
    expect(screen.getByText('non lues : 1')).toBeInTheDocument();
    expect(screen.getByText('rappel : J-2')).toBeInTheDocument();
  });

  it('un compte joueur est reconnu comme tel', () => {
    session.userId = 'auth-kid';
    monter();
    expect(screen.getByText('moi : u-kid')).toBeInTheDocument();
    expect(screen.getByText('notifications :')).toBeInTheDocument();
  });

  it('sans session, ou sans fiche rattachée : personne — et surtout pas la première fiche venue', () => {
    monter();
    expect(screen.getByText('moi : personne')).toBeInTheDocument();
    expect(screen.getByText('non lues : 0')).toBeInTheDocument();
    // Les préférences par défaut, pas celles d'un autre compte.
    expect(screen.getByText('rappel : J-1')).toBeInTheDocument();
  });

  it('une session inconnue du club ne désigne personne', () => {
    session.userId = 'auth-inconnu';
    monter();
    expect(screen.getByText('moi : personne')).toBeInTheDocument();
  });
});

describe('SET_PLAYER_INTENTION', () => {
  const avecReponse: AppState = {
    ...EMPTY_APP_STATE,
    surveyResponses: [
      {
        id: 'sr1',
        surveyId: 'sv1',
        playerId: 'p1',
        confirmationParent: 'absent',
        dateConfirmationParent: '2026-09-01',
      },
    ],
  };

  it('met à jour SON intention, et rien d’autre : la confirmation du parent ne bouge pas', () => {
    const next = reducer(avecReponse, {
      type: 'SET_PLAYER_INTENTION',
      surveyId: 'sv1',
      playerId: 'p1',
      value: 'present',
    });
    expect(next.surveyResponses).toHaveLength(1);
    expect(next.surveyResponses[0]).toMatchObject({
      id: 'sr1',
      intentionJoueur: 'present',
      confirmationParent: 'absent',
      dateConfirmationParent: '2026-09-01',
    });
    expect(next.surveyResponses[0]!.dateIntentionJoueur).toMatch(
      /^\d{4}-\d{2}-\d{2}$/
    );
  });

  it('crée la ligne quand personne n’a encore répondu', () => {
    const next = reducer(avecReponse, {
      type: 'SET_PLAYER_INTENTION',
      surveyId: 'sv2',
      playerId: 'p1',
      value: 'incertain',
    });
    expect(next.surveyResponses).toHaveLength(2);
    expect(next.surveyResponses[1]).toMatchObject({
      surveyId: 'sv2',
      playerId: 'p1',
      intentionJoueur: 'incertain',
    });
    expect(next.surveyResponses[1]!.confirmationParent).toBeUndefined();
  });

  describe('dans un build local', () => {
    afterEach(() => vi.unstubAllEnvs());

    it('ne fait rien : seule la page du joueur l’envoie, et elle n’y existe pas', () => {
      vi.stubEnv('MODE', 'production');
      vi.stubEnv('VITE_BACKEND', 'local');
      const next = reducer(avecReponse, {
        type: 'SET_PLAYER_INTENTION',
        surveyId: 'sv1',
        playerId: 'p1',
        value: 'present',
      });
      expect(next).toBe(avecReponse);
    });
  });

  it('ne touche pas la réponse d’un autre joueur au même sondage', () => {
    const next = reducer(avecReponse, {
      type: 'SET_PLAYER_INTENTION',
      surveyId: 'sv1',
      playerId: 'p2',
      value: 'absent',
    });
    expect(next.surveyResponses[0]!.intentionJoueur).toBeUndefined();
    expect(next.surveyResponses).toHaveLength(2);
  });
});
