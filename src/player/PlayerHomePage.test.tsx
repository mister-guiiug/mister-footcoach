import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '../i18n';
import {
  AppContext,
  EMPTY_APP_STATE,
  type AppState,
} from '../store/AppContext';
import type { Match, Survey, SurveyResponse, Training } from '../types';

/**
 * LA PAGE DU JOUEUR — ce qu'elle montre, ce qu'elle écrit, et ce qu'elle dit
 * de la réponse du parent.
 *
 * Le store est posé à la main (`AppContext.Provider`) : c'est ce que
 * `SupabaseAppProvider` lui donnerait, la base ayant déjà filtré. Et la page
 * filtre ENCORE par équipe — un test l'éprouve avec des lignes qu'elle ne
 * devrait jamais recevoir.
 */
vi.mock('../backend/config', () => ({ BACKEND: 'supabase' }));
const signOut = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock('../auth/AuthContext', () => ({
  useSessionUserId: () => 'auth-kid',
  useAuth: () => ({ signOut }),
}));

import PlayerHomePage from './PlayerHomePage';

const FUTURE = '2099-01-08';
const PAST = '2000-01-08';

function survey(p: Partial<Survey> & Pick<Survey, 'id' | 'teamId'>): Survey {
  return {
    sessionType: 'libre',
    question: 'Question ?',
    deadline: '2099-01-10',
    status: 'ouvert',
    sendNotification: false,
    createdBy: 'u1',
    ...p,
  };
}

function match(p: Partial<Match> & Pick<Match, 'id' | 'teamId'>): Match {
  return {
    seasonId: 's1',
    date: FUTURE,
    time: '10:00',
    location: 'Stade',
    address: '1 rue du Stade',
    isHome: true,
    opponent: 'FC Voisin',
    status: 'saison',
    phase: 'Phase 1',
    liveActive: false,
    ...p,
  };
}

function training(
  p: Partial<Training> & Pick<Training, 'id' | 'teamId'>
): Training {
  return {
    date: FUTURE,
    time: '18:00',
    duration: 90,
    type: 'regulier',
    cancelled: false,
    ...p,
  };
}

