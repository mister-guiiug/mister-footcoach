import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { type ReactNode } from 'react';
import {
  AppProvider,
  useAppContext,
  useTournaments,
  useExercises,
  useTrainingBlocks,
  useCarpoolOffers,
  useNotifications,
  useUnreadNotificationCount,
  useSurveys,
  useMatch,
  useInjuries,
  useUnavailabilities,
  useTournamentGroups,
  useNotificationPreferences,
  useClubSettings,
  useContactsForPlayer,
  usePositionHistory,
} from './AppContext';
import type {
  Match,
  Tournament,
  TournamentGroup,
  Exercise,
  TrainingBlock,
  CarpoolOffer,
  Survey,
  Injury,
  Unavailability,
  Contact,
  PositionHistory,
} from '../types';

function wrapper({ children }: { children: ReactNode }) {
  return <AppProvider>{children}</AppProvider>;
}

beforeEach(() => localStorage.clear());

describe('match actions', () => {
  it('adds and updates a match', () => {
    const { result } = renderHook(
      () => ({ ctx: useAppContext(), match: useMatch('mx') }),
      { wrapper }
    );

    const match: Match = {
      id: 'mx',
      teamId: 't1',
      seasonId: 's1',
      date: '2026-06-01',
      time: '10:00',
      location: 'Stade',
      address: 'Adresse',
      isHome: true,
      opponent: 'Rival',
      status: 'engage',
      phase: 'Poule',
      liveActive: false,
    };

    act(() => result.current.ctx.dispatch({ type: 'ADD_MATCH', match }));
    expect(result.current.match?.opponent).toBe('Rival');

    act(() =>
      result.current.ctx.dispatch({
        type: 'UPDATE_MATCH',
        match: { ...match, opponent: 'Nouveau' },
      })
    );
    expect(result.current.match?.opponent).toBe('Nouveau');
  });
});

describe('tournament / survey actions', () => {
  it('adds a tournament', () => {
    const { result } = renderHook(
      () => ({ ctx: useAppContext(), tournaments: useTournaments() }),
      { wrapper }
    );
    const before = result.current.tournaments.length;
    const tournament: Tournament = {
      id: 'tox',
      seasonId: 's1',
      name: 'Tournoi Test',
      dateStart: '2026-06-20',
      location: 'Lieu',
      address: '',
      organizer: 'Club',
      isOrganizedByClub: true,
      teamIds: ['t1'],
      format: 'poules',
      status: 'planifie',
    };
    act(() =>
      result.current.ctx.dispatch({ type: 'ADD_TOURNAMENT', tournament })
    );
    expect(result.current.tournaments.length).toBe(before + 1);
  });

  it('adds a survey', () => {
    const { result } = renderHook(
      () => ({ ctx: useAppContext(), surveys: useSurveys('t1') }),
      { wrapper }
    );
    const before = result.current.surveys.length;
    const survey: Survey = {
      id: 'svx',
      teamId: 't1',
      sessionType: 'libre',
      question: 'Dispo ?',
      deadline: '2026-06-10',
      status: 'ouvert',
      sendNotification: false,
      createdBy: 'u1',
    };
    act(() => result.current.ctx.dispatch({ type: 'ADD_SURVEY', survey }));
    expect(result.current.surveys.length).toBe(before + 1);
  });
});

describe('exercise actions', () => {
  it('adds, updates and deletes an exercise', () => {
    const { result } = renderHook(
      () => ({ ctx: useAppContext(), exercises: useExercises() }),
      { wrapper }
    );

    const exercise: Exercise = {
      id: 'exx',
      title: 'Nouvel exo',
      category: 'jeu',
      tags: ['test'],
    };
    act(() => result.current.ctx.dispatch({ type: 'ADD_EXERCISE', exercise }));
    expect(result.current.exercises.find(e => e.id === 'exx')?.title).toBe(
      'Nouvel exo'
    );

    act(() =>
      result.current.ctx.dispatch({
        type: 'UPDATE_EXERCISE',
        exercise: { ...exercise, title: 'Renommé' },
      })
    );
    expect(result.current.exercises.find(e => e.id === 'exx')?.title).toBe(
      'Renommé'
    );

    act(() =>
      result.current.ctx.dispatch({
        type: 'DELETE_EXERCISE',
        exerciseId: 'exx',
      })
    );
    expect(result.current.exercises.find(e => e.id === 'exx')).toBeUndefined();
  });
});

describe('training blocks', () => {
  it('replaces the blocks of a training', () => {
    const { result } = renderHook(
      () => ({ ctx: useAppContext(), blocks: useTrainingBlocks('tr1') }),
      { wrapper }
    );

    const blocks: TrainingBlock[] = [
      {
        id: 'b1',
        trainingId: 'tr1',
        order: 1,
        duration: 10,
        title: 'Échauffement',
      },
      { id: 'b2', trainingId: 'tr1', order: 2, duration: 20, title: 'Jeu' },
    ];
    act(() =>
      result.current.ctx.dispatch({
        type: 'SET_TRAINING_BLOCKS',
        trainingId: 'tr1',
        blocks,
      })
    );
    expect(result.current.blocks.map(b => b.title)).toEqual([
      'Échauffement',
      'Jeu',
    ]);
  });
});

