/**
 * Zuletzt offene Einsatz-Sammlung — damit ein Meldekopf-Tablet nach Neuladen,
 * Akku oder Browserneustart dort weitermacht, wo es war (Audit
 * „Arbeitsablauf", W5), statt auf der Startseite (Audit „Stress", S2). Nur für
 * einige Stunden: wer die Sammlung vor Tagen zuletzt offen hatte, beginnt
 * heute eher etwas Neues.
 *
 * Herkunft: Erfassungsbogen `src/app/app.tsx` (Commit 441811c),
 * `letztenEinsatzMerken`/`letztenEinsatzLaden`; hier als eigenes Modul, weil
 * auch der Fehlerfänger (main.tsx) den Schlüssel kennen muss. Derselbe
 * Schlüssel wie im Erfassungsbogen (ADR-007).
 */

import { einsaetzeLaden } from "./einsaetze-lesen";

export const LETZTER_EINSATZ_SCHLUESSEL = "eeb.letzterEinsatz.v1";
export const LETZTER_EINSATZ_FRIST_MS = 12 * 60 * 60 * 1000;

export function letztenEinsatzMerken(id: string | null): void {
  try {
    if (id) localStorage.setItem(LETZTER_EINSATZ_SCHLUESSEL, JSON.stringify({ id, um: Date.now() }));
    else localStorage.removeItem(LETZTER_EINSATZ_SCHLUESSEL);
  } catch {
    /* Speicher voll oder gesperrt — dann eben nicht gemerkt */
  }
}

export function letztenEinsatzLaden(): string | null {
  try {
    const roh = localStorage.getItem(LETZTER_EINSATZ_SCHLUESSEL);
    if (!roh) return null;
    const { id, um } = JSON.parse(roh) as { id?: string; um?: number };
    if (typeof id !== "string" || typeof um !== "number" || Date.now() - um > LETZTER_EINSATZ_FRIST_MS) return null;
    return einsaetzeLaden().some((s) => s.id === id) ? id : null;
  } catch {
    return null;
  }
}
