/**
 * Le texte imprimé : ce que le générateur du socle sait écrire, les dates dans
 * la langue de l'app, et les noms de fichier.
 *
 * CE QUE LE SOCLE FAIT DU TEXTE. `@mister-guiiug/dev-pwa-config/pdf` écrit en
 * Helvetica, encodée WinAnsi (CP1252) : Latin-1, plus 27 caractères que CP1252
 * place sur 0x80–0x9F (’ “ ” – — … œ €…). Tout autre caractère devient « ? ».
 * Conséquence pratique, dans une app de club français : les noms de joueurs
 * avec accents (Théo, Éric, Loïc, Zoé) passent tels quels ; un émoji dans un
 * nom d'adversaire (« FC Rivale ⚽ ») ou d'équipe, non.
 *
 * CE QU'ON EN FAIT ICI, avant que le socle n'écrive « ? » :
 *  - les espaces exotiques (fine insécable d'`Intl`, tabulation) → espace ;
 *  - les tirets et le signe moins hors table (U+2010, U+2212…) → « - » ;
 *  - une lettre latine hors table perd son diacritique (ș → s, č → c) : un nom
 *    roumain ou tchèque reste lisible ;
 *  - un émoji, un pictogramme, un liant invisible est RETIRÉ : un « ? » au
 *    milieu d'un nom d'équipe, sur une feuille tendue à l'arbitre, se lit
 *    comme une coquille ;
 *  - une lettre d'une autre écriture (cyrillique, arabe…) devient « ? », comme
 *    le ferait le socle : la retirer ferait disparaître un nom sans que
 *    personne ne le voie, le « ? » montre qu'il manque quelque chose.
 */

/**
 * Points de code > 0xFF que WinAnsi sait écrire — la table du socle
 * (`pdf.js`, `WINANSI`), recopiée parce qu'elle n'est pas exportée.
 */
const WINANSI_EXTRAS = new Set([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030,
  0x0160, 0x2039, 0x0152, 0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022,
  0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
]);

/** Un caractère que la page peut porter tel quel. */
export function isWinAnsiChar(ch: string): boolean {
  const cp = ch.codePointAt(0)!;
  // Les contrôles (C0, DEL, C1) ne s'impriment pas. Un C1 serait même écrit
  // sur l'octet d'un autre glyphe : 0x80 est l'euro en WinAnsi.
  if (cp < 0x20 || (cp >= 0x7f && cp < 0xa0)) return false;
  return cp <= 0xff || WINANSI_EXTRAS.has(cp);
}

/** Toute la chaîne s'imprime-t-elle sans perte ? */
export function isWinAnsi(text: string): boolean {
  for (const ch of text) {
    if (!isWinAnsiChar(ch)) return false;
  }
  return true;
}

const WHITESPACE = /\s/u;
const DASH = /\p{Pd}/u;
/** Le signe moins (U+2212) est un symbole mathématique, pas un tiret. */
const MINUS_SIGN = String.fromCodePoint(0x2212);
const MARK = /\p{M}/gu;
const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u;

/**
 * Rend une chaîne sûre pour l'encodage WinAnsi (voir l'en-tête). Normalisée
 * en NFC d'abord : un « é » saisi en deux points de code (e + accent
 * combinant, fréquent au copier-coller) redevient le « é » de Latin-1.
 */
export function toPdfText(input: string): string {
  let out = '';
  for (const ch of input.normalize('NFC')) {
    if (WHITESPACE.test(ch)) out += ' ';
    else if (isWinAnsiChar(ch)) out += ch;
    else if (DASH.test(ch) || ch === MINUS_SIGN) out += '-';
    else {
      // NFKD décompose aussi les formes de compatibilité (ligature « ﬁ »,
      // chiffres pleine chasse) ; les diacritiques tombent avec `MARK`.
      const base = ch.normalize('NFKD').replace(MARK, '');
      if (base !== '' && base !== ch && isWinAnsi(base)) out += base;
      else if (LETTER_OR_DIGIT.test(ch)) out += '?';
      // Sinon : émoji, pictogramme, sélecteur de variante — retiré.
    }
  }
  return out.replace(/ {2,}/g, ' ').trim();
}

/** Ligatures qu'aucune décomposition Unicode ne sépare. */
const SLUG_LIGATURES: Readonly<Record<string, string>> = {
  œ: 'oe',
  æ: 'ae',
  ß: 'ss',
};

/**
 * Un nom de fichier lisible et sûr partout : minuscules ASCII, chiffres et
 * tirets. « FC Saint-Étienne » → « fc-saint-etienne ».
 */
export function fileSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[œæß]/g, ch => SLUG_LIGATURES[ch]!)
    .normalize('NFKD')
    .replace(MARK, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Une date en toutes lettres, dans la langue de l'app : « 10 mai 2026 »,
 * « May 10, 2026 » — ou avec le jour, « dimanche 10 mai 2026 ». En toutes
 * lettres parce qu'un « 05/10/2026 » ne dit pas s'il est lu à la française ou
 * à l'américaine, et que ce papier circule.
 *
 * Accepte une date ISO (`AAAA-MM-JJ`, lue comme un jour LOCAL, sans décalage
 * de fuseau) ou un horodatage complet. Une valeur illisible — une donnée
 * importée abîmée — est rendue telle quelle : `Intl` lèverait, et c'est tout
 * l'export qui échouerait pour une seule date.
 */
export function longDate(
  value: string | Date,
  localeTag: string,
  { weekday = false }: { weekday?: boolean } = {}
): string {
  const date =
    typeof value === 'string'
      ? new Date(value.length === 10 ? `${value}T00:00:00` : value)
      : value;
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat(localeTag, {
    ...(weekday ? { weekday: 'long' } : {}),
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}
