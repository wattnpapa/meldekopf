/**
 * Herkunft: Erfassungsbogen `src/app/angaben-alter.ts` (Commit 1d7ed5f).
 */
/**
 * Alter der Angaben einer Meldung (R14-K1).
 *
 * „Meldung vor 5 Min" maß bisher das Eintreffen am Gerät. Ein Bogen, den die Einheit gestern Abend erstellt hat und
 * der heute früh gescannt oder per Datei übergeben wird, galt damit als „gerade eben" — die Zahlen darin sind aber
 * vierzehn Stunden alt. Alle Altersmarken (Kopf, Karte, Tabelle, Filter, Monitor, Lageblatt) rechnen deshalb ab dem
 * früheren von beiden: dem Stand im Bogen oder dem Eingang. Ein Stand nach dem Eingang (falsche Geräteuhr, eigene
 * Warnung) verlängert nichts.
 */
import type { EebZeitpunkt } from "@bos/eeb-format/model";
import { zeitLang, zeitpunktZuMs as standMs } from "./eintrag-zeiten";

/** Ab diesem Abstand zwischen Stand und Eingang nennt die Altersangabe den Stand statt der Meldung. */
export const STAND_VOR_EINGANG_MS = 60 * 60_000;

/**
 * Alter der Angaben bei einer Fassung, die am Meldekopf von Hand entstand („Stärke ändern…", „Als Einsatzmeldung
 * zählen…", R17-K1): Die Handänderung ändert den Eintrag, nicht den Zeitpunkt, zu dem die Einheit zuletzt gemeldet hat.
 * Ohne diese Angabe stünde eine hundert Tage alte Meldung danach als „gerade eben" da, und das ⚠ „älter als 1 Std"
 * entfiele. Wie `ersetztDurch` ein optionales Feld am Eintrag, kein Schemawechsel.
 */
export interface AngabenSeit {
  /** Zeit, ab der die Angaben der Vorgängerin galten (ms). */
  seit: number;
  /** „Stand" oder „Meldung" der Vorgängerin. */
  wort: "Stand" | "Meldung";
  /** Nur die Kennzeichnung (Übung/Einsatz) wurde umgestellt: keine Folgemeldung mit neuem Inhalt. */
  kennzeichnung?: boolean;
  /** Der Ort der Einheit wurde am Meldekopf geändert (R20-H1); `kennzeichnung` ist dann ebenfalls gesetzt. */
  name?: boolean;
  /**
   * Die Angaben einer von Hand erfassten Einheit wurden am Meldekopf berichtigt (Einheitstyp, Organisation, Fahrzeuge,
   * Führungskraft; Rollenaudit Runde 2, Meldekopf P1-1); `kennzeichnung` ist dann ebenfalls gesetzt.
   */
  berichtigt?: boolean;
  /** Der Sofortbedarf wurde am Meldekopf nachgetragen oder geändert („Bedarf ändern…", Rollenaudit Runde 2). */
  bedarf?: boolean;
  /**
   * „Stand bestätigen" (Rollenaudit Runde 2, Bereitstellungsraum P2-5): Die Einheit steht planmäßig seit Stunden da, und
   * jemand hat nachgefragt, dass die Angaben noch stimmen. `seit` ist dann dieser Zeitpunkt, das Alter beginnt neu.
   */
  bestaetigtAm?: number;
  /** Nur bestätigt, sonst nichts von Hand geändert: Der Vermerk nennt dann allein die Bestätigung. */
  nurBestaetigt?: boolean;
  /** Wann am Meldekopf geändert wurde (ms). */
  geaendertAm: number;
}

declare module "@bos/meldekopf/einsaetze" {
  interface MeldeEintrag {
    angaben?: AngabenSeit;
  }
}

interface MitStand {
  empfangenAm: number;
  bogen: { stand: EebZeitpunkt };
  angaben?: AngabenSeit;
}

/** Zeit, ab der die Angaben gelten: Stand im Bogen, höchstens aber der Eingang (ms); nach einer Handänderung die der Vorgängerin. */
export function angabenZeit(e: MitStand): number {
  return e.angaben?.seit ?? Math.min(e.empfangenAm, standMs(e.bogen.stand));
}

/** Liegt der Stand mindestens eine Stunde vor dem Eingang? Dann sagt die Marke „Stand vor …" statt „Meldung vor …". */
export function standLiegtWeitVorEingang(e: MitStand): boolean {
  if (e.angaben) return e.angaben.wort === "Stand";
  return e.empfangenAm - standMs(e.bogen.stand) >= STAND_VOR_EINGANG_MS;
}

