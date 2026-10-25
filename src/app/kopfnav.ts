/**
 * Die Kopfnavigation — die EINE Quelle für die App und die Textseiten.
 *
 * Herkunft: Erfassungsbogen `src/app/kopfnav.ts` (Commit f2b77f1). Die Bauart
 * (Einträge als Daten, drei Fassungen aus einer Quelle, Prüfung gegen das
 * Start-Gerüst) liegt seit Phase 1 in `@bos/oberflaeche/kopfnav`; hier stehen
 * die Einträge dieser App. Der
 * Meldekopf hat keine Themenwelt mit Organisations- und Länderseiten — seine
 * Leiste trägt das Schwesterprodukt, aus dem die Bögen kommen, und die
 * Pflichtangaben. Aufklappmenüs (`unter`) bleiben als Bauart erhalten und
 * kommen mit der Anleitung (Phase 5) wieder zum Zug.
 *
 * Daraus entstehen drei Fassungen:
 *   - der statische Block im Start-Gerüst von index.html und in den Seiten
 *     unter public/, geschrieben von `node --import tsx scripts/kopfnav.mts`,
 *   - die React-Fassung auf der Startseite (`Kopfnav` in kopfnav-ui.tsx).
 * src/test/kopfnav.test.ts vergleicht die Dateien mit der Quelle und schlägt
 * fehl, sobald ein Block veraltet ist.
 *
 * Die Leiste trägt bewusst NUR Wissen, keine App-Aktionen: „Neuer Einsatz…"
 * und die Eingänge stehen mitten auf der Startseite. Dieselben Ziele oben noch
 * einmal als Links hieße zwei konkurrierende Bedienelemente für eine Handlung.
 */

import {
  type KopfnavQuelle,
  type NavEintrag,
  type NavHuelle,
  kopfnavHtml as kopfnavHtmlAus,
  kopfnavMarken,
} from "@bos/oberflaeche/kopfnav";
import { ERFASSUNGSBOGEN_URL } from "./adressen";

/**
 * „Erfassungsbogen" steht vorn: Dort entstehen die Bögen, die hier ankommen,
 * und dort liegt bis zum Ende der Übergangszeit auch die Einsatz-Sammlung
 * (ADR-007). Die Pflichtangaben stehen am Ende — auf jeder Seite, auch in der
 * App, ohne erst bis zur Fußzeile zu rollen.
 */
export const NAV: NavEintrag[] = [
  { href: ERFASSUNGSBOGEN_URL, label: "Erfassungsbogen", aktivWenn: () => false },
  { href: "./datenschutz.html", label: "Datenschutz", aktivWenn: (d) => d === "datenschutz.html" },
  { href: "./impressum.html", label: "Impressum", aktivWenn: (d) => d === "impressum.html" },
];

/** Name der App im Logo-Link der Leiste. */
export const KOPFNAV_LOGO = "Meldekopf";

/**
 * Die Leiste dieser App für den Baustein. Mit drei kurzen Einträgen passt sie
 * auch auf 320 px in eine Zeile; ohne `schmalSichtbar` bleiben alle sichtbar.
 * `nur-breit` (siehe Stylesheet) bleibt als Mechanik erhalten und greift,
 * sobald die Leiste wächst.
 */
export const KOPFNAV: KopfnavQuelle = { eintraege: NAV, logo: KOPFNAV_LOGO };

/**
 * Die Leiste als statisches HTML (Start-Gerüst, Seiten unter public/).
 * `datei` ist der Dateiname der Seite unter `public/` — leer für die App.
 */
export function kopfnavHtml(datei: string, einzug = "  ", huelle: NavHuelle = "header"): string {
  return kopfnavHtmlAus(KOPFNAV, datei, einzug, huelle);
}

const MARKEN = kopfnavMarken("src/app/kopfnav.ts");
/** Marken, zwischen denen der erzeugte Block in index.html und public/*.html steht. */
export const MARKE_ANFANG = MARKEN.anfang;
export const MARKE_ENDE = MARKEN.ende;