const KID_STATE: AppState = {
  ...EMPTY_APP_STATE,
  users: [
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
  players: [
    {
      id: 'p1',
      firstName: 'Lucas',
      lastName: 'Dupont',
      dateOfBirth: '2013-03-15',
      primaryTeamId: 't1',
      secondaryTeamId: 't2',
      preferredPosition: 'GK',
      appetences: {},
      active: true,
    },
  ],
  teams: [
    {
      id: 't1',
      name: 'U13 A',
      category: 'U13',
      coachId: 'u1',
      seasonId: 's1',
      color: '#16a34a',
    },
    {
      id: 't2',
      name: 'U15 B',
      category: 'U15',
      coachId: 'u2',
      seasonId: 's1',
      color: '#2563eb',
    },
  ],
  surveys: [
    survey({ id: 'sv-samedi', teamId: 't1', question: 'Présent samedi ?' }),
    survey({
      id: 'sv-tournoi',
      teamId: 't2',
      question: 'Tournoi dimanche ?',
      deadline: '2099-01-05',
    }),
    survey({
      id: 'sv-ferme',
      teamId: 't1',
      question: 'Fermé ?',
      status: 'ferme',
    }),
    survey({ id: 'sv-ailleurs', teamId: 't3', question: 'Autre équipe ?' }),
  ],
  surveyResponses: [
    {
      id: 'sr1',
      surveyId: 'sv-samedi',
      playerId: 'p1',
      intentionJoueur: 'present',
      confirmationParent: 'absent',
    },
    // Une ligne telle que Postgres la rend : des `null`, pas des absents.
    {
      id: 'sr2',
      surveyId: 'sv-tournoi',
      playerId: 'p1',
      intentionJoueur: null,
      confirmationParent: null,
    } as unknown as SurveyResponse,
  ],
  matches: [
    match({ id: 'm1', teamId: 't1', meetingTime: '09:15' }),
    match({
      id: 'm2',
      teamId: 't2',
      opponent: 'AS Loin',
      isHome: false,
      location: '',
      date: '2099-01-09',
      status: 'annule',
    }),
    match({ id: 'm-passe', teamId: 't1', opponent: 'Ancien', date: PAST }),
    match({ id: 'm-ailleurs', teamId: 't3', opponent: 'Ailleurs' }),
  ],
  trainings: [
    training({ id: 'tr1', teamId: 't1', theme: 'Passes' }),
    training({ id: 'tr2', teamId: 't1', cancelled: true, date: '2099-01-11' }),
  ],
};

const dispatch = vi.fn();

function monter(state: AppState = KID_STATE) {
  return render(
    <I18nProvider>
      <AppContext.Provider value={{ state, dispatch }}>
        <PlayerHomePage />
      </AppContext.Provider>
    </I18nProvider>
  );
}

describe('la page du joueur', () => {
  beforeEach(() => {
    dispatch.mockClear();
    signOut.mockClear();
  });

  it('le salue, et nomme ses équipes', () => {
    monter();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Salut Lucas 👋' })
    ).toBeInTheDocument();
    expect(screen.getByText('U13 A · U15 B')).toBeInTheDocument();
  });

  it('ne montre que les sondages OUVERTS de SES équipes, par échéance', () => {
    monter();
    const sondages = screen.getByRole('region', { name: 'Mes sondages' });
    const titres = within(sondages)
      .getAllByRole('heading', { level: 3 })
      .map(h => h.textContent);
    expect(titres).toEqual(['Tournoi dimanche ?', 'Présent samedi ?']);
  });

  it('marque SON intention, et dit la confirmation du parent — qui prévaut', () => {
    monter();
    const samedi = screen.getByRole('group', { name: 'Présent samedi ?' });
    expect(
      within(samedi).getByRole('button', { name: 'Présent' })
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(samedi).getByRole('button', { name: 'Absent' })
    ).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByText('Confirmé par ton parent : Absent')
    ).toBeInTheDocument();
    // La divergence du § 15.5, vue de son côté.
    expect(
      screen.getByText(
        "Ton parent a répondu autrement : c'est sa réponse qui compte."
      )
    ).toBeInTheDocument();
  });

  it('lit une ligne de Postgres (des null) comme « pas encore répondu »', () => {
    monter();
    const tournoi = screen.getByRole('group', { name: 'Tournoi dimanche ?' });
    for (const bouton of within(tournoi).getAllByRole('button')) {
      expect(bouton).toHaveAttribute('aria-pressed', 'false');
    }
    expect(
      screen.getByText("Ton parent n'a pas encore confirmé.")
    ).toBeInTheDocument();
    // Une seule divergence à l'écran : celle de samedi.
    expect(screen.getAllByText(/Ton parent a répondu autrement/)).toHaveLength(
      1
    );
  });

  it('un appui dit SON intention, pour SA fiche', async () => {
    monter();
    const tournoi = screen.getByRole('group', { name: 'Tournoi dimanche ?' });
    await userEvent.click(
      within(tournoi).getByRole('button', { name: 'Incertain' })
    );
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SET_PLAYER_INTENTION',
      surveyId: 'sv-tournoi',
      playerId: 'p1',
      value: 'incertain',
    });
  });

  it('liste ses prochains matchs et entraînements, annulés compris et signalés', () => {
    monter();
    const evenements = screen.getByRole('region', {
      name: 'Mes prochains événements',
    });
    // Dans l'ordre du calendrier : match du 8 à 10 h, entraînement du 8 à
    // 18 h, match du 9, entraînement du 11.
    const items = within(evenements).getAllByRole('listitem');
    expect(items).toHaveLength(4);

    expect(
      within(items[0]!).getByText('Match contre FC Voisin')
    ).toBeInTheDocument();
    expect(
      within(items[0]!).getByText('À domicile — Stade')
    ).toBeInTheDocument();
    expect(
      within(items[0]!).getByText('Rendez-vous à 09:15')
    ).toBeInTheDocument();
    expect(within(items[1]!).getByText('Passes')).toBeInTheDocument();
    expect(
      within(items[2]!).getByText('Match contre AS Loin')
    ).toBeInTheDocument();
    expect(within(items[2]!).getByText("À l'extérieur")).toBeInTheDocument();
    expect(within(items[2]!).getByText('Annulé')).toBeInTheDocument();
    expect(within(items[3]!).getByText('Entraînement')).toBeInTheDocument();
    expect(within(items[3]!).getByText('Annulé')).toBeInTheDocument();

    // Ni le passé, ni une autre équipe.
    expect(screen.queryByText(/Ancien/)).toBeNull();
    expect(screen.queryByText(/Ailleurs/)).toBeNull();
  });

  it('chaque intention se lit, quelle qu’elle soit', () => {
    monter({
      ...KID_STATE,
      // Une équipe secondaire absente de l'état : elle ne s'écrit pas.
      teams: KID_STATE.teams.filter(tm => tm.id === 't1'),
      surveys: [
        ...KID_STATE.surveys,
        survey({ id: 'sv-mardi', teamId: 't1', question: 'Mardi ?' }),
      ],
      surveyResponses: [
        {
          id: 'sr1',
          surveyId: 'sv-samedi',
          playerId: 'p1',
          intentionJoueur: 'absent',
        },
        {
          id: 'sr3',
          surveyId: 'sv-mardi',
          playerId: 'p1',
          intentionJoueur: 'incertain',
        },
      ],
    });
    expect(screen.getByText('U13 A')).toBeInTheDocument();
    expect(
      within(screen.getByRole('group', { name: 'Présent samedi ?' })).getByRole(
        'button',
        { name: 'Absent' }
      )
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(screen.getByRole('group', { name: 'Mardi ?' })).getByRole(
        'button',
        {
          name: 'Incertain',
        }
      )
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('se déconnecte', async () => {
    monter();
    await userEvent.click(
      screen.getByRole('button', { name: 'Se déconnecter' })
    );
    expect(signOut).toHaveBeenCalledOnce();
  });

  it('rien d’ouvert, rien de prévu : il le lit en clair', () => {
    monter({ ...KID_STATE, surveys: [], matches: [], trainings: [] });
    expect(
      screen.getByText("Aucun sondage ouvert pour l'instant.")
    ).toBeInTheDocument();
    expect(
      screen.getByText('Rien de prévu pour le moment.')
    ).toBeInTheDocument();
  });

  it('une fiche archivée : rien à afficher, mais de quoi se déconnecter', async () => {
    monter({ ...KID_STATE, players: [] });
    expect(
      screen.getByText(/Ta fiche n'est plus active au club/)
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Se déconnecter' })
    );
    expect(signOut).toHaveBeenCalledOnce();
  });
});
