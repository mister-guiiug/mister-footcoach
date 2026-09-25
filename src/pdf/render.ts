/**
 * La mise en page : un `PdfDocument` → les octets d'un PDF A4 portrait.
 *
 * LE GÉNÉRATEUR EST CELUI DU SOCLE (`@mister-guiiug/dev-pwa-config/pdf`), sans
 * dépendance : des rectangles, des traits et du texte Helvetica, rien de plus
 * — c'est tout ce qu'une feuille de match et un tableau de présences
 * demandent. Pas de jsPDF, pas de centaines de kilo-octets pour deux
 * documents ; et ce module n'est chargé qu'au clic sur « Exporter en PDF ».
 *
 * CE QUE LE MODULE DU SOCLE NE FAIT PAS, ET QUI EST ICI :
 *  - le retour à la ligne (la largeur d'un mot vient de `textWidth`, une
 *    heuristique : on garde donc une marge dans chaque cellule) ;
 *  - la pagination : une ligne de tableau n'est jamais coupée entre deux
 *    pages, l'en-tête du tableau est répété en haut de la suivante, un titre
 *    de section n'est jamais laissé seul en bas de page, et chaque page porte
 *    son pied (« Page 2 / 3 ») ;
 *  - l'encodage : CHAQUE chaîne passe par `toPdfText` avant d'être mesurée
 *    puis écrite. C'est le seul point de passage vers la page, donc aucun
 *    texte n'arrive au socle avec un caractère qu'il écrirait « ? » sans
 *    qu'on l'ait décidé (voir `text.ts`).
 *
 * LA COULEUR N'EST QU'UN HABILLAGE (filet vert sous le titre, fond des
 * en-têtes de tableau, une ligne sur deux grisée) : tout ce qui a un sens est
 * écrit en toutes lettres ou en chiffres, pour survivre à une photocopie.
 */
import {
  PAGE,
  PdfContent,
  buildPdf,
  textWidth,
  type Rgb,
} from '@mister-guiiug/dev-pwa-config/pdf';
import type { PdfBlock, PdfDocument } from './document';
import { toPdfText } from './text';

const MARGIN_X = 42;
const RIGHT = PAGE.w - MARGIN_X;
const WIDTH = RIGHT - MARGIN_X;
const TOP = 40;
/** Dernière ordonnée utile : en dessous, le pied de page. */
const BOTTOM = PAGE.h - 50;
const FOOTER_BASELINE = PAGE.h - 30;

const INK: Rgb = [0.11, 0.11, 0.11];
/** Gris des libellés et des notes : 7:1 sur le blanc du papier. */
const MUTED: Rgb = [0.35, 0.35, 0.35];
/** Le vert primaire de l'app (#15803d). */
const ACCENT: Rgb = [0.08, 0.5, 0.24];
const HEADER_FILL: Rgb = [0.9, 0.95, 0.91];
const ZEBRA: Rgb = [0.96, 0.96, 0.96];

const BODY = 10;
const LEADING = 13;
const CELL = 9.5;
const CELL_LEADING = 11.5;
const HEAD = 8.5;
const HEAD_LEADING = 10.5;
const PAD = 2.5;
const SIGNATURE_HEIGHT = 60;
const BLOCK_GAP = 8;

/**
 * Ce qui doit tenir SOUS un titre pour qu'il ne reste pas seul en bas de
 * page : le bloc de signatures entier (il ne se coupe pas), l'en-tête d'un
 * tableau et sa première ligne, ou deux lignes de texte.
 */
function keepWithNext(next: PdfBlock | undefined): number {
  switch (next?.kind) {
    case 'signatures':
      return SIGNATURE_HEIGHT;
    case 'table':
      return 36;
    default:
      return LEADING * 2;
  }
}

/**
 * Largeur d'un texte, par EXCÈS. `textWidth` du socle compte une minuscule
 * pour un demi-cadratin quand Helvetica en dessine le plus souvent 0,556 : sur
 * une ligne de texte courant, il sous-estime d'environ 10 %, et du double en
 * gras. Relevé sur un aperçu du rapport d'assiduité : la légende débordait de
 * la marge droite. Mieux vaut une ligne coupée un mot trop tôt qu'un texte
 * qui mord sur la cellule voisine ou sort de la page.
 */
function measure(text: string, size: number, bold = false): number {
  return textWidth(text, size) * (bold ? 1.2 : 1.1);
}

/**
 * Découpe un texte DÉJÀ ENCODÉ en lignes tenant dans `width`. Un mot plus
 * large que la colonne (une adresse e-mail, un nom composé sans espace) est
 * coupé au caractère plutôt que de déborder. Rend toujours au moins une
 * ligne, éventuellement vide : une cellule vide a une hauteur.
 */
