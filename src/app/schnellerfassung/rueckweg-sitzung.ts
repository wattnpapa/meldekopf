/**
 * Herkunft: Erfassungsbogen `src/app/rueckweg-sitzung.ts` (Commit 1d7ed5f), unverändert.
 *
 * Rückwege nach „Entfernen“ im Assistenten, die den Schrittwechsel und das Neuladen überleben
 * (Audit Runde 9, R9-D3): „Person entfernen“ konnte es schon (schritte/personal.tsx), „Fahrzeug
 * entfernen“ nicht, „Ebene entfernen“ hatte keinen.
 *
 * Wie dort liegt der Rückweg im Sitzungsspeicher dieses Tabs: nicht in `localStorage`, nicht in der
 * Datensicherung, weg mit dem Schließen des Tabs; „Alle Daten löschen“ leert ihn mit (Präfix `eeb.`).
 * Er gilt 15 Minuten und nur, solange sich die Liste nicht geändert hat (`danach`), damit „Rückgängig“
 * nie spätere Eingaben mitnimmt.
 */

/** So lange gilt der Rückweg nach einem Neuladen oder Schrittwechsel (Millisekunden). */
export const RUECKWEG_SITZUNG_FRIST_MS = 15 * 60 * 1000;

interface Gemerkt<T> {
  wert: T;
  /** Fingerabdruck der Liste NACH dem Entfernen. */
  danach: string;
  zeit: number;
}

export const FAHRZEUG_WEG_SCHLUESSEL = "eeb.fahrzeug.rueckweg";
export const EBENE_WEG_SCHLUESSEL = "eeb.ebene.rueckweg";
/** „Für neuen Einsatz vorbereiten“: Zeitraum, Ort/Auftrag und Sofortbedarf davor (R16-E2). */
export const EINSATZ_WEG_SCHLUESSEL = "eeb.einsatz.rueckweg";

function sitzung(): Storage | null {
  try {
    return globalThis.sessionStorage ?? null;
  } catch {
    return null;
  }
}

/** Rückweg merken (`null` = vergessen). Scheitert still: dann gilt er nur bis zum Schrittwechsel. */
export function rueckwegMerken<T>(schluessel: string, wert: T | null, danach: string, jetzt = Date.now()): void {
  try {
    if (wert == null) sitzung()?.removeItem(schluessel);
    else sitzung()?.setItem(schluessel, JSON.stringify({ wert, danach, zeit: jetzt } satisfies Gemerkt<T>));
  } catch {
    /* gesperrt oder voll */
  }
}

/** Der gemerkte Rückweg, solange er jung genug ist und die Liste noch so aussieht wie danach (`aktuell`); sonst null (und vergessen). */
export function rueckwegHolen<T>(schluessel: string, aktuell: string, jetzt = Date.now()): T | null {
  try {
    const roh = sitzung()?.getItem(schluessel);
    if (!roh) return null;
    const g = JSON.parse(roh) as Partial<Gemerkt<T>>;
    if (typeof g.zeit !== "number" || jetzt - g.zeit > RUECKWEG_SITZUNG_FRIST_MS || g.danach !== aktuell || g.wert == null) {
      sitzung()?.removeItem(schluessel);
      return null;
    }
    return g.wert;
  } catch {
    return null;
  }
}

/** Präfix der Merker für ausgeschaltete Funkrufnamen je Fahrzeugkarte (R10-D2). */
export const FUNKRUF_MERKER_PRAEFIX = "eeb.funkruf.merker.";

/** Ausgeschalteten Funkrufnamen der Karte `index` merken (`null` = vergessen); `fp` benennt die Karte (Fahrzeugtyp). */
export function funkrufMerken<T>(index: number, wert: T | null, fp: string, jetzt = Date.now()): void {
  rueckwegMerken(FUNKRUF_MERKER_PRAEFIX + index, wert, fp, jetzt);
}

/** Der gemerkte Funkrufname der Karte `index`, solange er jung ist und die Karte noch dasselbe Fahrzeug zeigt. */
export function funkrufHolen<T>(index: number, fp: string, jetzt = Date.now()): T | null {
  return rueckwegHolen<T>(FUNKRUF_MERKER_PRAEFIX + index, fp, jetzt);
}

/** Wenn der Bogen weg ist (verworfen, geschlossen, übergeben), bleibt nichts im Tab zurück. */
export function rueckwegeVergessen(): void {
  try {
    const s = sitzung();
    if (s) {
      for (const k of Object.keys(s)) if (k.startsWith(FUNKRUF_MERKER_PRAEFIX)) s.removeItem(k);
    }
  } catch {
    /* nichts zu tun */
  }
  for (const k of [FAHRZEUG_WEG_SCHLUESSEL, EBENE_WEG_SCHLUESSEL, EINSATZ_WEG_SCHLUESSEL]) {
    try {
      sitzung()?.removeItem(k);
    } catch {
      /* nichts zu tun */
    }
  }
}
