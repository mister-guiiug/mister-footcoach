/**
 * Relire, dans un test, un PDF sorti du générateur du socle.
 *
 * C'est possible sans bibliothèque parce que ce générateur n'écrit que des
 * flux NON compressés (`stream … endstream`, un par page, dans l'ordre des
 * pages) où chaque texte est un littéral `(…) Tj` encodé WinAnsi, un octet
 * par caractère. On relit donc exactement ce qui est dessiné, page par page.
 *
 * Pas de `TextDecoder('latin1')` : son sort des octets 0x80–0x9F varie avec
 * la version de Node (Latin-1 strict ou CP1252 du WHATWG), et ce sont
 * précisément ceux de ’ – — … œ. On décode à la main, table comprise.
 */

/** Les octets 0x80–0x9F de WinAnsi et le caractère qu'ils portent. */
const WINANSI_HIGH: Readonly<Record<number, number>> = {
  0x80: 0x20ac,
  0x82: 0x201a,
  0x83: 0x0192,
  0x84: 0x201e,
  0x85: 0x2026,
  0x86: 0x2020,
  0x87: 0x2021,
  0x88: 0x02c6,
  0x89: 0x2030,
  0x8a: 0x0160,
  0x8b: 0x2039,
  0x8c: 0x0152,
  0x8e: 0x017d,
  0x91: 0x2018,
  0x92: 0x2019,
  0x93: 0x201c,
  0x94: 0x201d,
  0x95: 0x2022,
  0x96: 0x2013,
  0x97: 0x2014,
  0x98: 0x02dc,
  0x99: 0x2122,
  0x9a: 0x0161,
  0x9b: 0x203a,
  0x9c: 0x0153,
  0x9e: 0x017e,
  0x9f: 0x0178,
};

/** Un octet = un caractère : le fichier tel quel, lisible par des regex. */
export function pdfBinary(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 0x2000) {
    out += String.fromCharCode(...bytes.subarray(i, i + 0x2000));
  }
  return out;
}

/** Les flux de contenu, un par page, octets bruts. */
export function pdfStreams(bytes: Uint8Array): string[] {
  return [...pdfBinary(bytes).matchAll(/stream\n([\s\S]*?)\nendstream/g)].map(
    m => m[1]!
  );
}

function decodeLiteral(literal: string): string {
  let out = '';
  for (let i = 0; i < literal.length; i += 1) {
    let code = literal.charCodeAt(i);
    if (code === 0x5c) {
      i += 1; // « \( », « \) », « \\ » : le caractère qui suit, tel quel
      code = literal.charCodeAt(i);
    }
    out += String.fromCodePoint(WINANSI_HIGH[code] ?? code);
  }
  return out;
}

/** Les textes dessinés, page par page, rendus à l'Unicode. */
export function pdfPages(bytes: Uint8Array): string[][] {
  return pdfStreams(bytes).map(stream =>
    [...stream.matchAll(/\(((?:\\[\s\S]|[^\\)])*)\) Tj/g)].map(m =>
      decodeLiteral(m[1]!)
    )
  );
}

/** Tout le texte du document, page après page. */
export function pdfText(bytes: Uint8Array): string[] {
  return pdfPages(bytes).flat();
}
