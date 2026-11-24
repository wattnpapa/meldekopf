/**
 * Herkunft: neu in der Meldekopf-App (Rollenaudit Runde 2, U3 und Bereitstellungsraum P1-1).
 *
 * Wer führt die Einheit, wie erreiche ich sie, was hat sie dabei? Die Antworten standen nur
 * ausgeklappt in den Details und auf dem Lageblatt; Karte, Tabelle, Suche und Lagemonitor
 * lasen sie jeweils selbst oder gar nicht. Hier liegt die eine Rechnung dafür (kein React,
 * keine Persistenz):
 *
 *  - FUNKRUFNAME der Einheit: der des ersten Fahrzeugs, das einen trägt. Die Schnellerfassung
 *    kennt Fahrzeuge oft nicht und legt den Funkrufnamen als Kontakt der Führungskraft ab
 *    (Schema 12, KontaktArt.FUNK); der zählt dann. Vorher fand die Suche „22/51" die Einheit
 *    nicht, die genau so hieß, und der Lagemonitor zeigte „–".
 *  - FÜHRUNG (leer nach Ablauf der Datenschutzfrist): die Ansprechperson des Bogens (erste Führungskraft mit Kontakt), sonst die
 *    erste Führungskraft ohne Kontakt, mit dienstlicher Nummer vor privater wie auf dem
 *    Lageblatt.
 *  - FAHRZEUGE: Kurzform und Name des Typs samt Sondergerät, damit „Radlader" eine Einheit
 *    findet.
 *
 * Namen und Rufnummern stehen nur am eigenen Gerät (Karte, Tabelle), nie am Lagemonitor.
 */

import { KontaktArt, StaerkeRolle, ansprechpartner, type Erfassungsbogen, type Kontakt, type Person } from "@bos/eeb-format/model";
import { bogenAnonymisiert, funkrufText, vokabText, vokabularFuer } from "./hilfen";

/** Funkrufnamen, die als Kontakt einer Person hinterlegt sind (Handfunkgerät, Schnellerfassung). */
function funkKontakte(personal: readonly Person[]): string[] {
  return personal.flatMap((p) => p.kontakte.filter((k) => k.art === KontaktArt.FUNK).map((k) => (k.wert ?? "").trim())).filter(Boolean);
}

/** Alle Funkrufnamen einer Einheit, Fahrzeuge zuerst — für die Suche. Ohne Dubletten. */
export function funkrufnamen(b: Erfassungsbogen): string[] {
  const fahrzeuge = b.fahrzeuge.map((f) => funkrufText(f, b.einheit)).filter(Boolean);
  return [...new Set([...fahrzeuge, ...funkKontakte(b.personal)])];
}

/** Der eine Funkrufname, unter dem die Einheit gerufen wird; leer, wenn keiner erfasst ist. */
export function funkrufDerEinheit(b: Erfassungsbogen): string {
  return funkrufnamen(b)[0] ?? "";
}

/** Wer die Einheit führt und wie man ihn erreicht. */
export interface Fuehrung {
  /** „Petra Lang"; leer, wenn kein Name erfasst ist. */
  name: string;
  /** Rufnummer für den Rückruf, dienstlich vor privat. */
  telefon?: Kontakt;
}

function fuehrungsperson(personal: Person[]): Person | undefined {
  return (
    ansprechpartner(personal) ??
    personal.find((p) => p.staerkeRolle === StaerkeRolle.FUEHRER) ??
    personal.find((p) => p.staerkeRolle === StaerkeRolle.UNTERFUEHRER)
  );
}

/** Führung der Einheit; `undefined`, wenn weder Name noch Rufnummer da sind. */
export function fuehrungDerEinheit(b: Erfassungsbogen): Fuehrung | undefined {
  // Nach Ablauf der Datenschutzfrist sind Namen und Rufnummern entfernt; „Einsatzkraft 1" ist keine Auskunft.
  if (bogenAnonymisiert(b)) return undefined;
  const p = fuehrungsperson(b.personal);
  if (!p) return undefined;
  const name = [p.vorname, p.nachname].map((t) => t.trim()).filter(Boolean).join(" ");
  const nummern = p.kontakte.filter((k) => (k.art === KontaktArt.MOBIL || k.art === KontaktArt.FESTNETZ) && (k.wert ?? "").trim());
  const telefon = nummern.find((k) => k.dienstlich) ?? nummern[0];
  if (!name && !telefon) return undefined;
  return { name, ...(telefon ? { telefon } : {}) };
}

/** „Petra Lang · 0171 2345678" als reiner Text (Tabelle, Titel). */
export function fuehrungText(b: Erfassungsbogen): string {
  const f = fuehrungDerEinheit(b);
  if (!f) return "";
  return [f.name, f.telefon?.wert?.trim() ?? ""].filter(Boolean).join(" · ");
}

/** Kurzformen der Fahrzeuge in Bogenfolge: „LKW Kipper", „Radlader", „Anh Tieflader". */
export function fahrzeugKurzformen(b: Erfassungsbogen): string[] {
  const tabelle = vokabularFuer(b.einheit.organisation, "fahrzeug");
  return b.fahrzeuge.map((f) => vokabText(f.typ, tabelle)).filter(Boolean);
}

/** Was die Suche an den Fahrzeugen findet: Kurzform, ausgeschriebener Typ und Sondergerät. */
export function fahrzeugSuchtext(b: Erfassungsbogen): string[] {
  const tabelle = vokabularFuer(b.einheit.organisation, "fahrzeug");
  return b.fahrzeuge.flatMap((f) => [vokabText(f.typ, tabelle), vokabText(f.typ, tabelle, "name"), f.aenderungen ?? ""]).filter(Boolean);
}
