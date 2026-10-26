/**
 * Herkunft: Erfassungsbogen `src/app/lagemonitor.ts` (Commit 441811c).
 *
 * Lagemonitor: die Zahlen für die Anzeige im Führungsfahrzeug.
 *
 * Reine Logik ohne Oberfläche. Die Summen kommen aus `auswertung.ts`, damit der
 * Monitor dieselben Zahlen zeigt wie die Einsatzansicht und das Lageblatt. Der
 * Monitor zeigt nur Zusammenzählungen und Einheitsnamen — keine Personen: Ein
 * Bildschirm im Fahrzeug sieht jeder, der vorbeikommt.
 */

import { staerke } from "@bos/eeb-format/model";
import { einheitOrt } from "@bos/meldekopf/darstellung";
import { EinsatzArt, MeldeStatus, revisionen, type Einsatzsammlung } from "@bos/meldekopf/einsaetze";
import { aggregiere, aggregiereNachZug, aktuelleMeldungen, type EinsatzSummen } from "./auswertung";
import { eintreffzeit } from "./eintrag-zeiten";
import { bedarfMarken, sollstaerkeAnteil } from "./einheiten-tabelle";
import { geltendeJeEinheit } from "./fassung-vorrang";
import { einheitAnzeigename, funkrufText, natoZeitstempel, orgLabel, vokabText, vokabularFuer } from "./hilfen";

/** Datum-Zeit-Gruppe in ihren Teilen: „17" „1806" „feb" „24" (Tag, Uhrzeit, Monat, Jahr). */
export function dtgTeile(d: Date): { tag: string; zeit: string; monat: string; jahr: string } {
  const s = natoZeitstempel(d);
  return { tag: s.slice(0, 2), zeit: s.slice(2, 6), monat: s.slice(6, 9), jahr: s.slice(9) };
}

const zwei = (n: number) => String(n).padStart(2, "0");

/**
 * Einsatzdauer ausgeschrieben: „1 Tag, 6 Stunden, 6 Minuten". Tage fehlen unter
 * 24 Stunden. `null`, wenn der Beginn fehlt oder in der Zukunft liegt.
 */
export function dauerText(beginn: number | null, jetzt: number): string | null {
  if (beginn == null || jetzt < beginn) return null;
  const minuten = Math.floor((jetzt - beginn) / 60_000);
  const tage = Math.floor(minuten / 1440);
  const stunden = Math.floor((minuten % 1440) / 60);
  const rest = minuten % 60;
  const teil = (n: number, eins: string, viele: string) => `${n} ${n === 1 ? eins : viele}`;
  return [
    ...(tage > 0 ? [teil(tage, "Tag", "Tage")] : []),
    teil(stunden, "Stunde", "Stunden"),
    teil(rest, "Minute", "Minuten"),
  ].join(", ");
}

/** Eine Zeile der Einheitentabelle: Organisation, Ort, Funkrufname, Einheitentyp, Zug, Führer/Unterführer/Mannschaft/gesamt. */
export interface EinheitZeile {
  /** Schlüssel der Meldung — stabil, solange die Einheit gleich bleibt. */
  id: string;
  orga: string;
  ort: string;
  /** Funkrufname des ersten Fahrzeugs, das einen hat; leer, wenn keins einen trägt. */
  funkruf: string;
  typ: string;
  fuehrer: number;
  unterfuehrer: number;
  mannschaft: number;
  /** Gesamtstärke der Einheit — am Fernseher die Zahl, nach der gefragt wird (Audit Meldekopf R1, Führung F4). */
  gesamt: number;
  /** Zug-Etikett; leer ohne Zuordnung. */
  zug: string;
  /** Eintreffzeit (vom Zettel, sonst Empfang) — danach ist die Tabelle geordnet. */
  eingetroffen: number;
}

/** Zwischensumme eines Zugs für die Zugzeile des Monitors. */
export interface ZugZeile {
  /** Zug-Etikett; `null` für Einheiten ohne Zug. */
  name: string | null;
  einheiten: number;
  gesamt: number;
}

/**
 * Was am Fernseher als Bedarf stehen muss: nur das, was zu entscheiden ist
 * (Ruhezeit, Unterbringung, abweichende Verpflegung), dazu die Verpflegung
 * als Zahl. Kraftstoff bleibt in der Einsatzansicht (Audit Meldekopf R1, F4).
 */
export interface BedarfZeile {
  verpflegung: number;
  ruhezeit: number;
  unterbringungEinheiten: number;
  unterbringungPersonen: number;
  /** Einheiten, deren gemeldete Verpflegung von ihrer Stärke abweicht. */
  verpflegungAbweichend: number;
}

/** Was sich zuletzt in der Lage bewegt hat — der Fernseher soll nicht nur Zahlen ändern, sondern sagen, warum (Audit Runde 6, R6-K1). */
export interface Bewegung {
  id: string;
  name: string;
  art: "Eingetroffen" | "Abgerückt" | "Wieder da" | "Folgemeldung";
  zeit: number;
  /** Bei Folgemeldungen die Stärkeänderung: „Stärke 4 → 1 (−3)" (R7-K2). */
  detail?: string;
  /**
   * Nur bei „Eingetroffen": die Eintreffzeit, wenn die Einheit mehr als fünf
   * Minuten vor ihrer Erfassung da war (Nachtrag vom Meldeblock). Der Monitor
   * nennt dann diese Zeit statt „vor 2 Min" (Audit Meldekopf R1, Führung F3).
   */
  nachgetragen?: number;
}

