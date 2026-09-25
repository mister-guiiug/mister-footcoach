/**
 * Le rapport d'assiduité d'une équipe — fabrique PURE : données → document.
 *
 * PAR JOUEUR : présences, absences, excusés, séances saisies et taux ; puis le
 * total de l'équipe. Des COLONNES CHIFFRÉES, et rien que des chiffres : sur
 * une photocopie en noir et blanc, une couleur ne dit plus rien, et un taux
 * seul ne dit pas sur combien de séances il porte — d'où la colonne des
 * saisies à côté.
 *
 * LE PÉRIMÈTRE, dit sur le document lui-même (légende) :
 *  - les séances DE L'ÉQUIPE sur la période, bornes comprises : ses
 *    entraînements non annulés et ses matchs non annulés. Un renfort venu
 *    d'une autre équipe n'y est compté que pour les séances de celle-ci ;
 *  - l'effectif ACTIF de l'équipe, celui que montrent les écrans ;
 *  - le taux vaut présences / saisies, comme dans les statistiques : une
 *    séance où rien n'a été relevé n'est ni une présence ni une absence.
 *
 * Aucune note d'assiduité n'est lue : le motif d'une excuse n'a rien à faire
 * sur un document qui circule.
 */
import type { Attendance, Match, Player, Team, Training } from '../types';
import type { PdfBlock, PdfExport, PdfField, PdfI18n } from './document';
import { fileSlug, longDate } from './text';

export interface AttendanceReportInput {
  team: Team;
  /** Nom du club (réglages) ; vide ou absent, la ligne n'est pas imprimée. */
  clubName?: string;
  seasonName?: string;
  players: Player[];
  matches: Match[];
  trainings: Training[];
  attendances: Attendance[];
  /** Bornes ISO `AAAA-MM-JJ`, incluses ; vide = pas de borne. */
  from?: string;
  to?: string;
  /** Date d'édition — injectée pour qu'un test soit reproductible. */
  generatedAt: Date;
}

export interface AttendanceCount {
  present: number;
  absent: number;
  excuse: number;
  /** Séances où la présence a été saisie : la base du taux. */
  total: number;
}

export interface AttendanceLine extends AttendanceCount {
  player: Player;
}

export interface AttendanceSummary {
  trainings: number;
  matches: number;
  lines: AttendanceLine[];
  total: AttendanceCount;
}

/** Les comptes, sans mise en forme : ce que le tableau imprime, en nombres. */
export function summarizeAttendance(
  input: AttendanceReportInput,
  localeTag: string
): AttendanceSummary {
  const { team, from, to } = input;
  const inPeriod = (date: string) =>
    (!from || date >= from) && (!to || date <= to);

  const trainings = input.trainings.filter(
    s => s.teamId === team.id && !s.cancelled && inPeriod(s.date)
  );
  const matches = input.matches.filter(
    m => m.teamId === team.id && m.status !== 'annule' && inPeriod(m.date)
  );
  const sessions = new Set([
    ...trainings.map(s => `training:${s.id}`),
    ...matches.map(m => `match:${m.id}`),
  ]);

  const roster = input.players
    .filter(
      p =>
        p.active &&
        (p.primaryTeamId === team.id || p.secondaryTeamId === team.id)
    )
    .sort(
      (a, b) =>
        a.lastName.localeCompare(b.lastName, localeTag) ||
        a.firstName.localeCompare(b.firstName, localeTag)
    );

  const lines: AttendanceLine[] = roster.map(player => ({
    player,
    present: 0,
    absent: 0,
    excuse: 0,
    total: 0,
  }));
  const lineOf = new Map(lines.map(l => [l.player.id, l]));
  for (const a of input.attendances) {
    const line = lineOf.get(a.playerId);
    if (!line || !sessions.has(`${a.sessionType}:${a.sessionId}`)) continue;
    line[a.status] += 1;
    line.total += 1;
  }

  const total = lines.reduce<AttendanceCount>(
    (sum, l) => ({
      present: sum.present + l.present,
      absent: sum.absent + l.absent,
      excuse: sum.excuse + l.excuse,
      total: sum.total + l.total,
    }),
    { present: 0, absent: 0, excuse: 0, total: 0 }
  );

  return { trainings: trainings.length, matches: matches.length, lines, total };
}