export function wrapText(
  text: string,
  size: number,
  width: number,
  bold = false
): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ').filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    if (measure(candidate, size, bold) <= width) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = '';
    for (const ch of word) {
      if (line && measure(line + ch, size, bold) > width) {
        lines.push(line);
        line = ch;
      } else {
        line += ch;
      }
    }
  }
  lines.push(line);
  return lines;
}

/** Met le document en page, sur autant de feuilles A4 que nécessaire. */
export function renderPdf(doc: PdfDocument): Uint8Array {
  const title = toPdfText(doc.title);
  const subtitle = doc.subtitle ? toPdfText(doc.subtitle) : '';
  const kicker = doc.kicker ? toPdfText(doc.kicker) : '';

  const pages: PdfContent[] = [];
  // Posée par `startPage()`, appelée avant le premier bloc.
  let page!: PdfContent;
  let y = TOP;

  function startPage(): void {
    page = new PdfContent();
    pages.push(page);
    y = TOP;
    if (pages.length === 1) {
      if (kicker) {
        for (const l of wrapText(kicker, 10, WIDTH, true)) {
          page.text(MARGIN_X, y + 10, 10, l, { bold: true, color: ACCENT });
          y += 14;
        }
        y += 2;
      }
      for (const l of wrapText(title, 18, WIDTH, true)) {
        page.text(MARGIN_X, y + 17, 18, l, { bold: true, color: INK });
        y += 22;
      }
      if (subtitle) {
        for (const l of wrapText(subtitle, 12, WIDTH)) {
          page.text(MARGIN_X, y + 12, 12, l, { color: INK });
          y += 16;
        }
      }
      y += 6;
      page.fillRect(MARGIN_X, y, WIDTH, 1.5, ACCENT);
    } else {
      // Une page de suite dit de quel document elle est la suite : les
      // feuilles d'une liasse se séparent.
      // `wrapText` rend toujours au moins une ligne : la première suffit.
      const running = subtitle ? `${title} – ${subtitle}` : title;
      page.text(MARGIN_X, y + 8, HEAD, wrapText(running, HEAD, WIDTH)[0]!, {
        color: MUTED,
      });
      y += 12;
      page.line(MARGIN_X, y, RIGHT, y, 0.5, 0.75);
    }
    y += 12;
  }

  /** Change de page si `height` ne tient plus ; dit si c'est arrivé. */
  function ensure(height: number): boolean {
    if (y + height <= BOTTOM) return false;
    startPage();
    return true;
  }

  function renderBlock(block: PdfBlock, next: PdfBlock | undefined): void {
    switch (block.kind) {
      case 'heading': {
        const lines = wrapText(toPdfText(block.text), 11, WIDTH, true);
        ensure(lines.length * 14 + 5 + keepWithNext(next));
        for (const l of lines) {
          page.text(MARGIN_X, y + 10.5, 11, l, { bold: true, color: INK });
          y += 14;
        }
        page.line(MARGIN_X, y, RIGHT, y, 0.5, 0.8);
        y += 5;
        return;
      }

      case 'fields': {
        // Deux couples par ligne quand le bloc le demande : c'est ce qui
        // tient la feuille d'un match à jouer sur UNE page A4.
        // Même colonne de libellés dans les deux formes : les valeurs d'un
        // bloc à deux colonnes et d'un bloc pleine largeur qui se suivent
        // commencent au même aplomb.
        const perLine = block.columns ?? 1;
        const gutter = 16;
        const cellWidth = (WIDTH - gutter * (perLine - 1)) / perLine;
        const labelWidth = 110;
        const gap = 8;
        for (let i = 0; i < block.rows.length; i += perLine) {
          const cells = block.rows.slice(i, i + perLine).map(row => ({
            label: wrapText(toPdfText(row.label), 9, labelWidth, true),
            value: wrapText(
              toPdfText(row.value),
              BODY,
              cellWidth - labelWidth - gap
            ),
          }));
          const lines = Math.max(
            ...cells.map(c => Math.max(c.label.length, c.value.length))
          );
          ensure(lines * LEADING);
          cells.forEach((cell, c) => {
            const x = MARGIN_X + c * (cellWidth + gutter);
            cell.label.forEach((l, j) =>
              page.text(x, y + 10 + j * LEADING, 9, l, {
                bold: true,
                color: MUTED,
              })
            );
            cell.value.forEach((l, j) =>
              page.text(x + labelWidth + gap, y + 10 + j * LEADING, BODY, l, {
                color: INK,
              })
            );
          });
          y += lines * LEADING + 2;
        }
        return;
      }

      case 'text': {
        const muted = block.tone === 'muted';
        const size = muted ? 9 : BODY;
        const leading = muted ? 12 : LEADING;
        for (const l of wrapText(toPdfText(block.text), size, WIDTH)) {
          ensure(leading);
          page.text(MARGIN_X, y + size, size, l, {
            color: muted ? MUTED : INK,
          });
          y += leading;
        }
        return;
      }

      case 'table': {
        // Les fabriques rendent des lignes de la largeur de leurs colonnes :
        // la cellule `i` a toujours sa colonne `i`.
        const columns = block.columns.map((c, i, all) => ({
          width: c.width * WIDTH,
          left:
            MARGIN_X +
            all.slice(0, i).reduce((sum, prev) => sum + prev.width * WIDTH, 0),
          alignRight: c.align === 'right',
        }));
        const layoutRow = (cells: string[], size: number, bold: boolean) =>
          cells.map((cell, i) =>
            wrapText(toPdfText(cell), size, columns[i]!.width - 2 * PAD, bold)
          );
        const heightOf = (cells: string[][], leading: number) =>
          Math.max(1, ...cells.map(c => c.length)) * leading + 2 * PAD;
        const drawRow = (
          cells: string[][],
          size: number,
          leading: number,
          bold: boolean,
          fill?: Rgb
        ) => {
          const height = heightOf(cells, leading);
          if (fill) page.fillRect(MARGIN_X, y, WIDTH, height, fill);
          cells.forEach((lines, i) => {
            const column = columns[i]!;
            lines.forEach((l, j) => {
              if (!l) return;
              const x = column.alignRight
                ? column.left + column.width - PAD - measure(l, size, bold)
                : column.left + PAD;
              page.text(x, y + PAD + j * leading + leading * 0.75, size, l, {
                bold,
                color: INK,
              });
            });
          });
          y += height;
        };

        const header = layoutRow(
          block.columns.map(c => c.header),
          HEAD,
          true
        );
        const drawHeader = () =>
          drawRow(header, HEAD, HEAD_LEADING, true, HEADER_FILL);
        const rows = block.rows.map(r => layoutRow(r, CELL, false));

        // L'en-tête ne part jamais seul en bas de page : il descend avec sa
        // première ligne.
        ensure(
          heightOf(header, HEAD_LEADING) +
            (rows[0] ? heightOf(rows[0], CELL_LEADING) : 0)
        );
        drawHeader();
        rows.forEach((cells, index) => {
          if (ensure(heightOf(cells, CELL_LEADING))) drawHeader();
          drawRow(
            cells,
            CELL,
            CELL_LEADING,
            false,
            index % 2 === 1 ? ZEBRA : undefined
          );
        });
        if (block.total) {
          const total = layoutRow(block.total, CELL, true);
          if (ensure(heightOf(total, CELL_LEADING))) drawHeader();
          page.line(MARGIN_X, y, RIGHT, y, 0.8, 0.35);
          drawRow(total, CELL, CELL_LEADING, true);
        }
        page.line(MARGIN_X, y, RIGHT, y, 0.5, 0.75);
        return;
      }

      case 'signatures': {
        const gap = 12;
        const count = Math.max(1, block.labels.length);
        const width = (WIDTH - gap * (count - 1)) / count;
        const height = SIGNATURE_HEIGHT;
        ensure(height);
        block.labels.forEach((label, i) => {
          const x = MARGIN_X + i * (width + gap);
          // Le socle ne trace pas de rectangle vide : quatre traits.
          page.line(x, y, x + width, y, 0.75, 0.55);
          page.line(x + width, y, x + width, y + height, 0.75, 0.55);
          page.line(x + width, y + height, x, y + height, 0.75, 0.55);
          page.line(x, y + height, x, y, 0.75, 0.55);
          wrapText(toPdfText(label), 9, width - 12, true).forEach((l, j) =>
            page.text(x + 6, y + 14 + j * 11, 9, l, {
              bold: true,
              color: MUTED,
            })
          );
        });
        y += height;
        return;
      }
    }
  }

  startPage();
  doc.blocks.forEach((block, i) => {
    renderBlock(block, doc.blocks[i + 1]);
    // Un titre porte déjà son espace : il colle à ce qu'il annonce.
    if (block.kind !== 'heading') y += BLOCK_GAP;
  });

  // Le pied de page se pose APRÈS la mise en page : « Page 1 / 3 » demande
  // de connaître le total.
  const footer = toPdfText(doc.footer);
  pages.forEach((p, i) => {
    const label = toPdfText(doc.pageLabel(i + 1, pages.length));
    const labelWidth = measure(label, 8);
    p.line(
      MARGIN_X,
      FOOTER_BASELINE - 12,
      RIGHT,
      FOOTER_BASELINE - 12,
      0.5,
      0.8
    );
    p.text(
      MARGIN_X,
      FOOTER_BASELINE,
      8,
      wrapText(footer, 8, WIDTH - labelWidth - 16)[0]!,
      { color: MUTED }
    );
    p.text(RIGHT - labelWidth, FOOTER_BASELINE, 8, label, { color: MUTED });
  });

  return buildPdf(pages);
}
