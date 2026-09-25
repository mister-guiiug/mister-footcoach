/**
 * La feuille de match — fabrique PURE : données du match → document.
 *
 * CE QU'ELLE PORTE : le club et l'équipe, l'adversaire, la date, l'heure, le
 * lieu, domicile ou extérieur, le rendez-vous ; la composition (titulaires
 * poste par poste selon la formation, remplaçants), les joueurs indisponibles
 * avec leur motif, l'encadrement, une zone de signatures ; et, si le match est
 * joué, le score et les buteurs.
 *
 * CE QU'ELLE NE PORTE JAMAIS : un détail médical. Les joueurs sont des
 * MINEURS et ce papier circule — vestiaire, arbitre, club adverse. D'une
 * indisponibilité, seul le MOTIF est imprimé (« Blessure », « Vacances »…) :
 * ni la note libre qui l'accompagne — elle n'est jamais lue ici —, ni la zone,
 * la nature ou la date de reprise d'une blessure — la fabrique ne reçoit même
 * pas les suivis de blessure. Aucune coordonnée non plus : ni téléphone ni
 * e-mail, pas même ceux de l'encadrement.
 */
import type {
  Lineup,
  Match,
  MatchEvent,
  Player,
  Team,
  Tournament,
  Unavailability,
  UnavailabilityMotif,
  User,
} from '../types';
import { isActiveUnavailability } from '../utils/date';
import type { PdfBlock, PdfExport, PdfField, PdfI18n } from './document';
import { fileSlug, longDate } from './text';

export interface MatchSheetInput {
  match: Match;
  team?: Team;
  /** Nom du club (réglages) ; vide ou absent, la ligne n'est pas imprimée. */
  clubName?: string;
  players: Player[];
  lineups: Lineup[];
  unavailabilities: Unavailability[];
  matchEvents: MatchEvent[];
  users: User[];
  tournaments: Tournament[];
  /** Date d'édition — injectée pour qu'un test soit reproductible. */
  generatedAt: Date;
}

/**
 * La composition à imprimer. Le simulateur n'attache pas ses compositions à
 * un match : il les enregistre pour une ÉQUIPE. D'où l'ordre de préférence —
 * une composition rattachée à CE match si elle existe (le modèle le permet),
 * sinon la plus récente de l'équipe qui n'est rattachée à aucun autre match.
 * La feuille dit laquelle elle a retenue, avec sa date d'enregistrement.
 */
export function pickLineup(
  lineups: Lineup[],
  match: Match
): Lineup | undefined {
  const ofTeam = lineups.filter(l => l.teamId === match.teamId);
  const linked = ofTeam.filter(l => l.matchId === match.id);
  const pool = linked.length > 0 ? linked : ofTeam.filter(l => !l.matchId);
  return pool.reduce<Lineup | undefined>(
    (latest, l) => (!latest || l.createdAt > latest.createdAt ? l : latest),
    undefined
  );
}

function fullName(person: { firstName: string; lastName: string }): string {
  return `${person.firstName} ${person.lastName}`;
}

/** Rang d'un numéro ou d'une minute absents dans un tri : après les autres. */
const LAST = Number.MAX_SAFE_INTEGER;

