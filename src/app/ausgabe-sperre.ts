/**
 * Herkunft: Erfassungsbogen `src/app/ausgabe-sperre.ts` (Commit 1d7ed5f).
 */
/**
 * Ausgaben der Einsatzansicht (Sammel-PDF, Lageblatt, Blanko, CSV, Excel): Tipp-Sperre und leerer Einsatz.
 *
 * R12-G2: Ein zweiter Tipp erzeugte jedes Mal eine zweite, gleichnamige Datei. Die PDF-Wege sperrte `arbeiten`
 * (arbeitet.ts) nur, solange die Erzeugung lief; das Lageblatt (0,2 s) und die Tabellenformate (sofort) waren
 * danach wieder frei, und ein Handschuh-Doppeltipp kommt bis rund eine Sekunde später. Darum gilt hier eine
 * Sperre je Ausgabe von `AUSGABE_SPERRE_MS` ab dem ersten Tipp, unabhängig davon, wie schnell die Datei fertig ist.
 *
 * R12-E5: Ein Einsatz ohne Einheit liefert nur leere Dateien; die Ausgaben sagen das, statt „Seit dem letzten
 * Sammel-PDF …" zu behaupten.
 */

import { ORTSSPERRE_MS } from "@bos/oberflaeche/tipp-schutz";

/** So lange nimmt eine Ausgabe nach dem ersten Tipp keinen weiteren an (Prüfstand: 0 wie die übrigen Sperren). */
export const AUSGABE_SPERRE_MS: number = ORTSSPERRE_MS === 0 ? 0 : Math.max(ORTSSPERRE_MS, 2000);

const zuletzt = new Map<string, number>();
let aktiveSperreMs: number = AUSGABE_SPERRE_MS;

/** Für Tests der Oberfläche: Testing Library klickt schneller als jeder Finger (wie `prellschutzSetzen`). */
export function ausgabeSperreSetzen(ms: number): void {
  aktiveSperreMs = ms;
}

/**
 * Darf die Ausgabe `schluessel` jetzt starten? `true` und vermerkt, wenn die letzte mindestens `sperreMs` her ist;
 * sonst `false` (der Tipp ist ein Doppeltipp und tut nichts).
 */
export function ausgabeFrei(schluessel: string, jetzt: number = Date.now(), sperreMs: number = aktiveSperreMs): boolean {
  const davor = zuletzt.get(schluessel);
  if (sperreMs > 0 && davor != null && jetzt - davor < sperreMs) return false;
  zuletzt.set(schluessel, jetzt);
  return true;
}

/**
 * Darf der Tipp `ereignis` die Ausgabe `schluessel` starten? Gemessen wird an der Ereigniszeit (`timeStamp`, wann der
 * Finger tippte), nicht daran, wann die App den Tipp bearbeitet (R13-G1): Das Sammel-PDF blockiert den Hauptfaden für
 * Sekunden, ein Doppeltipp nach 150 ms wurde erst danach bearbeitet und galt dann als „lange genug her". Ein Tipp,
 * der in einen laufenden oder gerade beendeten Lauf fiel (`tippWaehrendLauf`), tut nichts.
 */
export function ausgabeFreiBeiTipp(
  schluessel: string,
  ereignis: { timeStamp: number } | undefined,
  wahrend: (zeit: number) => boolean,
  sperreMs: number = aktiveSperreMs,
): boolean {
  const zeit = ereignis && Number.isFinite(ereignis.timeStamp) && ereignis.timeStamp > 0 ? ereignis.timeStamp : undefined;
  if (zeit !== undefined && sperreMs > 0 && wahrend(zeit)) return false;
  return ausgabeFrei(schluessel, zeit ?? Date.now(), sperreMs);
}

/** Nur für Tests. */
export function ausgabeSperreZuruecksetzen(): void {
  zuletzt.clear();
}

/** Einsatz weitergeben / sichern ohne Einheit: keine Datei, und kein Bezug auf ein „letztes Sammel-PDF". */
export const LEERER_EINSATZ_TEXT = "Noch keine Einheit im Einsatz — nichts zu sichern.";
/** Tabellenformate und Lageblatt ohne Einheit: Die Datei entsteht, ist aber leer. */
export const LEERE_DATEI_TEXT = "Noch keine Einheit im Einsatz — die Datei enthält keine Zeilen.";

/** Hat der Einsatz keine einzige Meldung? */
export function einsatzLeer(s: { eintraege: readonly unknown[] }): boolean {
  return s.eintraege.length === 0;
}
