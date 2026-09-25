/**
 * Le modèle d'un document PDF : ce que les fabriques PURES rendent
 * (`matchSheet.ts`, `attendanceReport.ts`) et ce que `render.ts` met en page.
 *
 * POURQUOI UN MODÈLE ENTRE LES DONNÉES ET LES OCTETS. Tester un PDF en relisant
 * ses octets est possible — `render.test.ts` le fait — mais c'est un détour
 * pour vérifier qu'un joueur indisponible figure dans le bon tableau, ou que
 * la nature d'une blessure n'y figure PAS. Ici, le contenu est une donnée :
 * des titres, des couples libellé / valeur, des tableaux de chaînes. Les
 * fabriques se testent sur cette donnée, et le rendu se teste à part, sur la
 * mise en page (pagination, en-têtes répétés, encodage).
 *
 * LE TEXTE Y EST BRUT. L'encodage WinAnsi (CP1252) du générateur du socle est
 * l'affaire du rendu, qui fait passer CHAQUE chaîne par `toPdfText` au moment
 * de l'écrire : un seul point de passage, donc rien ne lui échappe.
 */
import type { useI18n } from '../i18n';

/** La fonction de traduction de l'app, telle que `useI18n()` la rend. */
export type Translate = ReturnType<typeof useI18n>['t'];

/** Ce dont une fabrique a besoin pour parler la langue de l'utilisateur. */
export interface PdfI18n {
  t: Translate;
  /** Étiquette BCP-47 passée à `Intl` pour les dates (`useI18n().localeTag`). */
  localeTag: string;
}

export interface PdfColumn {
  header: string;
  /** Part de la largeur utile, de 0 à 1 ; les parts d'un tableau font 1. */
  width: number;
  /** Les nombres s'alignent à droite, le texte à gauche (défaut). */
  align?: 'left' | 'right';
}

export interface PdfField {
  label: string;
  value: string;
}

export type PdfBlock =
  /** Titre de section, gardé avec ce qui le suit. */
  | { kind: 'heading'; text: string }
  /**
   * Couples libellé / valeur, un par ligne — ou deux côte à côte
   * (`columns: 2`) quand la place compte.
   */
  | { kind: 'fields'; rows: PdfField[]; columns?: 1 | 2 }
  /**
   * Tableau : l'en-tête est répété en haut de chaque page, une ligne n'est
   * jamais coupée entre deux pages, et `total` est mis en gras sous un filet.
   */
  | { kind: 'table'; columns: PdfColumn[]; rows: string[][]; total?: string[] }
  /** Paragraphe ; `muted` pour une note ou une légende. */
  | { kind: 'text'; text: string; tone?: 'muted' }
  /** Cadres de signature côte à côte, jamais coupés entre deux pages. */
  | { kind: 'signatures'; labels: string[] };

export interface PdfDocument {
  title: string;
  /** Ligne au-dessus du titre : le nom du club, quand il est connu. */
  kicker?: string;
  subtitle?: string;
  /** Pied de page, à gauche : l'application et la date d'édition. */
  footer: string;
  /** Pied de page, à droite : « Page 1 / 3 » dans la langue de l'app. */
  pageLabel: (page: number, total: number) => string;
  blocks: PdfBlock[];
}

/** Ce qu'une fabrique rend : le document, et de quoi le livrer. */
export interface PdfExport {
  document: PdfDocument;
  /** Nom de fichier lisible, ASCII, extension comprise. */
  filename: string;
  /** Titre proposé à la feuille de partage du système. */
  shareTitle: string;
}
