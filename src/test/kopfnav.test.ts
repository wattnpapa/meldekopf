/**
 * Hält die Fassungen der Kopfnavigation zusammen.
 *
 * Herkunft: Erfassungsbogen `src/test/kopfnav.test.ts` (Commit f2b77f1); die
 * Prüfung der Anleitungs-Sprungmarken kommt mit der Anleitung (Phase 5).
 *
 * Die Leiste existiert mehrmals: in den statischen Seiten unter `public/`, im
 * Start-Gerüst von index.html — das ist, was das Auge zuerst sieht und was ein
 * Crawler ohne JavaScript bekommt — und in der React-Ansicht, die das Gerüst
 * beim Mount ersetzt. Weicht das Gerüst von der Quelle ab, springt die Seite
 * beim Mount. Der Block wird deshalb erzeugt, nicht getippt; dieser Test
 * prüft, dass die erzeugte Fassung noch drinsteht. Zum Nachziehen:
 *   npm run kopfnav
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MARKE_ANFANG, MARKE_ENDE, NAV, kopfnavHtml } from "../app/kopfnav";

const WURZEL = join(import.meta.dirname, "..", "..");
const INDEX = readFileSync(join(WURZEL, "index.html"), "utf8");

function block(html: string, datei: string): string {
  const anfang = html.indexOf(MARKE_ANFANG);
  const ende = html.indexOf(MARKE_ENDE);
  expect(anfang, `Anfangsmarke fehlt in ${datei}`).toBeGreaterThan(-1);
  expect(ende, `Endmarke fehlt in ${datei}`).toBeGreaterThan(anfang);
  return html.slice(anfang + MARKE_ANFANG.length, ende).trim();
}

describe("Kopfnavigation", () => {
  it("steht im statischen Gerüst genau so wie in der Quelle", () => {
    expect(block(INDEX, "index.html"), "index.html ist veraltet: npm run kopfnav").toBe(kopfnavHtml("", "    ", "div").trim());
  });

  it("steht in jeder Textseite mit Leiste genau so wie in der Quelle", () => {
    const seiten = readdirSync(join(WURZEL, "public")).filter((d) => d.endsWith(".html"));
    expect(seiten.length).toBeGreaterThan(0);
    for (const datei of seiten) {
      const html = readFileSync(join(WURZEL, "public", datei), "utf8");
      if (!html.includes(MARKE_ANFANG)) continue; // Fehlerseite ohne Leiste
      expect(block(html, datei), `${datei} ist veraltet: npm run kopfnav`).toBe(kopfnavHtml(datei, "  ", "header").trim());
    }
  });

  it("steht hinter der Sprungmarke, nicht davor", () => {
    // Sonst führt der Weg zum Inhalt durch die Navigationslinks — an genau
    // dem Element vorbei, das ihn abkürzen soll (WCAG 2.4.1).
    expect(INDEX.indexOf('class="sprungmarke"')).toBeLessThan(INDEX.indexOf(MARKE_ANFANG));
  });

  it("verweist nur auf Seiten, die es gibt, oder nach außen", () => {
    const ziele = new Set<string>();
    for (const eintrag of NAV) {
      ziele.add(eintrag.href);
      for (const u of eintrag.unter ?? []) ziele.add(u.href);
    }
    const fehlend = [...ziele]
      .filter((z) => !/^https?:\/\//.test(z))
      .map((z) => z.replace(/^\.\//, "").replace(/[#?].*$/, ""))
      .filter((datei) => datei !== "" && !existsSync(join(WURZEL, "public", datei)));
    expect(fehlend).toEqual([]);
  });

  it("markiert auf einer Textseite genau ihren Eintrag als aktiv", () => {
    const html = kopfnavHtml("impressum.html");
    expect(html.match(/class="aktiv"/g)).toHaveLength(1);
    expect(html).toContain('<a href="./impressum.html" class="aktiv">Impressum</a>');
  });
});