/** Ab diesem Abstand zwischen Eintreffen und Erfassung gilt eine Einheit als nachgetragen. */
export const NACHTRAG_AB_MS = 5 * 60_000;

/** Eine Meldezeit, die weiter als das in der Zukunft liegt, deutet auf eine falsche Geräteuhr (R7-K3). */
export const ZUKUNFT_TOLERANZ_MS = 5 * 60_000;

/** So lange gilt eine Bewegung als „gerade eben" und steht im Hauptbild. */
export const BEWEGUNG_FENSTER_MS = 15 * 60_000;

export interface Lagebild {
  name: string;
  ort?: string;
  uebung: boolean;
  /** Art der Sammlung als Wort („Einsatz", „Übung", „Veranstaltung"). */
  art: string;
  summen: EinsatzSummen;
  /** Anwesende Einheiten, zuletzt eingetroffene zuerst. */
  einheiten: EinheitZeile[];
  /** Zwischensummen je Zug; leer, solange keine Einheit einem Zug zugeordnet ist. */
  zuege: ZugZeile[];
  bedarf: BedarfZeile;
  /** Einheiten, die abgerückt sind (zählen nicht mehr mit). */
  abgerueckt: number;
  /** Wann zuletzt etwas in die Sammlung kam (Date.now()), sonst `null`. */
  letzteMeldung: number | null;
  /** Früheste Eintreffzeit aller Meldungen — Vorschlag für den Beginn, wenn keiner gesetzt ist. */
  ersteMeldung: number | null;
  /** Abrücken, Rückkehr und Folgemeldungen der letzten Minuten, jüngste zuerst. */
  bewegungen: Bewegung[];
  /** Meldezeiten liegen in der Zukunft (Geräteuhr nachgestellt?) — der Monitor nennt das, statt „gerade eben" zu behaupten. */
  zeitenPruefen: boolean;
  /** Einheiten, für die niemand gezählt hat (reine Sollstärke), und ihre Personen: stecken in der Gesamtstärke (R9-K1). */
  sollstaerke: { einheiten: number; personen: number };
}

export function lagebildArt(art: EinsatzArt): string {
  return art === EinsatzArt.UEBUNG ? "Übung" : art === EinsatzArt.VERANSTALTUNG ? "Veranstaltung" : "Einsatz";
}

function bewegungenSeit(einsatz: Einsatzsammlung, jetzt: number): Bewegung[] {
  const aus: Bewegung[] = [];
  for (const k of geltendeJeEinheit(einsatz.eintraege)) {
    const name = einheitAnzeigename(k.bogen.einheit);
    for (const v of k.vermerke ?? []) {
      if (jetzt - v.zeit > BEWEGUNG_FENSTER_MS) continue;
      if (v.text === "Abgerückt") aus.push({ id: `${k.id}-a-${v.zeit}`, name, art: "Abgerückt", zeit: v.zeit });
      else if (/^Wieder als anwesend/.test(v.text)) aus.push({ id: `${k.id}-w-${v.zeit}`, name, art: "Wieder da", zeit: v.zeit });
    }
    if (jetzt - k.empfangenAm <= BEWEGUNG_FENSTER_MS) {
      const revs = revisionen(einsatz.eintraege, k.einheitSchluessel);
      if (revs.length > 1) {
        const davor = revs.find((r) => r.id !== k.id);
        const alt = davor ? staerke(davor.bogen).gesamt : null;
        const neu = staerke(k.bogen).gesamt;
        const diff = alt != null && alt !== neu ? ` (${neu - alt > 0 ? "+" : "−"}${Math.abs(neu - alt)})` : "";
        aus.push({
          id: `${k.id}-f`,
          name,
          art: "Folgemeldung",
          zeit: k.empfangenAm,
          detail: alt != null && alt !== neu ? `Stärke ${alt} → ${neu}${diff}` : undefined,
        });
      } else if (k.status !== MeldeStatus.ABGERUECKT) {
        // Neue Einheit: erklärt, warum Zahl und Tabelle springen (R7-W4). Ein Nachtrag vom Meldeblock
        // trägt seine Eintreffzeit mit, sonst hieße eine seit einer Stunde anwesende Einheit „vor 2 Min" (F3).
        const da = eintreffzeit(k);
        aus.push({
          id: `${k.id}-e`,
          name,
          art: "Eingetroffen",
          zeit: k.empfangenAm,
          ...(k.empfangenAm - da > NACHTRAG_AB_MS ? { nachgetragen: da } : {}),
        });
      }
    }
  }
  return aus.sort((a, b) => b.zeit - a.zeit);
}

