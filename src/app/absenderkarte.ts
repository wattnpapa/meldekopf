/**
 * Herkunft: Erfassungsbogen `src/app/absenderkarte.ts` (Commit 1d7ed5f).
 *
 * Absenderkarte: freiwillige Kontaktangaben (Name, E-Mail, Telefon), die mit
 * der Ed25519-Signatur mitgereicht werden.
 *
 * Zweck (siehe docs/datenmodell.md, Trust-Modell): Der Schlüssel-Fingerabdruck
 * allein belegt nur „derselbe Absender wie beim letzten Mal". Wer freiwillig
 * seinen Namen und einen Rückkanal hinterlegt, macht daraus einen Absender, den
 * die Gegenstelle auch anrufen und damit außerhalb der App verifizieren kann.
 *
 * Die Karte gehört zum GERÄT (wie der Schlüssel), nicht zum Bogen: sie liegt im
 * localStorage, wandert über die Datensicherung (`eeb.`-Präfix) mit und wird
 * beim Signieren immer mitgesendet, sobald sie gefüllt ist. Freiwillig heißt
 * freiwillig — ist sie leer, sind Payloads byte-identisch zu vorher.
 */

import type { Absenderkarte } from "@bos/eeb-format/signatur";
import { emailProblem } from "./email-pruefung";
import { telefonBereinigen, telefonKurzHinweis } from "./telefon-eingabe";

export type { Absenderkarte };

const KARTE_KEY = "eeb.absenderkarte.v1";

/**
 * Wer einen beschädigten Karten-Text beiseitelegt (unlesbar.ts). Angemeldet beim Start (speicher-browser.ts)
 * statt hier importiert: Der Import von unlesbar.ts hätte seine Kette (Uhr, Kern, Vokabulare) in das
 * Startbündel gezogen (+ 0,6 MB, siehe startbuendel-wacht.test.ts).
 */
let beschaedigtBeiseite: ((roh: string) => void) | null = null;
export function absenderBeschaedigtMeldenSetzen(fn: ((roh: string) => void) | null): void {
  beschaedigtBeiseite = fn;
}

/**
 * Längenobergrenzen. Die Karte reist unkomprimiert im QR-Payload; großzügig
 * genug für reale Angaben, knapp genug fürs Größenbudget (siehe README).
 */
export const ABSENDER_MAX = { name: 40, email: 48, telefon: 24 } as const;

function speicher(): Storage | null {
  try {
    return globalThis.localStorage ?? null; // z. B. Privatmodus/blockierter Speicher
  } catch {
    return null;
  }
}

function feld(wert: unknown, max: number): string | undefined {
  if (typeof wert !== "string") return undefined;
  // Zeilenumbrüche/Steuerzeichen raus: die Karte ist eine einzeilige Angabe.
  const sauber = wert.replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
  return sauber || undefined;
}

/** Karte auf gespeicherte Form bringen: getrimmt, gekürzt, leere Felder entfernt. */
export function normalisiereAbsenderkarte(karte: Absenderkarte): Absenderkarte {
  const k: Absenderkarte = {};
  const name = feld(karte.name, ABSENDER_MAX.name);
  const email = feld(karte.email, ABSENDER_MAX.email);
  const telefon = feld(karte.telefon, ABSENDER_MAX.telefon);
  if (name) k.name = name;
  if (email) k.email = email;
  if (telefon) k.telefon = telefon;
  return k;
}

/** Trägt die Karte überhaupt eine Angabe? */
export function absenderkarteGefuellt(karte: Absenderkarte): boolean {
  return Boolean(karte.name || karte.email || karte.telefon);
}

/** Gespeicherte Absenderkarte; leeres Objekt, wenn nichts hinterlegt ist. */
export function absenderkarteLaden(): Absenderkarte {
  const roh = speicher()?.getItem(KARTE_KEY);
  if (!roh) return {};
  try {
    const x: unknown = JSON.parse(roh);
    if (x === null || typeof x !== "object" || Array.isArray(x)) throw new Error("keine Karte");
    return normalisiereAbsenderkarte(x as Absenderkarte);
  } catch {
    // Beschädigter Eintrag: Er gilt als „keine Karte“, geht aber nicht still verloren —
    // beiseitegelegt wird er auf der Startseite genannt (R9-O3).
    beschaedigtBeiseite?.(roh);
    return {};
  }
}

/**
 * Karte speichern (normalisiert) und die gespeicherte Form zurückgeben.
 * Eine vollständig leere Karte löscht den Eintrag.
 */
export function absenderkarteSpeichern(karte: Absenderkarte): Absenderkarte {
  absenderkarteLaden(); // ein beschädigter alter Eintrag wird vor dem Überschreiben beiseitegelegt (R9-O3)
  const k = normalisiereAbsenderkarte(karte);
  if (!absenderkarteGefuellt(k)) {
    absenderkarteLoeschen();
    return {};
  }
  speicher()?.setItem(KARTE_KEY, JSON.stringify(k));
  return k;
}

/** Karte verwerfen — ab dann reisen die Bögen wieder ohne Absenderangabe. */
export function absenderkarteLoeschen(): void {
  speicher()?.removeItem(KARTE_KEY);
}

/**
 * Prüfung der Telefonnummer wie im Assistenten (R14-E5): Buchstaben, eine zweite Nummer im Feld, zu wenige Ziffern.
 * `text` ist der Satz für den Helfer, `wert` die bereinigte Nummer (Ziffern, ggf. führendes „+"), die an die Stelle des
 * Eingegebenen träte. `null`, wenn nichts auffällt.
 */
export function telefonProblem(telefon: string | undefined): { text: string; wert: string } | null {
  const roh = (telefon ?? "").trim();
  if (!roh) return null;
  const b = telefonBereinigen(roh);
  const text = b.hinweis || (!/\d{3}/.test(roh) ? "Die Telefonnummer sieht unvollständig aus." : "") || telefonKurzHinweis(b.wert);
  return text ? { text, wert: b.wert } : null;
}

/**
 * Grobe Plausibilitätsprüfung für die UI (blockiert nichts). Rückgabe: Hinweis
 * oder leerer String. Bewusst nachsichtig — im Einsatz zählt „irgendwie
 * erreichbar" mehr als RFC-Konformität.
 */
export function absenderHinweis(karte: Absenderkarte): string {
  if (emailProblem(karte.email)) {
    return "Die E-Mail-Adresse sieht unvollständig aus.";
  }
  const tel = telefonProblem(karte.telefon);
  if (tel) return tel.text;
  if (!karte.name && absenderkarteGefuellt(karte)) {
    return "Ohne Namen ist die Angabe für die Gegenstelle schwer einzuordnen.";
  }
  return "";
}
