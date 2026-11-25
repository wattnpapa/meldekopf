/**
 * Zustand der Kopplung zweier Geräte (neu im Meldekopf, ADR-009).
 *
 * Bewusst klein und ohne Abhängigkeiten: Dieses Modul liegt im Startbündel
 * (Leiste, Scanner-Weiche). Verbindung, Abgleich und Dialog laden erst, wenn
 * jemand koppelt.
 */

/** Jeder Kopplungs-Code beginnt so; Großbuchstaben, damit der QR-Code im dichten alphanumerischen Modus bleibt. */
export const KOPPLUNG_MARKE = "MKK1.";

/**
 * Merker im `localStorage`, dass dieses Gerät eine Kopplung hat, die sich nach dem Neuladen fortsetzen lässt
 * (merker.ts): Rolle, Sammlung, Zeit. Keine Verbindungsangaben, keine Einsatzdaten.
 */
export const KOPPLUNG_MERKER = "eeb.kopplung.v1";

/** Beim Start: Gibt es eine gemerkte Kopplung, lädt die Steuerung nach und setzt sie fort. */
export function kopplungFortsetzenWennGemerkt(): void {
  try {
    if (localStorage.getItem(KOPPLUNG_MERKER)) void import("./kopplung").then((m) => m.kopplungFortsetzen());
  } catch {
    /* Speicher gesperrt: nichts gemerkt */
  }
}

/** Ist der gescannte Text ein Kopplungs-Code (Angebot oder Antwort)? */
export function istKopplungsCode(text: string): boolean {
  return text.trim().toUpperCase().startsWith(KOPPLUNG_MARKE);
}

export type KopplungsPhase =
  /** Keine Kopplung. */
  | "aus"
  /** Codes werden getauscht oder die Verbindung baut sich auf. */
  | "verbindet"
  /** Die Geräte tauschen Stände aus. */
  | "verbunden"
  /** Die Verbindung stockt (Funkschatten, Bildschirm aus); sie kann von selbst wiederkommen. */
  | "unterbrochen"
  /** Die Verbindung ist zu Ende; es braucht einen neuen Code-Tausch. */
  | "getrennt";

export interface KopplungsDialog {
  /** `angebot`: dieses Gerät hat begonnen und zeigt den ersten Code. `antwort`: es zeigt den Antwort-Code. */
  art: "angebot" | "antwort";
  /** Der Code als Text; leer, solange er entsteht. */
  code: string;
  /**
   * Die Geräte verbinden sich nach dem einen Scan von selbst (das zweite klopft seinen Fingerabdruck beim ersten an);
   * der Antwort-Code ist dann nur der Ausweichweg. `false`: Es geht nicht oder ist misslungen, der Antwort-Code ist der Weg.
   */
  selbst?: boolean;
  fehler?: string;
}

export interface KopplungsZustand {
  phase: KopplungsPhase;
  /** Die gekoppelte Sammlung; beim antwortenden Gerät erst nach dem ersten Stand bekannt. */
  einsatzId: string | null;
  /** Wann der letzte Stand hinüber- oder herüberging (Date.now()). */
  abgleichAm: number | null;
  /**
   * `zentrale`: Dieses Gerät führt die Lage (es hat die Kopplung begonnen). `sammler`: Es nimmt nur auf und schickt
   * alles an die Zentrale; die Lage selbst bekommt es nicht.
   */
  rolle?: "zentrale" | "sammler";
  /** Sammler: so viele eigene Meldungen hat die Zentrale noch nicht bestätigt. */
  offen?: number;
  /** Gerissen, aber dieses Gerät verbindet sich ohne neuen Code wieder, sobald das andere erreichbar ist. */
  wartet?: boolean;
  /** Seit wann getrennt oder unterbrochen. */
  seit: number | null;
  /** Warum getrennt, oder was beim letzten Abgleich auffiel. */
  hinweis: string;
  dialog: KopplungsDialog | null;
}

const LEER: KopplungsZustand = { phase: "aus", einsatzId: null, abgleichAm: null, seit: null, hinweis: "", dialog: null };

let zustand: KopplungsZustand = LEER;
const horcher = new Set<() => void>();

export function kopplungsZustand(): KopplungsZustand {
  return zustand;
}

export function kopplungsZustandSetzen(teil: Partial<KopplungsZustand>): void {
  zustand = { ...zustand, ...teil };
  for (const h of [...horcher]) h();
}

export function kopplungsZustandZuruecksetzen(): void {
  zustand = LEER;
  for (const h of [...horcher]) h();
}

export function kopplungsZustandAbonnieren(h: () => void): () => void {
  horcher.add(h);
  return () => horcher.delete(h);
}

/** Läuft gerade eine Kopplung oder ihr Aufbau? */
export function kopplungAktiv(z: KopplungsZustand = zustand): boolean {
  return z.phase === "verbindet" || z.phase === "verbunden" || z.phase === "unterbrochen";
}

// Die Sammlungen haben sich durch einen Abgleich geändert: Die Ansicht liest neu.
const standHorcher = new Set<(einsatzId: string) => void>();

export function kopplungsStandAbonnieren(h: (einsatzId: string) => void): () => void {
  standHorcher.add(h);
  return () => standHorcher.delete(h);
}

export function kopplungsStandMelden(einsatzId: string): void {
  for (const h of [...standHorcher]) h(einsatzId);
}

/** Kopplung für eine Sammlung beginnen: lädt Verbindung, Abgleich und Dialog nach. Eine laufende Kopplung wird dort erst nach Rückfrage abgelöst. */
export function kopplungBeginnen(einsatzId: string): void {
  void import("./kopplung").then((m) => m.kopplungBeginnenMitRueckfrage(einsatzId));
}