export function buildMatchSheet(
  input: MatchSheetInput,
  { t, localeTag }: PdfI18n
): PdfExport {
  const { match, team } = input;
  const none = t('pdf.none');
  const teamName = team?.name ?? t('matches.us');
  const home = match.isHome ? teamName : match.opponent;
  const away = match.isHome ? match.opponent : teamName;

  const roster = input.players.filter(
    p =>
      p.active &&
      (p.primaryTeamId === match.teamId || p.secondaryTeamId === match.teamId)
  );
  const rosterIds = new Set(roster.map(p => p.id));
  const byId = new Map(input.players.map(p => [p.id, p]));

  // Indisponibles LE JOUR DU MATCH, pas aujourd'hui : une feuille éditée à
  // l'avance, ou après coup, doit dire qui manquait ce jour-là. Un joueur
  // peut cumuler deux motifs (blessure puis vacances) : les deux sont dits.
  const motifs = new Map<string, UnavailabilityMotif[]>();
  for (const u of input.unavailabilities) {
    if (!rosterIds.has(u.playerId)) continue;
    if (!isActiveUnavailability(u.startDate, u.endDate, match.date)) continue;
    const list = motifs.get(u.playerId) ?? [];
    if (!list.includes(u.motif)) list.push(u.motif);
    motifs.set(u.playerId, list);
  }
  const numberOf = (p: Player | undefined) =>
    p?.number !== undefined ? String(p.number) : '';
  // Un joueur aligné ET indisponible : la contradiction est imprimée plutôt
  // que tue, c'est au coach de la trancher.
  const shownName = (p: Player) =>
    motifs.has(p.id)
      ? `${fullName(p)} ${t('pdf.matchSheet.unavailableMark')}`
      : fullName(p);
  // L'ordre d'un appel : par nom de famille, puis par prénom — le même que
  // celui du rapport d'assiduité.
  const byName = (a: Player, b: Player) =>
    a.lastName.localeCompare(b.lastName, localeTag) ||
    a.firstName.localeCompare(b.firstName, localeTag);

  const blocks: PdfBlock[] = [];

  // ── Le match ──────────────────────────────────────────────────────────
  const tournament = match.tournamentId
    ? input.tournaments.find(x => x.id === match.tournamentId)
    : undefined;
  // Les champs courts deux par ligne, les longs (lieu, rendez-vous) sur toute
  // la largeur : c'est ce qui tient la feuille d'un match sur une page A4.
  const short: PdfField[] = [
    {
      label: t('pdf.matchSheet.team'),
      value: team?.category
        ? t('pdf.matchSheet.teamWithCategory', {
            name: team.name,
            category: team.category,
          })
        : teamName,
    },
    { label: t('pdf.matchSheet.opponent'), value: match.opponent },
    {
      label: t('pdf.matchSheet.date'),
      value: longDate(match.date, localeTag, { weekday: true }),
    },
    { label: t('pdf.matchSheet.time'), value: match.time || none },
    {
      label: t('pdf.matchSheet.venue'),
      value: t(match.isHome ? 'pdf.matchSheet.home' : 'pdf.matchSheet.away'),
    },
    {
      label: t('pdf.matchSheet.status'),
      value: t(`matchStatus.${match.status}`),
    },
  ];
  if (match.phase)
    short.push({ label: t('pdf.matchSheet.phase'), value: match.phase });
  if (tournament)
    short.push({
      label: t('pdf.matchSheet.tournament'),
      value: tournament.name,
    });
  if (match.field)
    short.push({ label: t('pdf.matchSheet.field'), value: match.field });

  const place = [match.location, match.address].filter(Boolean).join(', ');
  const meeting = [match.meetingTime, match.meetingAddress]
    .filter(Boolean)
    .join(' – ');
  blocks.push(
    { kind: 'fields', rows: short, columns: 2 },
    {
      kind: 'fields',
      rows: [
        { label: t('pdf.matchSheet.location'), value: place || none },
        {
          label: t('pdf.matchSheet.meeting'),
          value: meeting
            ? match.meetingNote
              ? `${meeting} (${match.meetingNote})`
              : meeting
            : t('pdf.matchSheet.meetingNone'),
        },
      ],
    }
  );

  // ── Le résultat, si le match est joué ─────────────────────────────────
  if (match.scoreHome !== undefined && match.scoreAway !== undefined) {
    blocks.push(
      { kind: 'heading', text: t('pdf.matchSheet.result') },
      {
        kind: 'fields',
        rows: [
          {
            label: t('pdf.matchSheet.score'),
            value: t('pdf.matchSheet.scoreValue', {
              home,
              homeScore: match.scoreHome,
              awayScore: match.scoreAway,
              away,
            }),
          },
        ],
      }
    );
    // Les buts de NOTRE équipe : un « but » est marqué par l'un des nôtres
    // (le mode live les compte ainsi). Un contre-son-camp profite à
    // l'adversaire, il n'a pas de place parmi nos buteurs. Le nombre de buts
    // se lit sur le COMPTE des événements, pas sur les minutes : un but saisi
    // sans minute compte quand même.
    const scorers = new Map<
      string,
      { name: string; goals: number; minutes: number[] }
    >();
    for (const e of input.matchEvents) {
      if (e.matchId !== match.id || e.type !== 'but') continue;
      const player = e.playerId ? byId.get(e.playerId) : undefined;
      const key = player?.id ?? '';
      const entry = scorers.get(key) ?? {
        name: player ? fullName(player) : t('pdf.matchSheet.unknownScorer'),
        goals: 0,
        minutes: [],
      };
      entry.goals += 1;
      if (e.minute !== undefined) entry.minutes.push(e.minute);
      scorers.set(key, entry);
    }
    const ours = match.isHome ? match.scoreHome : match.scoreAway;
    if (scorers.size > 0) {
      const rows = [...scorers.values()]
        .map(s => ({ ...s, minutes: [...s.minutes].sort((a, b) => a - b) }))
        .sort(
          (a, b) =>
            b.goals - a.goals || (a.minutes[0] ?? LAST) - (b.minutes[0] ?? LAST)
        );
      blocks.push({
        kind: 'table',
        columns: [
          { header: t('pdf.matchSheet.colScorer'), width: 0.5 },
          {
            header: t('pdf.matchSheet.colGoals'),
            width: 0.15,
            align: 'right',
          },
          { header: t('pdf.matchSheet.colMinutes'), width: 0.35 },
        ],
        rows: rows.map(r => [
          r.name,
          String(r.goals),
          r.minutes.length > 0 ? r.minutes.map(m => `${m}'`).join(', ') : none,
        ]),
      });
    } else if (ours > 0) {
      blocks.push({
        kind: 'text',
        text: t('pdf.matchSheet.scorersMissing'),
        tone: 'muted',
      });
    }
  }

  // ── La composition ────────────────────────────────────────────────────
  const lineup = pickLineup(input.lineups, match);
  if (lineup) {
    blocks.push(
      {
        kind: 'heading',
        text: t('pdf.matchSheet.starters', { formation: lineup.formation }),
      },
      {
        kind: 'table',
        columns: [
          { header: t('pdf.matchSheet.colPosition'), width: 0.34 },
          {
            header: t('pdf.matchSheet.colNumber'),
            width: 0.1,
            align: 'right',
          },
          { header: t('pdf.matchSheet.colPlayer'), width: 0.56 },
        ],
        // Un poste vide reste une ligne : sur papier, c'est la case où le
        // coach écrira le nom à la main.
        rows: lineup.slots.map(slot => {
          const player = slot.playerId ? byId.get(slot.playerId) : undefined;
          return [
            t(`position.${slot.position}`),
            numberOf(player),
            player ? shownName(player) : '',
          ];
        }),
      },
      // SOUS le tableau, en légende : entre le titre et le tableau, cette
      // note pouvait laisser le titre seul en bas de page.
      {
        kind: 'text',
        text: t('pdf.matchSheet.lineupSource', {
          name: lineup.name,
          date: longDate(lineup.createdAt, localeTag),
        }),
        tone: 'muted',
      }
    );
    const substitutes = lineup.substituteIds
      .map(id => byId.get(id))
      .filter((p): p is Player => p !== undefined);
    blocks.push({ kind: 'heading', text: t('pdf.matchSheet.substitutes') });
    blocks.push(
      substitutes.length > 0
        ? {
            kind: 'table',
            columns: [
              {
                header: t('pdf.matchSheet.colNumber'),
                width: 0.1,
                align: 'right',
              },
              { header: t('pdf.matchSheet.colPlayer'), width: 0.9 },
            ],
            rows: substitutes.map(p => [numberOf(p), shownName(p)]),
          }
        : {
            kind: 'text',
            text: t('pdf.matchSheet.substitutesNone'),
            tone: 'muted',
          }
    );
  } else {
    // Sans composition, la feuille reste utile : l'effectif disponible, par
    // numéro, avec le poste de prédilection de chacun.
    blocks.push(
      { kind: 'heading', text: t('pdf.matchSheet.lineup') },
      { kind: 'text', text: t('pdf.matchSheet.lineupNone'), tone: 'muted' }
    );
    const available = roster
      .filter(p => !motifs.has(p.id))
      .sort((a, b) => (a.number ?? LAST) - (b.number ?? LAST) || byName(a, b));
    if (available.length > 0) {
      blocks.push(
        { kind: 'heading', text: t('pdf.matchSheet.available') },
        {
          kind: 'table',
          columns: [
            {
              header: t('pdf.matchSheet.colNumber'),
              width: 0.1,
              align: 'right',
            },
            { header: t('pdf.matchSheet.colPlayer'), width: 0.55 },
            { header: t('pdf.matchSheet.colPreferred'), width: 0.35 },
          ],
          rows: available.map(p => [
            numberOf(p),
            fullName(p),
            t(`position.${p.preferredPosition}`),
          ]),
        }
      );
    }
  }

  // ── Les indisponibles : le motif, rien d'autre (voir l'en-tête) ───────
  const unavailable = roster.filter(p => motifs.has(p.id)).sort(byName);
  blocks.push({ kind: 'heading', text: t('pdf.matchSheet.unavailable') });
  blocks.push(
    unavailable.length > 0
      ? {
          kind: 'table',
          columns: [
            { header: t('pdf.matchSheet.colPlayer'), width: 0.6 },
            { header: t('pdf.matchSheet.colReason'), width: 0.4 },
          ],
          rows: unavailable.map(p => [
            fullName(p),
            motifs
              .get(p.id)!
              .map(m => t(`unavailabilityMotif.${m}`))
              .join(', '),
          ]),
        }
      : {
          kind: 'text',
          text: t('pdf.matchSheet.unavailableNone'),
          tone: 'muted',
        }
  );

  // ── L'encadrement : le coach de l'équipe, puis les autres coachs ──────
  const headCoach = team
    ? input.users.find(u => u.id === team.coachId)
    : undefined;
  const staff: string[][] = headCoach
    ? [[fullName(headCoach), t('pdf.matchSheet.headCoach')]]
    : [];
  for (const u of input.users) {
    if (u.id === headCoach?.id) continue;
    if (u.roles.includes('coach') && u.teamIds.includes(match.teamId)) {
      staff.push([fullName(u), t('pdf.matchSheet.assistantCoach')]);
    }
  }
  blocks.push({ kind: 'heading', text: t('pdf.matchSheet.staff') });
  blocks.push(
    staff.length > 0
      ? {
          kind: 'table',
          columns: [
            { header: t('pdf.matchSheet.colName'), width: 0.6 },
            { header: t('pdf.matchSheet.colRole'), width: 0.4 },
          ],
          rows: staff,
        }
      : { kind: 'text', text: t('pdf.matchSheet.staffNone'), tone: 'muted' }
  );

  blocks.push(
    { kind: 'heading', text: t('pdf.matchSheet.signatures') },
    {
      kind: 'signatures',
      labels: [
        t('pdf.matchSheet.signTeam'),
        t('pdf.matchSheet.signOpponent'),
        t('pdf.matchSheet.signReferee'),
      ],
    }
  );

  const clubName = input.clubName?.trim();
  return {
    document: {
      title: t('pdf.matchSheet.title'),
      ...(clubName ? { kicker: clubName } : {}),
      subtitle: t('pdf.matchSheet.versus', { home, away }),
      footer: t('pdf.footer', {
        app: t('app.name'),
        date: longDate(input.generatedAt, localeTag),
      }),
      pageLabel: (page, total) => t('pdf.page', { page, total }),
      blocks,
    },
    filename: `${fileSlug(
      t('pdf.matchSheet.filename', {
        date: match.date,
        opponent: match.opponent,
      })
    )}.pdf`,
    shareTitle: t('pdf.matchSheet.shareTitle', { home, away }),
  };
}