export function lagebild(einsatz: Einsatzsammlung, jetzt: number = Date.now()): Lagebild {
  const geltend = geltendeJeEinheit(einsatz.eintraege);
  const aktuell = aktuelleMeldungen(einsatz.eintraege, einsatz.art);
  // Zuletzt eingetroffen zuerst (R8-K5). Vorher nach Empfang: Ein Nachtrag vom Meldeblock und jede Folgemeldung
  // sprangen an die Spitze, als wären sie gerade gekommen (Audit Meldekopf R1, F3). Bei gleicher Zeit bleibt die
  // Reihenfolge der Meldungen.
  const einheiten = aktuell
    .map((m) => ({ m, da: eintreffzeit(m) }))
    .sort((a, b) => b.da - a.da)
    .map(({ m, da }): EinheitZeile => {
      const e = m.bogen.einheit;
      const st = staerke(m.bogen);
      return {
        id: m.id,
        orga: e.organisationName?.trim() || orgLabel(e.organisation),
        ort: einheitOrt(e),
        funkruf: m.bogen.fahrzeuge.map((f) => funkrufText(f, e)).find((t) => t !== "") ?? "",
        typ: vokabText(e.einheitsTyp, vokabularFuer(e.organisation, "einheitstyp"), "name").trim(),
        fuehrer: st.fuehrer,
        unterfuehrer: st.unterfuehrer,
        mannschaft: st.mannschaft,
        gesamt: st.gesamt,
        zug: m.zugEtikett?.trim() ?? "",
        eingetroffen: da,
      };
    });
  const summen = aggregiere(einsatz.eintraege, einsatz.art);
  const gruppen = aggregiereNachZug(einsatz.eintraege, einsatz.art);
  const zuege: ZugZeile[] = gruppen.some((g) => g.zugEtikett)
    ? gruppen.map((g) => ({ name: g.zugEtikett ?? null, einheiten: g.summen.einheiten, gesamt: g.summen.staerke.gesamt }))
    : [];
  const bedarf: BedarfZeile = {
    verpflegung: summen.verpflegung.gesamt,
    ruhezeit: summen.ruhezeitErforderlich,
    unterbringungEinheiten: summen.unterbringungBenoetigt,
    unterbringungPersonen: summen.unterbringungAngefordert.personen,
    verpflegungAbweichend: aktuell.filter((m) => bedarfMarken(m.bogen).some((b) => b.lang.startsWith("Verpflegung"))).length,
  };
  return {
    name: einsatz.name,
    ort: einsatz.ort,
    uebung: einsatz.art === EinsatzArt.UEBUNG,
    art: lagebildArt(einsatz.art),
    summen,
    einheiten,
    zuege,
    bedarf,
    abgerueckt: geltend.filter((e) => e.status === MeldeStatus.ABGERUECKT).length,
    letzteMeldung: einsatz.eintraege.length > 0 ? Math.max(...einsatz.eintraege.map((e) => e.empfangenAm)) : null,
    ersteMeldung: geltend.length > 0 ? Math.min(...geltend.map(eintreffzeit)) : null,
    bewegungen: bewegungenSeit(einsatz, jetzt),
    sollstaerke: sollstaerkeAnteil(einsatz.eintraege, einsatz.art),
    zeitenPruefen: einsatz.eintraege.some((e) => e.empfangenAm - jetzt > ZUKUNFT_TOLERANZ_MS) ||
      geltend.some((e) => eintreffzeit(e) - jetzt > ZUKUNFT_TOLERANZ_MS),
  };
}

/** Wert für das `datetime-local`-Feld (Ortszeit, ohne Sekunden). */
export function zuEingabeWert(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${zwei(d.getMonth() + 1)}-${zwei(d.getDate())}T${zwei(d.getHours())}:${zwei(d.getMinutes())}`;
}

/** Eingabewert → Zeitpunkt; leer oder ungültig → `null`. */
export function ausEingabeWert(wert: string): number | null {
  if (!wert) return null;
  const ms = new Date(wert).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/** Uhrzeit „19:55" für den Monitor; liegt sie nicht heute, mit Tag: „24.10. 19:55". */
export function uhrzeitText(zeit: number, jetzt: number): string {
  const d = new Date(zeit);
  const j = new Date(jetzt);
  const uhr = `${zwei(d.getHours())}:${zwei(d.getMinutes())}`;
  return d.toDateString() === j.toDateString() ? uhr : `${zwei(d.getDate())}.${zwei(d.getMonth() + 1)}. ${uhr}`;
}

/** „vor 4 Min" / „gerade eben" / „vor 2 Std 5 Min" — Alter einer Meldung für die Datenstand-Zeile. */
export function alterText(zeit: number, jetzt: number): string {
  if (zeit - jetzt > ZUKUNFT_TOLERANZ_MS) return "liegt in der Zukunft";
  const min = Math.max(0, Math.floor((jetzt - zeit) / 60_000));
  if (min < 1) return "gerade eben";
  if (min < 60) return `vor ${min} Min`;
  const std = Math.floor(min / 60);
  if (std < 24) return `vor ${std} Std ${min % 60} Min`;
  const tage = Math.floor(std / 24);
  return `vor ${tage} ${tage === 1 ? "Tag" : "Tagen"}`;
}