describe('carpool actions', () => {
  it('adds and deletes a carpool offer', () => {
    const { result } = renderHook(
      () => ({ ctx: useAppContext(), offers: useCarpoolOffers('m4') }),
      { wrapper }
    );

    const offer: CarpoolOffer = {
      id: 'cox',
      matchId: 'm4',
      offeredBy: 'u1',
      seats: 3,
      playerIds: ['p1'],
    };
    act(() =>
      result.current.ctx.dispatch({ type: 'ADD_CARPOOL_OFFER', offer })
    );
    expect(result.current.offers.length).toBe(1);

    act(() =>
      result.current.ctx.dispatch({
        type: 'DELETE_CARPOOL_OFFER',
        offerId: 'cox',
      })
    );
    expect(result.current.offers.length).toBe(0);
  });
});

describe('position history', () => {
  it('appends position history entries (live substitution)', () => {
    const { result } = renderHook(
      () => ({ ctx: useAppContext(), history: usePositionHistory('p1') }),
      { wrapper }
    );
    const before = result.current.history.length;
    const entries: PositionHistory[] = [
      {
        id: 'phx',
        playerId: 'p1',
        matchId: 'm1',
        matchDate: '2026-05-10',
        opponent: 'FC Rivale',
        period: 'remplaçant entrant',
        position: 'GK',
      },
    ];
    act(() =>
      result.current.ctx.dispatch({ type: 'ADD_POSITION_HISTORY', entries })
    );
    expect(result.current.history.length).toBe(before + 1);
  });
});

describe('contact actions', () => {
  it('adds, updates and deletes a contact', () => {
    const { result } = renderHook(
      () => ({ ctx: useAppContext(), contacts: useContactsForPlayer('p2') }),
      { wrapper }
    );
    const before = result.current.contacts.length;
    const contact: Contact = {
      id: 'cx',
      firstName: 'Marie',
      lastName: 'Martin',
      phone: '06',
      email: 'marie@x.fr',
      type: 'mère',
      playerIds: ['p2'],
    };
    act(() => result.current.ctx.dispatch({ type: 'ADD_CONTACT', contact }));
    expect(result.current.contacts.length).toBe(before + 1);

    act(() =>
      result.current.ctx.dispatch({
        type: 'UPDATE_CONTACT',
        contact: { ...contact, phone: '07' },
      })
    );
    expect(result.current.contacts.find(c => c.id === 'cx')?.phone).toBe('07');

    act(() =>
      result.current.ctx.dispatch({ type: 'DELETE_CONTACT', contactId: 'cx' })
    );
    expect(result.current.contacts.find(c => c.id === 'cx')).toBeUndefined();
  });
});

describe('tournament group actions', () => {
  it('adds, updates and deletes a tournament group', () => {
    const { result } = renderHook(
      () => ({ ctx: useAppContext(), groups: useTournamentGroups('to1') }),
      { wrapper }
    );
    const before = result.current.groups.length;
    const group: TournamentGroup = {
      id: 'gx',
      tournamentId: 'to1',
      name: 'Poule Z',
      type: 'poule',
      order: 9,
    };
    act(() =>
      result.current.ctx.dispatch({ type: 'ADD_TOURNAMENT_GROUP', group })
    );
    expect(result.current.groups.length).toBe(before + 1);

    act(() =>
      result.current.ctx.dispatch({
        type: 'UPDATE_TOURNAMENT_GROUP',
        group: { ...group, name: 'Poule Renommée' },
      })
    );
    expect(result.current.groups.find(g => g.id === 'gx')?.name).toBe(
      'Poule Renommée'
    );

    act(() =>
      result.current.ctx.dispatch({
        type: 'DELETE_TOURNAMENT_GROUP',
        groupId: 'gx',
      })
    );
    expect(result.current.groups.find(g => g.id === 'gx')).toBeUndefined();
  });
});

