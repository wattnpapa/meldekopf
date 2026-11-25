/**
 * Gedächtnis der Kopplung über das Neuladen hinweg (neu im Meldekopf, ADR-009, seit 2026-11-25).
 *
 * Ein Telefon lädt seine Seite öfter neu, als man meint: Der Browser räumt einen Tab im Hintergrund weg, die App wird
 * geschlossen und am nächsten Tag wieder geöffnet. Die Rückruf-Plätze (verbindung.ts) lagen bisher nur im
 * Arbeitsspeicher; danach brauchte es einen neuen Scan. Das zweite Gerät merkt sich darum, womit es das erste anruft:
 *
 * - sein Zertifikat der Kopplung (der Browser legt es in IndexedDB ab, der private Schlüssel ist nicht auslesbar),
 * - je wartendem Platz des ersten Geräts dessen Angebot und die eigenen Kennwörter,
 * - die Sammlung und welche Meldungen das erste Gerät schon bestätigt hat.
 *
 * Damit ruft es nach dem Neuladen wieder an. Das trägt, solange die Seite des ersten Geräts offen geblieben ist: Seine
 * wartenden Verbindungen leben in dessen Arbeitsspeicher. Wird sie dort neu geladen, sind die Plätze weg, und ohne
 * Vermittler findet das zweite Gerät die neuen nicht; dann braucht es den einen Scan. Das erste Gerät merkt sich
 * deshalb nur, DASS es Zentrale einer Kopplung war, und sagt es nach dem Neuladen.
 *
 * Zwei Orte: `localStorage` trägt den Merker, dass es etwas fortzusetzen gibt (`eeb.kopplung.v1`: Rolle, Sammlung,
 * Zeit; klein, damit der Start ihn ohne Nachladen prüfen kann, und mit „Alle Daten löschen" weg). IndexedDB
 * (`eeb-kopplung`) trägt, was sich dort nicht ablegen lässt. Ohne den Merker gilt der Inhalt der Datenbank nicht.
 */

import { KOPPLUNG_MERKER } from "./zustand";

/** Älter gilt nicht mehr: So lange ist auch das Zertifikat gültig. */
export const MERKER_TAGE = 30;

export interface GemerkterPlatz {
  nr: number;
  angebotSdp: string;
  ufrag: string;
  pwd: string;
}

export interface KopplungsMerker {
  rolle: "zentrale" | "sammler";
  einsatzId: string | null;
  /** Wann die Kopplung begann (Date.now()). */
  seit: number;
  /** Nur Sammler. */
  zertifikat?: RTCCertificate;
  plaetze?: GemerkterPlatz[];
  bestaetigt?: string[];
}

const DB = "eeb-kopplung";
const ABLAGE = "merker";
const SCHLUESSEL = "aktuell";

function oeffnen(): Promise<IDBDatabase> {
  return new Promise((fertig, fehler) => {
    const a = indexedDB.open(DB, 1);
    a.onupgradeneeded = () => a.result.createObjectStore(ABLAGE);
    a.onsuccess = () => fertig(a.result);
    a.onerror = () => fehler(a.error);
  });
}

async function ablage<T>(art: IDBTransactionMode, tun: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await oeffnen();
  try {
    return await new Promise<T>((fertig, fehler) => {
      const t = db.transaction(ABLAGE, art);
      const r = tun(t.objectStore(ABLAGE));
      t.oncomplete = () => fertig(r.result);
      t.onerror = () => fehler(t.error);
      t.onabort = () => fehler(t.error);
    });
  } finally {
    db.close();
  }
}

function kurz(): { rolle?: unknown; einsatzId?: unknown; seit?: unknown } | null {
  try {
    const roh = localStorage.getItem(KOPPLUNG_MERKER);
    const x: unknown = roh ? JSON.parse(roh) : null;
    return x && typeof x === "object" ? (x as object) : null;
  } catch {
    return null;
  }
}

/** Merken. Scheitert es (Privatmodus, voller Speicher, ein Browser, der kein Zertifikat ablegt), bleibt die Kopplung eine des Arbeitsspeichers. */
export async function merkerSchreiben(m: KopplungsMerker): Promise<boolean> {
  try {
    if (m.rolle === "sammler") await ablage("readwrite", (s) => s.put(m, SCHLUESSEL));
    localStorage.setItem(KOPPLUNG_MERKER, JSON.stringify({ rolle: m.rolle, einsatzId: m.einsatzId, seit: m.seit }));
    return true;
  } catch {
    try {
      localStorage.removeItem(KOPPLUNG_MERKER);
    } catch {
      /* nichts zu retten */
    }
    return false;
  }
}

/** Vergessen: Die Kopplung ist beendet. */
export async function merkerLoeschen(): Promise<void> {
  try {
    localStorage.removeItem(KOPPLUNG_MERKER);
  } catch {
    /* Speicher gesperrt */
  }
  try {
    await ablage("readwrite", (s) => s.delete(SCHLUESSEL));
  } catch {
    /* keine Datenbank: nichts abgelegt */
  }
}

/** Was gemerkt ist; `null`, wenn nichts, zu alt, oder der Merker im `localStorage` fehlt (dann wird auch die Datenbank geleert). */
export async function merkerLaden(jetzt = Date.now()): Promise<KopplungsMerker | null> {
  const k = kurz();
  const seit = typeof k?.seit === "number" ? k.seit : 0;
  if (!k || (k.rolle !== "zentrale" && k.rolle !== "sammler") || jetzt - seit > MERKER_TAGE * 24 * 60 * 60 * 1000) {
    await merkerLoeschen();
    return null;
  }
  const einsatzId = typeof k.einsatzId === "string" ? k.einsatzId : null;
  if (k.rolle === "zentrale") return { rolle: "zentrale", einsatzId, seit };
  try {
    const m = await ablage<KopplungsMerker | undefined>("readonly", (s) => s.get(SCHLUESSEL));
    if (!m || m.rolle !== "sammler" || m.seit !== seit || !m.zertifikat || !Array.isArray(m.plaetze)) {
      await merkerLoeschen();
      return null;
    }
    return m;
  } catch {
    await merkerLoeschen();
    return null;
  }
}
