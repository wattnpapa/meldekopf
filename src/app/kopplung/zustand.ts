/**
 * Zustand der Kopplung zweier Geräte (neu im Meldekopf, ADR-009).
 *
 * Bewusst klein und ohne Abhängigkeiten: Dieses Modul liegt im Startbündel
 * (Leiste, Scanner-Weiche). Verbindung, Abgleich und Dialog laden erst, wenn
 * jemand koppelt.
 */

import { BASIS_URL } from "../adressen";

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

/**
 * Der Kopplungs-Code aus einem gescannten Text oder einem Link: der Code selbst oder das, was in der Adresse hinter
 * `#` steht ({@link kopplungsLink}). `null`, wenn der Text keiner ist.
 */
export function kopplungsCodeAus(text: string): string | null {
  return /(?:^|#)(MKK1\.\S*)$/i.exec(text.trim())?.[1] ?? null;
}

/** Ist der gescannte Text ein Kopplungs-Code (Angebot oder Antwort), auch als Link? */
export function istKopplungsCode(text: string): boolean {
  return kopplungsCodeAus(text) != null;
}

/**
 * Der Code als Adresse der App, für den QR-Code des ersten Geräts: So öffnet ihn auch die Kamera-App des Telefons, die
 * den Browser mit der App aufmacht. Der Code steht hinter `#` und geht damit an keinen Server. In Großbuchstaben,
 * damit der QR-Code im dichten alphanumerischen Modus bleibt (Schema und Rechnername gelten in jeder Schreibweise);
 * nur das `#` kostet ein paar Module mehr.
 */
export function kopplungsLink(code: string): string {
  let basis = BASIS_URL;
  try {
    // Die Seite, von der dieses Gerät die App hat; aus einer installierten App heraus die öffentliche Adresse.
    if (/^https?:$/.test(window.location.protocol)) basis = `${window.location.origin}/`;
  } catch {
    /* ohne Fenster: die öffentliche Adresse */
  }
  return `${basis.toUpperCase()}#${code}`;
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

export interface KopplungsNetz {
  /** Adressen dieses Geräts im lokalen Netz; ein Name auf `.local`, wo der Browser die Adresse verbirgt. */
  eigene: string[];
  /** Zweites Gerät: die Adressen des ersten, aus dessen Code. */
  andere?: string[];
  /** Zweites Gerät: Antwortet das erste auf das Anklopfen? Fehlt, solange es nicht versucht ist. */
  erreichbar?: boolean;
  /** Wie viele Klopfer hinausgegangen (zweites Gerät) oder angekommen sind (erstes Gerät). */
  klopfer?: number;
  /** So viele Klopfer trägt ein Fingerabdruck auf diesem Weg (66 der Reihe nach, 204 an der Sammeltür). */
  klopferSoll?: number;
  /** Zweites Gerät: so lange läuft der Durchgang des Anklopfens schon (für die Fehlersuche im Gerätetest). */
  dauerMs?: number;
  /** Zweites Gerät: Mittel je Klopfer, „Port öffnen + Antwort der Tür“ in Millisekunden (für die Fehlersuche). */
  jeKlopfer?: string;
}

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
  /** Was sich über das Netz sagen lässt: für die Frage, ob die Geräte einander überhaupt erreichen. */
  netz?: KopplungsNetz;
}

/** Ein Sammler, wie ihn die Leiste der Zentrale zeigt. */
export interface KopplungsGeraet {
  kennung: string;
  name: string;
  /** Dauerhafte Kennung des Geräts (geraetename.ts); leer, solange es sich nicht vorgestellt hat. */
  geraet?: string;
  phase: KopplungsPhase;
  wartet: boolean;
  seit: number | null;
  /** Wann zuletzt ein Stand dieses Sammlers eingespielt wurde. */
  abgleichAm: number | null;
  hinweis: string;
}

/** So viele Sammler führt eine Zentrale höchstens. */
export const MAX_SAMMLER = 5;

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
  /** Zentrale: ihre Sammler, in der Reihenfolge des Koppelns. */
  geraete?: KopplungsGeraet[];
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

/** Den ganzen Zustand ersetzen (kopplung.ts fasst ihn aus seinen Gegenstellen zusammen). */
export function kopplungsZustandErsetzen(neu: KopplungsZustand): void {
  zustand = neu;
  for (const h of [...horcher]) h();
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
