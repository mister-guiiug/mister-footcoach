import { useState } from 'react';
import { Card, CardHeader } from '@mister-guiiug/dev-pwa-config/react/card';
import { Input } from '../../ui/Input';
import { PdfExportButton } from './PdfExportButton';
import { useAppContext } from '../../../store/AppContext';
import type { Team } from '../../../types';
import { useI18n } from '../../../i18n';

const PERIOD_ERROR_ID = 'attendance-period-error';

/**
 * Le rapport d'assiduité d'une équipe, en PDF, sur une période choisie.
 *
 * LA SAISON PAR DÉFAUT. Tant que l'utilisateur n'a pas touché une borne, elle
 * SUIT la saison active au lieu de la recopier au montage : avec le backend
 * Supabase, la saison arrive après le premier rendu, et une copie figée
 * aurait gardé des bornes vides.
 */
export function AttendanceReportCard({ team }: { team: Team }) {
  const { t, localeTag } = useI18n();
  const { state } = useAppContext();
  const [fromInput, setFromInput] = useState<string | null>(null);
  const [toInput, setToInput] = useState<string | null>(null);
  const from = fromInput ?? state.season.startDate;
  const to = toInput ?? state.season.endDate;
  // Des dates ISO se comparent comme des chaînes.
  const invalid = Boolean(from && to && from > to);
  // Le nom de la saison n'est imprimé que si la période y tient : un rapport
  // à cheval sur deux saisons ne doit pas porter le nom d'une seule.
  const withinSeason = Boolean(
    from && to && from >= state.season.startDate && to <= state.season.endDate
  );

  const exportReport = async () => {
    const pdf = await import('../../../pdf/exportPdf');
    return pdf.exportAttendanceReport(
      {
        team,
        clubName: state.clubSettings.clubName,
        seasonName: withinSeason ? state.season.name : undefined,
        players: state.players,
        matches: state.matches,
        trainings: state.trainings,
        attendances: state.attendances,
        from,
        to,
        generatedAt: new Date(),
      },
      { t, localeTag }
    );
  };

  return (
    <Card>
      <CardHeader
        title={t('pdf.attendance.cardTitle')}
        subtitle={t('pdf.attendance.cardDesc')}
      />
      <div className="mb-3 grid grid-cols-2 gap-2">
        <Input
          id="attendance-from"
          type="date"
          label={t('pdf.attendance.from')}
          value={from}
          onChange={e => setFromInput(e.target.value)}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? PERIOD_ERROR_ID : undefined}
          className="min-h-11"
        />
        <Input
          id="attendance-to"
          type="date"
          label={t('pdf.attendance.to')}
          value={to}
          onChange={e => setToInput(e.target.value)}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? PERIOD_ERROR_ID : undefined}
          className="min-h-11"
        />
      </div>
      {invalid && (
        <p
          id={PERIOD_ERROR_ID}
          role="alert"
          className="mb-3 text-xs text-red-600 dark:text-red-400"
        >
          {t('pdf.attendance.periodInvalid')}
        </p>
      )}
      <PdfExportButton
        objet="rapport_assiduite"
        ariaLabel={t('pdf.attendance.exportAria')}
        blocked={invalid}
        describedBy={invalid ? PERIOD_ERROR_ID : undefined}
        onExport={exportReport}
      />
    </Card>
  );
}