export function buildAttendanceReport(
  input: AttendanceReportInput,
  { t, localeTag }: PdfI18n
): PdfExport {
  const { team, from, to } = input;
  const summary = summarizeAttendance(input, localeTag);

  const rate = (c: AttendanceCount) =>
    c.total === 0
      ? t('pdf.none')
      : t('pdf.attendance.rate', {
          value: Math.round((c.present / c.total) * 100),
        });
  const counts = (c: AttendanceCount) => [
    String(c.present),
    String(c.absent),
    String(c.excuse),
    String(c.total),
    rate(c),
  ];

  const period =
    from && to
      ? t('pdf.attendance.periodValue', {
          from: longDate(from, localeTag),
          to: longDate(to, localeTag),
        })
      : from
        ? t('pdf.attendance.periodSince', { from: longDate(from, localeTag) })
        : to
          ? t('pdf.attendance.periodUntil', { to: longDate(to, localeTag) })
          : t('pdf.attendance.periodAll');

  const fields: PdfField[] = [
    { label: t('pdf.attendance.team'), value: team.name },
  ];
  if (input.seasonName)
    fields.push({ label: t('pdf.attendance.season'), value: input.seasonName });
  fields.push(
    { label: t('pdf.attendance.period'), value: period },
    {
      label: t('pdf.attendance.trainings'),
      value: String(summary.trainings),
    },
    { label: t('pdf.attendance.matches'), value: String(summary.matches) }
  );

  const numeric = (header: string) => ({
    header,
    width: 0.12,
    align: 'right' as const,
  });
  const blocks: PdfBlock[] = [{ kind: 'fields', rows: fields }];
  if (summary.lines.length > 0) {
    blocks.push(
      {
        kind: 'table',
        columns: [
          { header: t('pdf.attendance.colPlayer'), width: 0.4 },
          numeric(t('pdf.attendance.colPresent')),
          numeric(t('pdf.attendance.colAbsent')),
          numeric(t('pdf.attendance.colExcused')),
          numeric(t('pdf.attendance.colRecorded')),
          numeric(t('pdf.attendance.colRate')),
        ],
        rows: summary.lines.map(l => [
          `${l.player.firstName} ${l.player.lastName}`,
          ...counts(l),
        ]),
        total: [t('pdf.attendance.teamTotal'), ...counts(summary.total)],
      },
      { kind: 'text', text: t('pdf.attendance.legend'), tone: 'muted' }
    );
  } else {
    blocks.push({
      kind: 'text',
      text: t('pdf.attendance.noPlayers'),
      tone: 'muted',
    });
  }

  const clubName = input.clubName?.trim();
  return {
    document: {
      title: t('pdf.attendance.title'),
      ...(clubName ? { kicker: clubName } : {}),
      subtitle: t('pdf.attendance.subtitle', { team: team.name, period }),
      footer: t('pdf.footer', {
        app: t('app.name'),
        date: longDate(input.generatedAt, localeTag),
      }),
      pageLabel: (page, total) => t('pdf.page', { page, total }),
      blocks,
    },
    // Une borne absente laisse un tiret de trop, que `fileSlug` resserre :
    // « assiduite-u13-a » quand la période est ouverte des deux côtés.
    filename: `${fileSlug(
      t('pdf.attendance.filename', {
        team: team.name,
        from: from ?? '',
        to: to ?? '',
      })
    )}.pdf`,
    shareTitle: t('pdf.attendance.shareTitle', { team: team.name }),
  };
}
