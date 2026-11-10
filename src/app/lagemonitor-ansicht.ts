/**
 * Welche Ansicht der Lagemonitor zeigt.
 *
 * Neu im Meldekopf. Der Erfassungsbogen kennt eine Ansicht: übereinanderliegende
 * Zeilen (`lagemonitor-ui.tsx`). Die Tafel (`lagetafel-ui.tsx`) steht daneben,
 * die Zeilen bleiben die Vorgabe.
 *
 * Die Wahl liegt geräteweit unter `eeb.lageansicht.v1`: Sie hängt am Fernseher,
 * nicht am Einsatz. Monitor und Einsatzansicht teilen den Speicher; wer am
 * Arbeitsplatz umstellt, stellt den Fernseher um (`storage`-Ereignis), ohne
 * dass jemand mit der Maus auf den zweiten Bildschirm muss. Keine Personendaten;
 * der Schlüssel wandert mit der Datensicherung und fällt mit „Alle Daten löschen".
 *
 * Klein gehalten wie `lagemonitor-kennung.ts`: Die Einsatzansicht braucht nur
 * die Wahl, nicht die Tafel selbst.
 */

export type LageAnsicht = "zeilen" | "tafel";

export const ANSICHT_SCHLUESSEL = "eeb.lageansicht.v1";

/** Wie die Ansichten in der Oberfläche heißen. */
export const ANSICHT_NAME: Record<LageAnsicht, string> = { zeilen: "Zeilen", tafel: "Tafel" };

/** Gemerkte Ansicht; ohne Wahl und bei gesperrtem Speicher die Zeilen. */
export function lageAnsichtLaden(): LageAnsicht {
  try {
    return globalThis.localStorage?.getItem(ANSICHT_SCHLUESSEL) === "tafel" ? "tafel" : "zeilen";
  } catch {
    return "zeilen";
  }
}

/**
 * Ansicht merken. Die Vorgabe „zeilen" wird nicht geschrieben, sondern der
 * Eintrag entfernt. `false`, wenn der Speicher voll oder gesperrt ist: Dann
 * gilt die Wahl nur in dem Fenster, in dem sie getroffen wurde.
 */
export function lageAnsichtMerken(ansicht: LageAnsicht): boolean {
  try {
    const s = globalThis.localStorage;
    if (!s) return false;
    if (ansicht === "tafel") s.setItem(ANSICHT_SCHLUESSEL, "tafel");
    else s.removeItem(ANSICHT_SCHLUESSEL);
    return true;
  } catch {
    return false;
  }
}
