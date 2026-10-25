/**
 * Herkunft: Erfassungsbogen `src/app/unlesbar-aufraeumen.ts` (Commit 441811c).
 *
 * „Beiseitegelegtes entfernen…“ räumt auch am Ursprungsort auf (R9-E4).
 *
 * Bei beschädigten Vorlagen (und bei Sammlungen mit einzelnen unlesbaren Teilen) blieb der Originaltext
 * unter `eeb.vorlagen.v1` bzw. `eeb.einsaetze.v1` stehen: Nach dem Neuladen legte die App ihn erneut
 * beiseite, und der Fund kam zurück. Darum ersetzt das Entfernen den Originaltext durch den lesbaren Rest
 * (bei einem Text, der gar keine Liste ist: durch `[]`). Vor dem Entfernen fragt die Oberfläche; die
 * Sicherung („Daten sichern…“) enthält den Rohtext.
 *
 * Geschrieben wird am Kern und an den Hüllen vorbei, direkt in den Speicher: Die Hülle um die Sammlungen
 * sperrt das Schreiben, solange ein Text nicht beiseitegelegt werden konnte (R9-O1) — genau dann ist das
 * ausdrückliche Verwerfen der Ausweg.
 */

import { einsaetzeAusJson, einsaetzeZuJson } from "@bos/meldekopf/einsaetze";
import {
  rettungOffenVergessen,
  unlesbarVerwerfen,
  unlesbarerGesamttext,
  unlesbareSammlungsteile,
  unlesbareVorlagenteile,
} from "./unlesbar";
import { vorlagenAusJson, vorlagenZuJson } from "../vorlagen";

const SAMMLUNGEN = "eeb.einsaetze.v1";
const VORLAGEN = "eeb.vorlagen.v1";
const ABSENDERKARTE = "eeb.absenderkarte.v1";

function speicher(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Den Originaltext durch den lesbaren Rest ersetzen — nur, wenn er Unlesbares enthält. */
function ersetzen(s: Storage, schluessel: string, hatUnlesbares: (roh: string) => boolean, rest: (roh: string) => string): boolean {
  const roh = s.getItem(schluessel);
  if (roh == null || !hatUnlesbares(roh)) return true;
  try {
    s.setItem(schluessel, rest(roh));
    return true;
  } catch {
    return false;
  }
}

/**
 * Beiseitegelegtes endgültig entfernen und die Originale bereinigen. Rückgabe: false, wenn ein Original
 * sich nicht ersetzen ließ (dann kommt der Fund nach dem Neuladen wieder).
 */
export function beiseitegelegtesEntfernen(): boolean {
  unlesbarVerwerfen();
  const s = speicher();
  if (!s) return true;
  let ok = true;
  try {
    ok = ersetzen(
      s,
      SAMMLUNGEN,
      (roh) => {
        const t = unlesbareSammlungsteile(roh);
        return t.sammlungen.length > 0 || t.meldungen.length > 0 || unlesbarerGesamttext(roh, "sammlungen") !== null;
      },
      (roh) => einsaetzeZuJson(einsaetzeAusJson(roh)),
    );
    ok =
      ersetzen(
        s,
        VORLAGEN,
        (roh) => unlesbareVorlagenteile(roh).length > 0 || unlesbarerGesamttext(roh, "vorlagen") !== null,
        (roh) => vorlagenZuJson(vorlagenAusJson(roh)),
      ) && ok;
    // Eine beschädigte Absenderkarte zählt ohnehin als „keine Karte“: weg, sonst käme der Fund zurück (R9-O3).
    const karte = s.getItem(ABSENDERKARTE);
    if (karte != null) {
      let heil = false;
      try {
        const x: unknown = JSON.parse(karte);
        heil = x !== null && typeof x === "object" && !Array.isArray(x);
      } catch {
        /* beschädigt */
      }
      if (!heil) s.removeItem(ABSENDERKARTE);
    }
  } catch {
    ok = false;
  }
  if (ok) rettungOffenVergessen();
  return ok;
}

/**
 * Was sich einem beiseitegelegten Gesamttext ansehen lässt, auch wenn er abgeschnitten ist:
 * Namen der Sammlungen und ungefähre Zahl der Meldungen (für den Hinweis, R9-H4).
 */
export function textBeschreiben(art: "sammlungen" | "vorlagen" | "absenderkarte", text: string): { namen: string[]; zahl: number } {
  const namen: string[] = [];
  const muster = /\{"id":"[^"]*","name":"((?:[^"\\]|\\.){1,80})"/g;
  for (const m of text.matchAll(muster)) {
    try {
      const n = JSON.parse(`"${m[1]}"`) as string;
      if (n.trim() && !namen.includes(n)) namen.push(n);
    } catch {
      /* Rest eines abgeschnittenen Namens */
    }
    if (namen.length >= 3) break;
  }
  const zahl = art === "sammlungen" ? (text.match(/"einheitSchluessel":/g) ?? []).length : (text.match(/"bogen":/g) ?? []).length;
  return { namen, zahl };
}