describe('injury / unavailability actions', () => {
  it('adds and updates an injury', () => {
    const { result } = renderHook(
      () => ({ ctx: useAppContext(), injuries: useInjuries('p1') }),
      { wrapper }
    );
    const injury: Injury = {
      id: 'injx',
      playerId: 'p1',
      zone: 'cheville',
      nature: 'entorse',
      startDate: '2026-05-01',
      status: 'en_reeduc',
    };
    act(() => result.current.ctx.dispatch({ type: 'ADD_INJURY', injury }));
    expect(result.current.injuries.find(i => i.id === 'injx')?.status).toBe(
      'en_reeduc'
    );

    act(() =>
      result.current.ctx.dispatch({
        type: 'UPDATE_INJURY',
        injury: { ...injury, status: 'apte', actualReturnDate: '2026-05-20' },
      })
    );
    expect(result.current.injuries.find(i => i.id === 'injx')?.status).toBe(
      'apte'
    );
  });

  it('adds and closes an unavailability', () => {
    const { result } = renderHook(
      () => ({ ctx: useAppContext(), unavail: useUnavailabilities('p1') }),
      { wrapper }
    );
    const unavailability: Unavailability = {
      id: 'uvx',
      playerId: 'p1',
      startDate: '2026-05-01',
      motif: 'blessure',
      declaredBy: 'u1',
    };
    act(() =>
      result.current.ctx.dispatch({
        type: 'ADD_UNAVAILABILITY',
        unavailability,
      })
    );
    expect(
      result.current.unavail.find(u => u.id === 'uvx')?.endDate
    ).toBeUndefined();

    act(() =>
      result.current.ctx.dispatch({
        type: 'UPDATE_UNAVAILABILITY',
        unavailability: { ...unavailability, endDate: '2026-05-20' },
      })
    );
    expect(result.current.unavail.find(u => u.id === 'uvx')?.endDate).toBe(
      '2026-05-20'
    );
  });
});

describe('preferences & club settings', () => {
  it('updates club settings', () => {
    const { result } = renderHook(
      () => ({ ctx: useAppContext(), settings: useClubSettings() }),
      { wrapper }
    );
    act(() =>
      result.current.ctx.dispatch({
        type: 'SET_CLUB_SETTINGS',
        settings: { autoSurveyOnMatch: false },
      })
    );
    expect(result.current.settings.autoSurveyOnMatch).toBe(false);
  });

  it('stores notification preferences per user', () => {
    const { result } = renderHook(
      () => ({ ctx: useAppContext(), prefs: useNotificationPreferences('u1') }),
      { wrapper }
    );
    expect(result.current.prefs.enabled).toBe(true); // default
    act(() =>
      result.current.ctx.dispatch({
        type: 'SET_NOTIFICATION_PREFERENCES',
        userId: 'u1',
        preferences: {
          enabled: true,
          mutedCategories: ['match'],
          reminderDelay: 'J-2',
        },
      })
    );
    expect(result.current.prefs.mutedCategories).toEqual(['match']);
    expect(result.current.prefs.reminderDelay).toBe('J-2');
  });

  it('NOTIFY skips users who muted the category', () => {
    const { result } = renderHook(
      () => ({
        ctx: useAppContext(),
        u1: useNotifications('u1'),
        u3: useNotifications('u3'),
      }),
      { wrapper }
    );
    act(() =>
      result.current.ctx.dispatch({
        type: 'SET_NOTIFICATION_PREFERENCES',
        userId: 'u1',
        preferences: {
          enabled: true,
          mutedCategories: ['match'],
          reminderDelay: 'J-1',
        },
      })
    );
    const u1Before = result.current.u1.length;
    const u3Before = result.current.u3.length;

    act(() =>
      result.current.ctx.dispatch({
        type: 'NOTIFY',
        teamId: 't1',
        notifType: 'match_nouveau',
        message: 'New match',
      })
    );

    // u1 muted "match" → no delivery; u3 (admin, default prefs) still receives.
    expect(result.current.u1.length).toBe(u1Before);
    expect(result.current.u3.length).toBe(u3Before + 1);
  });
});

describe('notifications', () => {
  it('NOTIFY targets users attached to the team', () => {
    const { result } = renderHook(
      () => ({
        ctx: useAppContext(),
        u1: useNotifications('u1'),
        u3: useNotifications('u3'),
        u2: useNotifications('u2'),
      }),
      { wrapper }
    );
    const u1Before = result.current.u1.length;
    const u2Before = result.current.u2.length;

    act(() =>
      result.current.ctx.dispatch({
        type: 'NOTIFY',
        teamId: 't1',
        notifType: 'test',
        message: 'Hello team',
      })
    );

    // u1 (coach t1) and u3 (admin, both teams) receive it; u2 (coach t2) does not.
    expect(result.current.u1.length).toBe(u1Before + 1);
    expect(result.current.u3[0]?.message).toBe('Hello team');
    expect(result.current.u2.length).toBe(u2Before);
  });

  it('marks one and all notifications as read', () => {
    const { result } = renderHook(
      () => ({
        ctx: useAppContext(),
        unread: useUnreadNotificationCount('u1'),
        list: useNotifications('u1'),
      }),
      { wrapper }
    );

    const firstId = result.current.list[0]!.id;
    const unreadBefore = result.current.unread;
    expect(unreadBefore).toBeGreaterThan(0);

    act(() =>
      result.current.ctx.dispatch({
        type: 'MARK_NOTIFICATION_READ',
        notificationId: firstId,
      })
    );
    expect(result.current.unread).toBe(unreadBefore - 1);

    act(() =>
      result.current.ctx.dispatch({
        type: 'MARK_ALL_NOTIFICATIONS_READ',
        userId: 'u1',
      })
    );
    expect(result.current.unread).toBe(0);
  });
});
