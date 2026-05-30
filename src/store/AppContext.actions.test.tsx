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
} from './AppContext';
import type {
  Match,
  Tournament,
  Exercise,
  TrainingBlock,
  CarpoolOffer,
  Survey,
  Injury,
  Unavailability,
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
