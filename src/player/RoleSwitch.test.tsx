import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  AppContext,
  EMPTY_APP_STATE,
  type AppState,
} from '../store/AppContext';
import type { User } from '../types';

/**
 * L'AIGUILLAGE PAR RÔLE — qui voit quoi, une fois la base lue.
 *
 * Les deux pages sont doublées : elles ont leurs propres tests. Ce qui se
 * joue ici est le CHOIX, et il dépend de la seule session.
 */
vi.mock('../backend/config', () => ({ BACKEND: 'supabase' }));
const session = vi.hoisted(() => ({ userId: null as string | null }));
vi.mock('../auth/AuthContext', () => ({
  useSessionUserId: () => session.userId,
}));
vi.mock('./PlayerHomePage', () => ({
  default: () => <p>page du joueur</p>,
}));
vi.mock('./LinkAccountPage', () => ({
  default: ({ hasProfile }: { hasProfile: boolean }) => (
    <p>rattachement {hasProfile ? 'fiche sans rôle' : 'sans fiche'}</p>
  ),
}));

import { RoleSwitch } from './RoleSwitch';

function user(id: string, roles: User['roles']): User {
  return {
    id,
    authId: `auth-${id}`,
    email: `${id}@exemple.fr`,
    firstName: id,
    lastName: 'Test',
    roles,
    teamIds: [],
  };
}

const STATE: AppState = {
  ...EMPTY_APP_STATE,
  users: [
    user('coach', ['coach']),
    user('parent', ['parent']),
    user('admin', ['admin']),
    { ...user('kid', ['player']), playerId: 'p1' },
    user('both', ['player', 'coach']),
    user('empty', []),
  ],
};

function monter() {
  return render(
    <AppContext.Provider value={{ state: STATE, dispatch: vi.fn() }}>
      <RoleSwitch>
        <p>application</p>
      </RoleSwitch>
    </AppContext.Provider>
  );
}

describe('RoleSwitch', () => {
  beforeEach(() => {
    session.userId = null;
  });

  it.each(['coach', 'parent', 'admin'])(
    'un membre adulte (%s) : l’application entière',
    id => {
      session.userId = `auth-${id}`;
      monter();
      expect(screen.getByText('application')).toBeInTheDocument();
    }
  );

  it('un compte QUE joueur : sa page, et pas l’application', async () => {
    session.userId = 'auth-kid';
    monter();
    expect(await screen.findByText('page du joueur')).toBeInTheDocument();
    expect(screen.queryByText('application')).toBeNull();
  });

  it('un rôle cumulé garde l’application entière', () => {
    session.userId = 'auth-both';
    monter();
    expect(screen.getByText('application')).toBeInTheDocument();
  });

  it('un compte sans fiche : le rattachement', async () => {
    session.userId = 'auth-nouveau';
    monter();
    expect(
      await screen.findByText('rattachement sans fiche')
    ).toBeInTheDocument();
    expect(screen.queryByText('application')).toBeNull();
  });

  it('une fiche sans rôle : le rattachement, qui dit qui peut agir', async () => {
    session.userId = 'auth-empty';
    monter();
    expect(
      await screen.findByText('rattachement fiche sans rôle')
    ).toBeInTheDocument();
  });
});

/**
 * DANS UN BUILD LOCAL, les deux pages n'existent pas : la condition sur
 * `import.meta.env` est fausse dès la transformation, et le bundler n'en émet
 * pas les morceaux. Le module est ici réévalué comme il le serait dans ce
 * build — `MODE` de production, backend local.
 */
describe('RoleSwitch dans un build local', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('n’a pas de pages, et laisse passer — même un compte joueur', async () => {
    vi.stubEnv('MODE', 'production');
    vi.stubEnv('VITE_BACKEND', 'local');
    vi.resetModules();
    // Le contexte vient du MÊME graphe réévalué que le composant : l'ancien
    // objet `AppContext` n'est plus celui que lit `useAppContext`.
    const { RoleSwitch: RoleSwitchLocal } = await import('./RoleSwitch');
    const { AppContext: AppContextLocal } = await import('../store/AppContext');
    session.userId = 'auth-kid';
    render(
      <AppContextLocal.Provider value={{ state: STATE, dispatch: vi.fn() }}>
        <RoleSwitchLocal>
          <p>application</p>
        </RoleSwitchLocal>
      </AppContextLocal.Provider>
    );
    expect(screen.getByText('application')).toBeInTheDocument();
    expect(screen.queryByText('page du joueur')).toBeNull();
  });
});
