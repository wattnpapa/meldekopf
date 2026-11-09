/**
 * Herkunft: Erfassungsbogen `src/app/import-unterbrochen.ts` (Commit 1d7ed5f).
 */
/**
 * Unterbrochener Stapelimport (R15-S1): Wer 30 bis 40 Dateien auf einmal einliest und dabei unterbrochen wird (Seite
 * neu geladen, App im Hintergrund vom Betriebssystem beendet), fand danach eine Teilaufnahme ohne jeden Hinweis — die
 * Quittung „N Bögen aufgenommen" war mit dem Neuladen weg. Die Aufnahme selbst bleibt Bogen für Bogen (fehlerfrei,
 * ohne halbe Einträge); hier steht nur die Spur, dass ein Stapel lief und nicht zu Ende kam.
 *
 * Gespeichert wird im SITZUNGSSPEICHER (nicht dauerhaft): nur Einsatz-Kennung, Zahl der gewählten Dateien und Zahl der
 * Meldungen davor — keine Namen, keine Personendaten. Schlüssel: `eeb.import-laeuft.v1` (sessionStorage).
 */

const SCHLUESSEL = "eeb.import-laeuft.v1";

interface Spur {
  einsatzId: string;
  dateien: number;
  meldungenVorher: number;
}

/** Läuft in DIESER Seite gerade ein Stapel? Dann ist die Spur kein Abbruch, sondern der laufende Import. */
let laeuftHier = false;

function speicher(): Storage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

/** Vor dem ersten Bogen: Spur legen. */
export function importBeginnt(einsatzId: string, dateien: number, meldungenVorher: number): void {
  laeuftHier = true;
  try {
    speicher()?.setItem(SCHLUESSEL, JSON.stringify({ einsatzId, dateien, meldungenVorher } satisfies Spur));
  } catch {
    /* kein Speicher: dann kein Hinweis, der Import selbst bleibt unberührt */
  }
}

/** Nach dem letzten Bogen (auch bei Fehlern): Spur weg. */
export function importEndet(): void {
  laeuftHier = false;
  try {
    speicher()?.removeItem(SCHLUESSEL);
  } catch {
    /* s. o. */
  }
}

/** Hinweis auf einen unterbrochenen Stapel dieses Einsatzes; `null`, wenn keiner lief oder er noch läuft. */
export function unterbrochenerImport(einsatzId: string, meldungenJetzt: number): string | null {
  if (laeuftHier) return null;
  try {
    const roh = speicher()?.getItem(SCHLUESSEL);
    if (!roh) return null;
    const s = JSON.parse(roh) as Spur;
    if (s.einsatzId !== einsatzId || !Number.isFinite(s.dateien)) return null;
    const neu = Math.max(0, meldungenJetzt - (Number.isFinite(s.meldungenVorher) ? s.meldungenVorher : meldungenJetzt));
    return `Import unterbrochen: ${s.dateien} ${s.dateien === 1 ? "Datei war" : "Dateien waren"} gewählt, ${neu} ${neu === 1 ? "Meldung kam" : "Meldungen kamen"} an. Es kann etwas fehlen — dieselben Dateien nochmal über „Bögen einlesen…“ wählen; was schon da ist, wird übersprungen.`;
  } catch {
    return null;
  }
}
