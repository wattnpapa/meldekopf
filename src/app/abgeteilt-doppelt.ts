/**
 * Herkunft: Erfassungsbogen `src/app/abgeteilt-doppelt.ts` (Commit 1d7ed5f).
 */
/**
 * Folgemeldung einer aufgeteilten Einheit: Die Personen und Fahrzeuge, die schon als eigener Trupp in der Lage
 * stehen, würden doppelt zählen (R13-W1).
 *
 * Wer „Aufteilen…" benutzt, nimmt Scherer und Heinrich aus „THW Sinsheim" heraus und führt sie als „Trupp Fähre".
 * Die Einheit selbst meldet aber weiter mit ihrem ganzen Stand und kennt die Aufteilung am Meldekopf nicht. Nahm
 * der Meldekopf die Folgemeldung als neue Fassung an, standen dieselben Namen in zwei Einheiten, und Stärke,
 * Verpflegung und Unterbringung der Lage waren um die abgeteilten Personen überzeichnet.
 *
 * Reine Logik ohne Oberfläche und ohne Speicher: erkennt die Überschneidung und kann sie aus der neuen Fassung
 * herausnehmen. Der Stamm-Vergleich läuft über die Namen der Personen und die Kennzeichen der Fahrzeuge — wie die
 * Gegenüberstellung der Rückfrage (meldungs-vergleich.ts).
 */

import { PersonalErfassung, type Erfassungsbogen } from "@bos/eeb-format/model";
import { MeldeStatus, stammSchluessel, type MeldeEintrag } from "@bos/meldekopf/einsaetze";
import { geltendeJeEinheit } from "./fassung-vorrang";
import { einheitAnzeigename } from "./hilfen";

/** Ein anwesender abgeteilter Trupp, dessen Personen oder Fahrzeuge auch in der neuen Meldung stehen. */
export interface AbgeteilterTeil {
  /** Bezeichnung des Teils („Trupp Fähre"). */
  etikett: string;
  /** Personen des Teils insgesamt. */
  personen: number;
  /** „Nachname, Vorname" der Personen, die auch in der neuen Meldung stehen. */
  doppelt: string[];
  /** Kennzeichen der Fahrzeuge, die auch in der neuen Meldung stehen. */
  fahrzeuge: string[];
}

export interface AbgeteiltDoppelt {
  teile: AbgeteilterTeil[];
  /** Alle doppelten Personen, ohne Wiederholung. */
  personen: string[];
  /** Alle doppelten Fahrzeuge, ohne Wiederholung. */
  fahrzeuge: string[];
}

function namensSchluessel(p: { nachname: string; vorname: string }): string {
  return `${p.nachname.trim().toLocaleLowerCase("de-DE")}|${p.vorname.trim().toLocaleLowerCase("de-DE")}`;
}

function kennzeichenSchluessel(k: string | undefined): string {
  return (k ?? "").toLocaleUpperCase("de-DE").replace(/[^\p{L}\p{N}]/gu, "");
}

function anzeigeName(p: { nachname: string; vorname: string }): string {
  return [p.nachname.trim(), p.vorname.trim()].filter(Boolean).join(", ");
}

/**
 * Welche anwesenden, aus dieser Einheit abgeteilten Trupps teilen Personen oder Fahrzeuge mit der neuen Meldung?
 * `null`, wenn es keinen solchen Trupp oder keine Überschneidung gibt. Abgerückte und aufgegangene Teile zählen
 * nicht mehr in der Lage und führen zu keiner Doppelung.
 */
export function abgeteiltDoppelt(
  eintraege: readonly MeldeEintrag[],
  einheitSchluessel: string,
  neu: Pick<Erfassungsbogen, "personal" | "fahrzeuge">,
): AbgeteiltDoppelt | null {
  const stamm = stammSchluessel(einheitSchluessel);
  const teile = geltendeJeEinheit(eintraege).filter(
    (e) =>
      e.einheitSchluessel !== einheitSchluessel &&
      e.status === MeldeStatus.ANWESEND &&
      e.teilEtikett != null &&
      e.teilEtikett !== "" &&
      stammSchluessel(e.einheitSchluessel) === stamm,
  );
  if (teile.length === 0) return null;
  const neuePersonen = new Set(neu.personal.filter((p) => anzeigeName(p)).map(namensSchluessel));
  const neueKennzeichen = new Set(neu.fahrzeuge.map((f) => kennzeichenSchluessel(f.kennzeichen)).filter(Boolean));
  const ergebnis: AbgeteilterTeil[] = [];
  for (const t of teile) {
    const doppelt = t.bogen.personal.filter((p) => anzeigeName(p) && neuePersonen.has(namensSchluessel(p))).map(anzeigeName);
    const fahrzeuge = t.bogen.fahrzeuge
      .map((f) => (f.kennzeichen ?? "").trim())
      .filter((k) => k !== "" && neueKennzeichen.has(kennzeichenSchluessel(k)));
    if (doppelt.length === 0 && fahrzeuge.length === 0) continue;
    ergebnis.push({ etikett: t.teilEtikett ?? "", personen: t.bogen.personal.length, doppelt, fahrzeuge });
  }
  if (ergebnis.length === 0) return null;
  return {
    teile: ergebnis,
    personen: [...new Set(ergebnis.flatMap((t) => t.doppelt))],
    fahrzeuge: [...new Set(ergebnis.flatMap((t) => t.fahrzeuge))],
  };
}

