/**
 * Herkunft: Erfassungsbogen `src/app/lagemonitor-beginn.ts` (Commit 1d7ed5f).
 *
 * Einsatzbeginn und Funkrufname für den Lagemonitor.
 *
 * Wann ein Einsatz „anfängt" und unter welchem Funkrufnamen die Führungsstelle
 * auftritt, entscheidet die Führung je Einsatz — beides steht in keinem
 * Erfassungsbogen. Deshalb liegt es hier, getrennt vom Schema: je Einsatz-
 * Kennung ein von Hand gesetzter Wert (`lagemonitor-speicher.ts`). Der Beginn
 * liegt unter `eeb.lagebeginn.v1`, der Funkrufname unter `eeb.lagefunkruf.v1`.
 * Keine Personendaten; die Einträge wandern mit der Datensicherung und fallen
 * mit „Alle Daten löschen".
 */

import { einsatzWerte } from "./lagemonitor-speicher";

export const BEGINN_SCHLUESSEL = "eeb.lagebeginn.v1";
export const FUNKRUF_SCHLUESSEL = "eeb.lagefunkruf.v1";

/** So lang darf der Funkrufname sein — die Zeile am Fernseher bricht sonst um. */
export const FUNKRUF_MAX = 60;

const beginne = einsatzWerte<number>(BEGINN_SCHLUESSEL, (x): x is number => typeof x === "number" && Number.isFinite(x));
const funkrufe = einsatzWerte<string>(FUNKRUF_SCHLUESSEL, (x): x is string => typeof x === "string" && x.trim() !== "");

/** Gesetzter Beginn (Date.now()-Wert) oder `null`, wenn keiner gesetzt ist. */
export function einsatzbeginnLaden(einsatzId: string): number | null {
  return beginne.laden(einsatzId);
}

/**
 * Beginn setzen oder mit `null` entfernen. `bekannteIds` sind die Einsätze, die
 * es gibt; alle anderen Einträge fallen dabei weg. Liefert `false`, wenn der
 * Speicher voll oder gesperrt ist.
 */
export function einsatzbeginnSetzen(einsatzId: string, beginn: number | null, bekannteIds: readonly string[]): boolean {
  return beginne.setzen(einsatzId, beginn, bekannteIds);
}

/** Gesetzter Funkrufname oder `null`, wenn keiner gesetzt ist. */
export function einsatzFunkrufLaden(einsatzId: string): string | null {
  return funkrufe.laden(einsatzId);
}

/**
 * Funkrufname setzen; leer oder nur Leerzeichen entfernt ihn. Der Name wird
 * getrimmt und auf {@link FUNKRUF_MAX} Zeichen gekürzt.
 */
export function einsatzFunkrufSetzen(einsatzId: string, name: string, bekannteIds: readonly string[]): boolean {
  const sauber = name.trim().slice(0, FUNKRUF_MAX).trim();
  return funkrufe.setzen(einsatzId, sauber === "" ? null : sauber, bekannteIds);
}

/** Ab so vielen Tagen zurück fragt das Feld „Einsatzbeginn" nach dem Jahr (R11-E6). */
export const BEGINN_ZURUECK_TAGE = 31;
/** Wie weit ein Beginn in der Zukunft liegen darf, ohne zu fragen (Uhren gehen nach). */
const BEGINN_ZUKUNFT_TOLERANZ_MS = 5 * 60_000;

/**
 * Plausibilitätssatz zum eingetragenen Beginn („Jahr prüfen / liegt in der Zukunft", R11-E6): Ein Zahlendreher im
 * Jahr stand sonst erst auf dem Fernseher vor dem Stab („365 Tage" oder „Einsatz beginnt noch"). Leer, wenn der
 * Beginn passt oder fehlt.
 */
export function beginnHinweis(beginn: number | null, jetzt: number): string {
  if (beginn == null) return "";
  const d = new Date(beginn);
  const jahr = d.getFullYear();
  if (beginn - jetzt > BEGINN_ZUKUNFT_TOLERANZ_MS) {
    return `Der Beginn liegt in der Zukunft (${jahr}). Jahr prüfen — der Monitor zeigt bis dahin „Einsatz beginnt noch".`;
  }
  const tage = Math.floor((jetzt - beginn) / 86_400_000);
  if (tage >= BEGINN_ZURUECK_TAGE) {
    return `Der Beginn liegt ${tage} Tage zurück (${jahr}). Jahr prüfen — der Monitor zeigt „seit Beginn: ${tage} Tage …".`;
  }
  return "";
}
