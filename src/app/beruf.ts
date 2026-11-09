/**
 * Herkunft: Erfassungsbogen `src/app/beruf.ts` (Commit 1d7ed5f).
 */
/**
 * Berufe neben den „weiteren Qualifikationen".
 *
 * Rückmeldung aus einem THW-Ortsverband: Im Feld „Weitere Qualifikationen"
 * dürfen nur Qualifikationen stehen (THW: die aus THWin), die Berufe brauchen
 * darunter ein eigenes Feld. Im Vordruck landen beide in der Tabelle „weitere
 * interne / externe Qualifikationen obiger Helfer/-innen".
 *
 * Der Bogen kennt für beides nur `Person.zusatzqualifikationen` — ein eigenes
 * Feld hieße Schema-Sprung im Transportformat (eeb-format), und ältere
 * App-Stände könnten den Bogen nicht mehr lesen. Stattdessen trägt ein Beruf
 * im Freitext das Präfix „Beruf: " (dasselbe Muster wie die DLRG-Kennzahl
 * vor der Bezeichnung): Die App trennt daran die beiden Felder, jeder andere
 * Leser — alter App-Stand, Meldekopf-Filter, CSV eines Fremden — sieht den
 * Klartext „Beruf: Elektroniker/in" und versteht ihn ohne Vokabular.
 */

import type { Person, VokabularWert } from "@bos/eeb-format";

/** Kennzeichnung eines Berufs im Freitext — nur die App liest sie als Markierung. */
export const BERUF_PRAEFIX = "Beruf: ";

/** Ob ein Eintrag der Zusatzqualifikationen ein Beruf ist (Freitext mit Präfix). */
export function istBeruf(w: VokabularWert): boolean {
  return w.code == null && (w.freitext ?? "").startsWith(BERUF_PRAEFIX);
}

/** Berufsbezeichnung ohne Präfix — zur Anzeige im Berufsfeld und in der Tabelle. */
export function berufText(w: VokabularWert): string {
  const t = w.freitext ?? "";
  return (t.startsWith(BERUF_PRAEFIX) ? t.slice(BERUF_PRAEFIX.length) : t).trim();
}

/** Berufsbezeichnung → Eintrag für `zusatzqualifikationen`. Ein schon markierter Text bleibt, wie er ist. */
export function alsBeruf(text: string): VokabularWert {
  const t = text.trim();
  return { freitext: t.startsWith(BERUF_PRAEFIX) ? t : BERUF_PRAEFIX + t };
}

/** Zusatzqualifikationen einer Person, getrennt in Qualifikationen und Berufe (Reihenfolge bleibt). */
export function qualifikationenUndBerufe(p: Pick<Person, "zusatzqualifikationen">): {
  qualifikationen: VokabularWert[];
  berufe: VokabularWert[];
} {
  const qualifikationen: VokabularWert[] = [];
  const berufe: VokabularWert[] = [];
  for (const w of p.zusatzqualifikationen) (istBeruf(w) ? berufe : qualifikationen).push(w);
  return { qualifikationen, berufe };
}

/** Beide Listen wieder zu einem Feld: erst Qualifikationen, dann Berufe — so liest es auch die Tabelle. */
export function zusatzqualifikationenAus(qualifikationen: readonly VokabularWert[], berufe: readonly VokabularWert[]): VokabularWert[] {
  return [...qualifikationen, ...berufe.map(berufText).filter(Boolean).map(alsBeruf)];
}
