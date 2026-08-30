import {
  describe,
  it,
  expect,
  beforeEach,
  beforeAll,
  afterAll,
  vi,
} from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAtRoute } from '../test/helpers';
import TeamDetailPage from './TeamDetailPage';
import { MOCK_DATA } from '../data/mock';

// L'export iCal se termine par un téléchargement : on intercepte `downloadText`
// pour lire le `.ics` réellement produit plutôt qu'un intermédiaire.
const downloadText = vi.hoisted(() => vi.fn());
vi.mock('@mister-guiiug/dev-wpa-config/download', async importOriginal => ({
  ...(await importOriginal<object>()),
  downloadText,
}));

describe('TeamDetailPage', () => {
  // Fige « aujourd'hui » dans la saison 2025-2026 pour que les sections
  // « à venir » (matchs/entraînements MOCK + fixtures 2026-05-20) s'affichent
  // sans rotation temporelle. `toFake: ['Date']` ne fige que Date.
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-05-01T12:00:00'));
  });
  afterAll(() => vi.useRealTimers());

  beforeEach(() => localStorage.clear());

  it('renders team name for known id', () => {
    renderAtRoute(<TeamDetailPage />, {
      initialPath: '/equipes/t1',
      routePattern: '/equipes/:id',
    });
    expect(screen.getByText('U13 A')).toBeInTheDocument();
  });

  it('shows empty state for unknown id', () => {
    renderAtRoute(<TeamDetailPage />, {
      initialPath: '/equipes/unknown',
      routePattern: '/equipes/:id',
    });
    expect(screen.getByText('Équipe introuvable')).toBeInTheDocument();
  });

  it('renders player list', () => {
    renderAtRoute(<TeamDetailPage />, {
      initialPath: '/equipes/t1',
      routePattern: '/equipes/:id',
    });
    expect(screen.getByText('Effectif')).toBeInTheDocument();
    // Lucas Dupont is a player in t1
    expect(screen.getByText('Lucas Dupont')).toBeInTheDocument();
  });

  it('shows unavailability warning icon for unavailable player', () => {
    // p4 (Enzo Thomas) has an active unavailability in mock data
    renderAtRoute(<TeamDetailPage />, {
      initialPath: '/equipes/t1',
      routePattern: '/equipes/:id',
    });
    // AlertTriangle appears for p4
    const listItems = document.querySelectorAll('li');
    const hasWarning = Array.from(listItems).some(li =>
      li.querySelector('svg')
    );
    expect(hasWarning).toBe(true);
  });

  it('shows upcoming matches section when matches exist', () => {
    renderAtRoute(<TeamDetailPage />, {
      initialPath: '/equipes/t1',
      routePattern: '/equipes/:id',
    });
    expect(screen.getByText('Prochains matchs')).toBeInTheDocument();
  });

  it('shows upcoming trainings section when trainings exist', () => {
    renderAtRoute(<TeamDetailPage />, {
      initialPath: '/equipes/t1',
      routePattern: '/equipes/:id',
    });
    expect(screen.getByText('Prochains entraînements')).toBeInTheDocument();
  });

  it('shows action buttons for compositions and surveys', () => {
    renderAtRoute(<TeamDetailPage />, {
      initialPath: '/equipes/t1',
      routePattern: '/equipes/:id',
    });
    expect(screen.getByText('Compositions')).toBeInTheDocument();
    expect(screen.getByText('Sondages')).toBeInTheDocument();
  });

  it('shows secondary team label for renfort player', () => {
    // p18 has t2 as primary and t1 as secondary
    renderAtRoute(<TeamDetailPage />, {
      initialPath: '/equipes/t1',
      routePattern: '/equipes/:id',
    });
    expect(screen.getByText(/Renfort/i)).toBeInTheDocument();
  });

  it('shows empty player list when team has no players', () => {
    localStorage.setItem(
      'mister-footcoach-data',
      JSON.stringify({
        ...MOCK_DATA,
        players: MOCK_DATA.players.filter(
          p => p.primaryTeamId !== 't1' && p.secondaryTeamId !== 't1'
        ),
        selectedTeamId: 't1',
      })
    );
    renderAtRoute(<TeamDetailPage />, {
      initialPath: '/equipes/t1',
      routePattern: '/equipes/:id',
    });
    expect(screen.getByText('Aucun joueur')).toBeInTheDocument();
  });

  it('shows @ for away upcoming match', () => {
    const awayMatch = {
      id: 'm99',
      teamId: 't1',
      seasonId: 's1',
      date: '2026-05-20',
      time: '15:00',
      location: 'Away',
      isHome: false,
      opponent: 'FC Away',
      status: 'saison',
      phase: 'Test',
      liveActive: false,
    };
    localStorage.setItem(
      'mister-footcoach-data',
      JSON.stringify({
        ...MOCK_DATA,
        matches: [awayMatch],
        selectedTeamId: 't1',
      })
    );
    renderAtRoute(<TeamDetailPage />, {
      initialPath: '/equipes/t1',
      routePattern: '/equipes/:id',
    });
    expect(screen.getByText(/@ FC Away/)).toBeInTheDocument();
  });

  it('shows "Entraînement" fallback when training has no theme', () => {
    const noThemeTraining = {
      id: 'tr99',
      teamId: 't1',
      date: '2026-05-20',
      time: '18:00',
      duration: 90,
      type: 'regulier',
      cancelled: false,
    };
    localStorage.setItem(
      'mister-footcoach-data',
      JSON.stringify({
        ...MOCK_DATA,
        trainings: [noThemeTraining],
        selectedTeamId: 't1',
      })
    );
    renderAtRoute(<TeamDetailPage />, {
      initialPath: '/equipes/t1',
      routePattern: '/equipes/:id',
    });
    expect(screen.getByText('Entraînement')).toBeInTheDocument();
  });
});

