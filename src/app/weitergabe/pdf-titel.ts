/**
 * Herkunft: Erfassungsbogen `src/app/pdf-titel.ts` (Commit 1d7ed5f).
 */
/**
 * Lageblatt und Blanko-Vordruck als PDF erkennen (R11-A3).
 *
 * Beide tragen weder Bögen noch eine Sammlung: Das Lageblatt ist zum Lesen und Aushängen da, der Vordruck
 * zum Ausfüllen von Hand. Wer nach einem Geräteausfall nur diese Datei im Postfach findet und sie einlesen
 * will, bekam „keine Bögen gefunden" — ohne den Hinweis, dass die Sammel-PDF der lesbare Träger ist. Erkannt
 * wird am Titel in den PDF-Metadaten (`info.title`), den pdfmake setzt.
 */

const LATIN1 = new TextDecoder("latin1");

/** Zeichenkette eines PDF-Strings ab Position `i` (Literal in Klammern oder Hex in spitzen Klammern). */
function pdfString(text: string, i: number): string {
  while (i < text.length && /\s/.test(text[i]!)) i++;
  let bytes: number[] = [];
  if (text[i] === "(") {
    let tiefe = 0;
    for (i++; i < text.length; i++) {
      const z = text[i]!;
      if (z === "\\") {
        const n = text[++i] ?? "";
        const einfach: Record<string, number> = { n: 10, r: 13, t: 9, b: 8, f: 12, "(": 40, ")": 41, "\\": 92 };
        if (n in einfach) {
          bytes.push(einfach[n]!);
        } else if (/[0-7]/.test(n)) {
          let o = n;
          while (o.length < 3 && /[0-7]/.test(text[i + 1] ?? "")) o += text[++i];
          bytes.push(parseInt(o, 8) & 255);
        } else {
          bytes.push(n.charCodeAt(0) & 255);
        }
        continue;
      }
      if (z === "(") tiefe++;
      if (z === ")") {
        if (tiefe === 0) break;
        tiefe--;
      }
      bytes.push(z.charCodeAt(0) & 255);
    }
  } else if (text[i] === "<") {
    const ende = text.indexOf(">", i);
    const hex = text.slice(i + 1, ende < 0 ? undefined : ende).replace(/\s+/g, "");
    bytes = hex.match(/../g)?.map((h) => parseInt(h, 16)) ?? [];
  } else {
    return "";
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    let aus = "";
    for (let k = 2; k + 1 < bytes.length; k += 2) aus += String.fromCharCode((bytes[k]! << 8) | bytes[k + 1]!);
    return aus;
  }
  return bytes.map((b) => String.fromCharCode(b)).join("");
}

/** Titel aus den PDF-Metadaten; leer, wenn keiner lesbar ist. */
export function pdfTitel(bytes: Uint8Array): string {
  const text = LATIN1.decode(bytes);
  const ref = /\/Title\s+(\d+)\s+\d+\s+R/.exec(text);
  if (ref) {
    const obj = new RegExp(`(?:^|[\\r\\n])${ref[1]}\\s+\\d+\\s+obj\\s*`).exec(text);
    return obj ? pdfString(text, obj.index + obj[0].length).trim() : "";
  }
  const direkt = /\/Title\s*(?=[(<])/.exec(text);
  return direkt ? pdfString(text, direkt.index + direkt[0].length).trim() : "";
}

/** Was für eine reine Leseausgabe ist die PDF? `null` für alles andere (Sammel-PDF, Einzelbogen, fremde PDF). */
export function pdfLeseausgabe(bytes: Uint8Array): "lageblatt" | "blanko" | null {
  const titel = pdfTitel(bytes);
  if (/^Lageblatt\b/i.test(titel)) return "lageblatt";
  if (/Blanko-Vordruck/i.test(titel)) return "blanko";
  return null;
}

/**
 * Meldung für eine Lageblatt- oder Blanko-PDF, die als Bogen oder Sammlung gelesen werden sollte; `null`, wenn
 * die Datei etwas anderes ist.
 */
export function leseausgabeMeldung(bytes: Uint8Array, dateiname: string): string | null {
  const art = pdfLeseausgabe(bytes);
  if (art === "lageblatt") {
    return `„${dateiname}“ ist ein Lageblatt — nur zum Lesen, Aushängen und Abgleichen, es enthält keine Bögen. Zum Weiterarbeiten die Sammel-PDF laden („Einsatz weitergeben / sichern“ am Meldekopf): mit „Einsatz importieren…“ oder „Bögen einlesen…“.`;
  }
  if (art === "blanko") {
    return `„${dateiname}“ ist ein leerer Blanko-Vordruck zum Ausfüllen von Hand — es steht kein Bogen darin. Ausgefüllt wird er in der App abgetippt.`;
  }
  return null;
}
