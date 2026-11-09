/**
 * Herkunft: Erfassungsbogen `src/app/stand-uhr.ts` (Commit 1d7ed5f).
 */
/**
 * Geht eine Uhr falsch, steht „Stand“ des Bogens nach dem Eingang am Meldekopf (R13-A3).
 *
 * Der Stand eines Bogens ist die Uhrzeit des Absenders, der Eingang die Uhrzeit dieses Geräts. Ein Bogen kann
 * nicht nach seinem Eintreffen geschrieben worden sein: Liegt der Stand mehr als einige Minuten hinter dem
 * Eingang, geht entweder die Uhr dieses Geräts nach (dann sind alle Eintreff- und Abrückzeiten falsch) oder die
 * des Absenders vor. Maßstab ist der Eingang auf dem Gerät und nicht die korrigierbare Eintreffzeit: Wer eine
 * Einheit vom Meldeblock mit früherer Zeit nachträgt, hat keine falsche Uhr.
 */

import type { MeldeEintrag } from "@bos/meldekopf/einsaetze";
import { zeitpunktZuMs } from "../eintrag-zeiten";

/** Wie weit der Stand hinter dem Eingang liegen darf, ohne aufzufallen (Uhren gehen einige Minuten auseinander). */
export const STAND_NACH_EINTREFFEN_TOLERANZ_MS = 10 * 60_000;

export const STAND_NACH_EINTREFFEN_TEXT = "Stand liegt nach dem Eintreffen — Geräteuhr oder Uhr des Absenders prüfen";

/** Liegt der Stand der Meldung deutlich nach ihrem Eingang auf diesem Gerät? */
export function standLiegtNachEintreffen(e: Pick<MeldeEintrag, "bogen" | "empfangenAm" | "quelle">): boolean {
  // Von Hand erfasst: Der Stand ist die Uhr dieses Geräts, es gibt nichts zu vergleichen.
  if (e.quelle === "manuell") return false;
  return zeitpunktZuMs(e.bogen.stand) - e.empfangenAm > STAND_NACH_EINTREFFEN_TOLERANZ_MS;
}

/**
 * Satz für die Quittung des Einlesens: nennt, wie viele der eben aufgenommenen Meldungen einen Stand nach dem
 * Eintreffen tragen. Leer, wenn keine betroffen ist.
 */
export function standNachEintreffenQuittung(eintraege: readonly Pick<MeldeEintrag, "bogen" | "empfangenAm" | "quelle">[]): string {
  const n = eintraege.filter(standLiegtNachEintreffen).length;
  if (n === 0) return "";
  return `⚠ ${n} ${n === 1 ? "Meldung" : "Meldungen"}: ${STAND_NACH_EINTREFFEN_TEXT}.`;
}