describe("TeamDetailPage — export iCal de l'équipe", () => {
  // Un nom d'équipe long ET accentué : c'est lui qui pousse `X-WR-CALNAME`
  // au-delà des 75 octets et met le pliage à l'épreuve.
  const LONG_NAME =
    'U13 A — Équipe Élite Départementale des Cévennes Méridionales';

  function seed() {
    localStorage.setItem(
      'mister-footcoach-data',
      JSON.stringify({
        ...MOCK_DATA,
        teams: MOCK_DATA.teams.map(t =>
          t.id === 't1' ? { ...t, name: LONG_NAME } : t
        ),
        tournaments: [
          {
            id: 'to9',
            seasonId: 's1',
            name: 'Tournoi de Noël',
            dateStart: '2026-05-23',
            dateEnd: '2026-05-23',
            location: 'Gymnase',
            address: '1 rue Y',
            organizer: 'FC Exemple',
            isOrganizedByClub: true,
            teamIds: ['t1'],
            invitedTeams: [],
          },
        ],
        matches: [
          {
            id: 'm1',
            teamId: 't1',
            seasonId: 's1',
            date: '2026-05-10',
            time: '10:00',
            location: 'Stade',
            address: '1 rue X',
            isHome: true,
            opponent: 'FC Rivale',
            status: 'engage',
            phase: 'Championnat',
            liveActive: false,
            meetingTime: '09:15',
            meetingAddress: 'Parking du club',
          },
          {
            id: 'm2',
            teamId: 't1',
            seasonId: 's1',
            tournamentId: 'to9',
            date: '2026-05-23',
            time: '14:00',
            location: 'Gymnase',
            address: '1 rue Y',
            isHome: false,
            opponent: 'AS Martin',
            status: 'annule',
            phase: 'Tournoi',
            liveActive: false,
          },
          {
            id: 'm3',
            teamId: 't1',
            seasonId: 's1',
            date: '2026-05-30',
            time: '16:00',
            location: 'Stade',
            address: '1 rue X',
            isHome: true,
            opponent: 'US Ouest',
            status: 'previsionnel',
            phase: 'Championnat',
            liveActive: false,
          },
        ],
        trainings: [
          {
            id: 'tr1',
            teamId: 't1',
            date: '2026-05-12',
            time: '18:00',
            duration: 90,
            type: 'regulier',
            cancelled: false,
          },
          {
            id: 'tr2',
            teamId: 't1',
            date: '2026-05-19',
            time: '18:00',
            duration: 90,
            type: 'regulier',
            cancelled: true,
            theme: 'Jeu de tête',
            note: 'Séance reportée',
          },
        ],
        selectedTeamId: 't1',
      })
    );
  }

  /** Recolle les lignes pliées (CRLF + espace), comme le fait un client. */
  function unfold(ics: string): string {
    return ics.replace(/\r\n /g, '');
  }

  /** Rend la page, clique « Exporter », rend le `.ics` reçu par le download. */
  async function exportedICal(): Promise<string> {
    seed();
    renderAtRoute(<TeamDetailPage />, {
      initialPath: '/equipes/t1',
      routePattern: '/equipes/:id',
    });
    await userEvent.click(
      screen.getByRole('button', { name: /Exporter le calendrier/i })
    );
    expect(downloadText).toHaveBeenCalledOnce();
    return downloadText.mock.calls[0]![0] as string;
  }

  beforeEach(() => {
    localStorage.clear();
    downloadText.mockClear();
  });

  it("télécharge un .ics nommé d'après l'équipe", async () => {
    await exportedICal();
    const [, filename, mime] = downloadText.mock.calls[0]!;
    expect(filename).toBe(`${LONG_NAME}.ics`);
    expect(mime).toContain('text/calendar');
  });

  it('garde les heures FLOTTANTES : un entraînement à 18 h reste à 18 h', async () => {
    const ics = await exportedICal();
    // Ni `Z` ni décalage : 18 h se lit 18 h dans n'importe quel fuseau.
    expect(ics).toContain('DTSTART:20260512T180000');
    // La fin se déduit de la durée saisie (90 min).
    expect(ics).toContain('DTEND:20260512T193000');
  });

  it('mappe les statuts de match sur STATUS (un match annulé reste au calendrier)', async () => {
    const ics = await exportedICal();
    expect(ics).toContain('STATUS:CANCELLED');
    expect(ics).toContain('STATUS:TENTATIVE');
    expect(ics).toContain('STATUS:CONFIRMED');
  });

  it('barre aussi un entraînement annulé au lieu de le retirer', async () => {
    const ics = await exportedICal();
    const cancelled = ics
      .split('BEGIN:VEVENT')
      .find(block => block.includes('UID:training-tr2@mister-footcoach'));
    expect(cancelled).toContain('STATUS:CANCELLED');
    // Le thème saisi sert de titre, la note de description.
    expect(cancelled).toContain('SUMMARY:🏋 Jeu de tête');
    expect(cancelled).toContain('DESCRIPTION:Séance reportée');
  });

  it("distingue domicile et extérieur, et rappelle l'heure de RDV", async () => {
    const ics = await exportedICal();
    expect(ics).toContain('SUMMARY:⚽ vs FC Rivale');
    expect(ics).toContain('SUMMARY:⚽ @ AS Martin');
    // Cette description dépasse 75 octets : c'est sur la ligne DÉPLIÉE qu'on
    // la relit.
    expect(unfold(ics)).toContain('RDV : 09:15 — Parking du club');
  });

  it('nomme le tournoi dans la description (RG-ICAL-04)', async () => {
    const ics = await exportedICal();
    expect(ics).toContain('Tournoi : Tournoi de Noël');
  });

  it('donne aux événements un UID stable', async () => {
    const ics = await exportedICal();
    expect(ics).toContain('UID:match-m1@mister-footcoach');
    expect(ics).toContain('UID:training-tr1@mister-footcoach');
  });

  it('produit un VCALENDAR valide : DTSTAMP en UTC sur chaque VEVENT', async () => {
    const ics = await exportedICal();
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('END:VCALENDAR');
    // `DTSTAMP` est OBLIGATOIRE (RFC 5545 §3.6.1) et manquait avant la
    // migration : autant d'événements que d'horodatages, tous identiques.
    const stamps = ics.match(/DTSTAMP:\d{8}T\d{6}Z/g) ?? [];
    expect(stamps).toHaveLength(ics.match(/BEGIN:VEVENT/g)!.length);
    expect(new Set(stamps).size).toBe(1);
  });

  it('plie les lignes à 75 octets sans couper un caractère accentué', async () => {
    const ics = await exportedICal();
    const encoder = new TextEncoder();
    for (const line of ics.split('\r\n')) {
      expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
    }
    // Le nom long est bien plié (donc sur plusieurs lignes)…
    expect(ics).toContain('X-WR-CALNAME:');
    expect(ics).not.toContain(`X-WR-CALNAME:${LONG_NAME}`);
    // …et se recolle à l'identique : aucun « é » scindé en deux octets.
    expect(unfold(ics)).toContain(
      `X-WR-CALNAME:${LONG_NAME} — Mister Footcoach`
    );
  });
});
