/**
 * Hält die beiden Pfade der Startseite zusammen.
 *
 * Herkunft: Erfassungsbogen `src/test/start-inhalt.test.ts` (Commit f2b77f1),
 * ohne den FAQ-Teil. Zusätzlich: Einleitung, Offline-Zusage und Stand-Karte
 * stehen im Gerüst wie in der React-Ansicht.
 *
 * Der erklärende Text steht einmal als Daten (src/app/start-inhalt.ts) und
 * erscheint an zwei Stellen: im statischen Gerüst von index.html und in der
 * React-Ansicht, die das Gerüst beim Mount ersetzt. Weicht der Block in
 * index.html von der Quelle ab, ändert sich der sichtbare Text beim Mount.
 * Der Block wird deshalb erzeugt, nicht getippt; dieser Test prüft, dass die
 * erzeugte Fassung noch drinsteht. Zum Nachziehen: npm run start-inhalt
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MARKE_ANFANG, MARKE_ENDE, START_ABSCHNITTE, startInhaltHtml } from "../app/start-inhalt";
import { OFFLINE_ZUSAGE, START_INTRO } from "../app/app";

const INDEX = readFileSync(join(import.meta.dirname, "..", "..", "index.html"), "utf8");

describe("Startseiten-Text", () => {
  it("steht im statischen Gerüst genau so wie in der Quelle", () => {
    const anfang = INDEX.indexOf(MARKE_ANFANG);
    const ende = INDEX.indexOf(MARKE_ENDE);
    expect(anfang, "Anfangsmarke fehlt in index.html").toBeGreaterThan(-1);
    expect(ende, "Endmarke fehlt in index.html").toBeGreaterThan(anfang);
    const block = INDEX.slice(anfang + MARKE_ANFANG.length, ende).trim();
    expect(block, "index.html ist veraltet: npm run start-inhalt").toBe(startInhaltHtml().trim());
  });

  it("Einleitung und Offline-Zusage stehen im Gerüst wie in der App", () => {
    expect(INDEX).toContain(`<p class="start-intro">${START_INTRO}</p>`);
    expect(INDEX).toContain(`<p class="offline-badge">${OFFLINE_ZUSAGE}</p>`);
  });

  it("nennt die drei Glieder der Produktfamilie und den Stand der Übernahme", () => {
    const text = JSON.stringify(START_ABSCHNITTE);
    for (const wort of ["Erfassungsbogen", "S1-Control", "Meldekopf", "im Aufbau"]) expect(text).toContain(wort);
    expect(START_ABSCHNITTE.map((a) => a.titel)).toContain("Stand");
  });

  it("verweist nur auf Seiten, die es gibt, oder nach außen", () => {
    const ziele = START_ABSCHNITTE.flatMap((a) => a.bloecke).flatMap((b) => (b.art === "absatz" ? b.teile : b.punkte.flat()));
    for (const t of ziele) {
      if (typeof t === "string") continue;
      if (/^https?:\/\//.test(t.ziel)) continue;
      const datei = t.ziel.replace(/^\.\//, "").replace(/[#?].*$/, "");
      expect(existsSync(join(import.meta.dirname, "..", "..", "public", datei)), `${t.ziel} fehlt in public/`).toBe(true);
    }
  });
});