/**
 * Die Angaben nach „Stand bestätigen": Das Alter beginnt jetzt neu, ein früherer Vermerk einer Handänderung bleibt.
 * Keine Folgemeldung (`kennzeichnung`): Die Einheit hat nichts Neues gemeldet, und am Lagemonitor ist es keine Bewegung.
 */
export function angabenBestaetigt(e: { angaben?: AngabenSeit }, jetzt = Date.now()): AngabenSeit {
  const alt = e.angaben;
  return alt
    ? { ...alt, seit: jetzt, wort: "Stand", bestaetigtAm: jetzt }
    : { seit: jetzt, wort: "Stand", kennzeichnung: true, nurBestaetigt: true, bestaetigtAm: jetzt, geaendertAm: jetzt };
}

/** Die Angaben einer neuen Handänderung: das Alter der Vorgängerin bleibt (R17-K1). */
export function angabenErben(vorgaengerin: MitStand, kennzeichnung: boolean | "name" | "berichtigt" | "bedarf" = false, jetzt = Date.now()): AngabenSeit {
  return {
    seit: angabenZeit(vorgaengerin),
    wort: standLiegtWeitVorEingang(vorgaengerin) ? "Stand" : "Meldung",
    ...(kennzeichnung ? { kennzeichnung: true } : {}),
    // R20-H1: „Ort der Einheit ändern…" – keine Folgemeldung (wie die Kennzeichnung), der Vermerk sagt „Name".
    ...(kennzeichnung === "name" ? { name: true } : {}),
    // „Angaben berichtigen…": dieselbe Einheit mit richtigen Angaben, keine Folgemeldung der Einheit.
    ...(kennzeichnung === "berichtigt" ? { berichtigt: true } : {}),
    ...(kennzeichnung === "bedarf" ? { bedarf: true } : {}),
    geaendertAm: jetzt,
  };
}

/**
 * Quittung nach einem Stapel (R14-A1): Die Eintreffzeit der eingelesenen Bögen ist die Zeit des Einlesens — bei sechs
 * Bögen in einem Zug stünde sonst überall dieselbe Minute wie eine Ankunftszeit auf dem Lageblatt. Leer unter zwei Bögen.
 */
export function eintreffzeitStapelHinweis(neu: number, jetzt: number = Date.now()): string {
  // Datiert („Aufnahme 22:41"), weil der Hinweis stehen bleibt, während Einheiten abrücken oder entfernt werden (R18-N3);
  // das „*" steht in Lageblatt, Sammel-PDF, CSV und Excel, die Fußnote dort sagt dasselbe.
  const uhr = new Date(jetzt).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  return neu < 2
    ? ""
    : `Aufnahme ${uhr}: Eintreffzeit dieser ${neu} Bögen ist die Zeit des Einlesens (in Lageblatt und Tabellen mit * markiert); anders gewesen: Karte › „ändern“.`;
}

/**
 * Vermerk einer Handänderung am Meldekopf („Stärke am Meldekopf geändert 28.10.2026, 00:36"); leer ohne Änderung.
 * Gleich in Karte, Lageblatt, Sammel-PDF, CSV und Excel (R18-A2, R18-A3): Die Handänderung steht getrennt vom Stand
 * der Angaben, den der Absender gemeldet hat.
 */
export function handAenderungText(e: { angaben?: AngabenSeit }): string {
  if (!e.angaben) return "";
  const bestaetigt = e.angaben.bestaetigtAm != null ? `Stand am Meldekopf bestätigt ${zeitLang(e.angaben.bestaetigtAm)}` : "";
  if (e.angaben.nurBestaetigt) return bestaetigt;
  return [handAenderungGrund(e.angaben), bestaetigt].filter(Boolean).join(" · ");
}

function handAenderungGrund(angaben: AngabenSeit): string {
  const e = { angaben };
  if (e.angaben.bedarf) return `Bedarf am Meldekopf geändert ${zeitLang(e.angaben.geaendertAm)}`;
  if (e.angaben.berichtigt) return `Angaben am Meldekopf berichtigt ${zeitLang(e.angaben.geaendertAm)}`;
  return `${e.angaben.name ? "Ort der Einheit" : e.angaben.kennzeichnung ? "Kennzeichnung" : "Stärke"} am Meldekopf geändert ${zeitLang(e.angaben.geaendertAm)}`;
}

/**
 * Das Wort vor „vor 14 Std 0 Min": immer „Stand" (R20-A3). Das Alter rechnet ab dem Stand der Angaben (siehe
 * `angabenZeit`) – gleiche Ursache, gleiche Bezeichnung; „Meldung vor …" wechselte je Karte ohne erkennbaren Grund
 * und ließ nach einer alten Meldung fragen, obwohl nur die Angaben im Bogen alt waren.
 */
export function angabenAlterWort(_e: MitStand): "Stand" | "Meldung" {
  return "Stand";
}
