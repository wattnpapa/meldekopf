/**
 * Die Kopfnavigation — die EINE Quelle für die App und die Textseiten.
 *
 * Herkunft: Erfassungsbogen `src/app/kopfnav.ts` (Commit f2b77f1). Die Bauart
 * (Einträge als Daten, drei Fassungen aus einer Quelle, Prüfung gegen das
 * Start-Gerüst) ist übernommen; die Einträge sind die dieser App. Der
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

import { ERFASSUNGSBOGEN_URL } from "./adressen";

/** Ein Unterpunkt im Aufklappmenü eines Eintrags. */
export interface NavUnterpunkt {
  href: string;
  label: string;
}

/**
 * Ein Eintrag der Kopfleiste. `aktivWenn` bestimmt, für welche Datei unter
 * `public/` der Link als aktuelle Seite hervorgehoben wird. In der App ist
 * keine Seite aktiv: Die App ist das Ziel des Logos, kein Eintrag der Leiste.
 */
export interface NavEintrag {
  href: string;
  label: string;
  aktivWenn: (datei: string) => boolean;
  /**
   * Unterpunkte, die als Aufklapp-Menü unter dem Eintrag erscheinen. Rein per
   * CSS (`:hover`/`:focus-within`) — kein Skript zur Laufzeit. Auf Geräten ohne
   * echten Zeiger bleibt das Menü zu; dort führt der Eintrag selbst auf die
   * Seite, die genau diese Unterpunkte auflistet.
   */
  unter?: NavUnterpunkt[];
  /** Menü zweispaltig setzen (nur sinnvoll bei sehr vielen Unterpunkten). */
  zweispaltig?: boolean;
}

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

/**
 * Was auf schmalen Geräten sichtbar bleibt. Mit drei kurzen Einträgen passt
 * die Leiste auch auf 320 px in eine Zeile; `nur-breit` (siehe Stylesheet)
 * bleibt als Mechanik erhalten und greift, sobald die Leiste wächst.
 */
function schmalSichtbar(_eintrag: NavEintrag, _datei: string, _aktiv: boolean): boolean {
  return true;
}

/** Ein Eintrag, fertig entschieden: aktiv? mobil sichtbar? — für beide Fassungen. */
export interface NavStand {
  href: string;
  label: string;
  aktiv: boolean;
  nurBreit: boolean;
  unter?: NavUnterpunkt[];
  zweispaltig?: boolean;
}

/**
 * Die Leiste für eine Seite, mit allen Entscheidungen getroffen. HTML-Fassung
 * und React-Fassung lesen dieselbe Liste — sonst hätte „welcher Eintrag ist
 * aktiv, welcher bleibt schmal sichtbar?" zwei Antworten.
 */
export function kopfnavAufbau(datei: string): NavStand[] {
  return NAV.map((eintrag) => {
    const aktiv = eintrag.aktivWenn(datei);
    return {
      href: eintrag.href,
      label: eintrag.label,
      aktiv,
      nurBreit: !schmalSichtbar(eintrag, datei, aktiv),
      unter: eintrag.unter,
      zweispaltig: eintrag.zweispaltig,
    };
  });
}

/**
 * Die Hülle der Leiste. Auf den Textseiten ist sie der Seitenkopf und damit ein
 * `header`; in der App steht darunter schon der Kopfbalken mit dem Seitentitel
 * (`.seiten-kopf`). Zwei `header` nebeneinander wären zwei Banner-Landmarken
 * auf einer Seite — ein Screenreader kündigte denselben Seitenkopf zweimal an.
 * Dort trägt deshalb ein `div` die Leiste; die Navigation selbst ist ohnehin
 * das `nav` darin.
 */
export type NavHuelle = "header" | "div";

/** Name der App im Logo-Link der Leiste. */
export const KOPFNAV_LOGO = "Meldekopf";

/**
 * Die Leiste als statisches HTML.
 *
 * `datei` ist der Dateiname der Seite unter `public/`, für die gesetzt wird
 * (etwa `"impressum.html"`) — leer für die App, die keiner Rubrik angehört.
 * `einzug` ist die Einrückung der Hülle; ohne sie hinge der Vergleich im Test
 * an der Formatierung der Zieldatei.
 */
export function kopfnavHtml(datei: string, einzug = "  ", huelle: NavHuelle = "header"): string {
  const e = einzug;
  const links = kopfnavAufbau(datei).map((eintrag) => {
    const klasse = eintrag.aktiv ? ' class="aktiv"' : "";
    const breit = eintrag.nurBreit ? " nur-breit" : "";
    if (!eintrag.unter) {
      // Ohne Aufklappmenü trägt der Link selbst die Klassen.
      const klassen = `${eintrag.aktiv ? "aktiv" : ""}${breit}`.trim();
      return `<a href="${eintrag.href}"${klassen ? ` class="${klassen}"` : ""}>${eintrag.label}</a>`;
    }
    const unterlinks = eintrag.unter
      .map((u) => `<a href="${u.href}"${u.href === `./${datei}` ? ' class="aktiv"' : ""}>${u.label}</a>`)
      .join(`\n${e}          `);
    const menuKlasse = eintrag.zweispaltig ? "kopfnav-unter kopfnav-unter-breit" : "kopfnav-unter";
    return `<span class="kopfnav-eintrag${breit}">
${e}        <a href="${eintrag.href}"${klasse}>${eintrag.label}</a>
${e}        <span class="${menuKlasse}">
${e}          ${unterlinks}
${e}        </span>
${e}      </span>`;
  }).join(`\n${e}      `);
  return `${e}<${huelle} class="kopfnav">
${e}  <div class="kopfnav-inner">
${e}    <a href="./" class="kopfnav-logo">${KOPFNAV_LOGO}</a>
${e}    <nav class="kopfnav-links" aria-label="Hauptnavigation">
${e}      ${links}
${e}    </nav>
${e}  </div>
${e}</${huelle}>`;
}

/** Marken, zwischen denen der erzeugte Block in index.html und public/*.html steht. */
export const MARKE_ANFANG = "<!-- kopfnav:anfang (erzeugt aus src/app/kopfnav.ts — nicht von Hand ändern) -->";
export const MARKE_ENDE = "<!-- kopfnav:ende -->";