/** Kann die Doppelung aus der neuen Meldung herausgenommen werden? Nicht bei „Nur Stärke" mit manueller Zahl. */
export function doppeltHerausnehmbar(neu: Pick<Erfassungsbogen, "personalErfassung" | "staerkeManuell">): boolean {
  return neu.personalErfassung !== PersonalErfassung.NUR_STAERKE && !neu.staerkeManuell;
}

/**
 * Die neue Meldung ohne die schon abgeteilten Personen und Fahrzeuge. Die Verpflegungszahl sinkt um die
 * herausgenommenen Personen (nicht unter 0) — wie beim Aufteilen, wo sie mit der Stärke umzieht.
 */
export function ohneAbgeteilte(neu: Erfassungsbogen, d: AbgeteiltDoppelt): Erfassungsbogen {
  const personen = new Set(d.personen.map((n) => n.toLocaleLowerCase("de-DE")));
  const kennzeichen = new Set(d.fahrzeuge.map(kennzeichenSchluessel));
  const personal = neu.personal.filter((p) => !personen.has(anzeigeName(p).toLocaleLowerCase("de-DE")));
  const fahrzeuge = neu.fahrzeuge.filter((f) => !kennzeichen.has(kennzeichenSchluessel(f.kennzeichen)));
  const weg = neu.personal.length - personal.length;
  const sb = neu.sofortbedarf;
  return {
    ...neu,
    personal,
    fahrzeuge,
    ...(sb ? { sofortbedarf: { ...sb, verpflegungPersonen: Math.max(0, sb.verpflegungPersonen - weg) } } : {}),
  };
}

/** Satz für Rückfrage und Quittung: „Trupp Fähre (2 Personen) ist abgeteilt; Scherer, Heinrich stehen auch in der neuen Meldung." */
export function abgeteiltDoppeltText(d: AbgeteiltDoppelt): string {
  const teile = d.teile
    .map((t) => `${t.etikett} (${t.personen} ${t.personen === 1 ? "Person" : "Personen"})`)
    .join(", ");
  const was = [...d.personen, ...d.fahrzeuge.map((k) => `Fahrzeug ${k}`)].join("; ");
  return `${teile} ${d.teile.length === 1 ? "ist" : "sind"} abgeteilt; ${was} ${d.personen.length + d.fahrzeuge.length === 1 ? "steht" : "stehen"} auch in der neuen Meldung.`;
}

/**
 * Stapelweg („Bögen einlesen…", Bilder): Dort fragt niemand je Bogen; nach dem Ablegen nennt dieser Satz je Folgemeldung
 * einer aufgeteilten Einheit die doppelt stehenden Personen (R14-D2). `vorher` ist der Stand vor dem Stapel.
 */
export function abgeteiltDoppeltImStapel(
  vorher: readonly MeldeEintrag[],
  nachher: readonly MeldeEintrag[],
  neueIds: readonly string[],
): string[] {
  const zeilen: string[] = [];
  // Nur, was in die Lage übernommen wurde: Eine ältere Datei liegt nur in der Historie, nichts zählt doppelt (R15-D3).
  const geltend = new Set(geltendeJeEinheit(nachher).map((g) => g.id));
  for (const id of neueIds) {
    const e = nachher.find((x) => x.id === id);
    if (!e || !geltend.has(e.id) || !vorher.some((v) => v.einheitSchluessel === e.einheitSchluessel)) continue;
    const d = abgeteiltDoppelt(vorher, e.einheitSchluessel, e.bogen);
    if (!d) continue;
    zeilen.push(
      `„${einheitAnzeigename(e.bogen.einheit)}": ⚠ ${abgeteiltDoppeltText(d)} Sie zählen jetzt doppelt — Trupp entfernen oder „Zusammenführen…".`,
    );
  }
  return zeilen;
}
