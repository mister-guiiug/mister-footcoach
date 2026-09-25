/**
 * L'entrée de l'export PDF, chargée À LA DEMANDE : les écrans l'importent par
 * `import()` au clic sur « Exporter en PDF », jamais statiquement. Tout ce qui
 * est ici — fabriques, mise en page, générateur du socle — reste hors du
 * chemin critique, et n'est téléchargé que par qui s'en sert.
 */
import {
  buildAttendanceReport,
  type AttendanceReportInput,
} from './attendanceReport';
import { shareOrDownloadPdf, type PdfOutcome } from './deliver';
import type { PdfExport, PdfI18n } from './document';
import { buildMatchSheet, type MatchSheetInput } from './matchSheet';
import { renderPdf } from './render';

function deliver({
  document,
  filename,
  shareTitle,
}: PdfExport): Promise<PdfOutcome> {
  return shareOrDownloadPdf(renderPdf(document), filename, shareTitle);
}

export function exportMatchSheet(
  input: MatchSheetInput,
  i18n: PdfI18n
): Promise<PdfOutcome> {
  return deliver(buildMatchSheet(input, i18n));
}

export function exportAttendanceReport(
  input: AttendanceReportInput,
  i18n: PdfI18n
): Promise<PdfOutcome> {
  return deliver(buildAttendanceReport(input, i18n));
}
