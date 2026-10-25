/**
 * Herkunft: Erfassungsbogen `scripts/precache-aufteilung.test.ts` (Commit
 * f2b77f1); der Test zu `relativerPfad` kommt mit offline-vorrat.ts (Phase 2).
 */
import { describe, expect, it } from "vitest";
import { istZusatz, vorratAufteilen } from "./precache-aufteilung";

describe("Offline-Vorrat in zwei Stufen (R3-O3)", () => {
  it("lässt App, Schrift, Icons und die verlinkten Seiten im Kern", () => {
    for (const u of [
      "index.html",
      "datenschutz.html",
      "impressum.html",
      "404.html",
      "assets/index-abc.js",
      "assets/archivo-abc.woff2",
      "manifest.webmanifest",
      "icon.svg",
      "icons/icon-192.png",
    ]) {
      expect(istZusatz(u), u).toBe(false);
    }
  });

  it("legt eingebundene JSON-Dateien und Themenseiten in die zweite Stufe", () => {
    for (const u of ["assets/001-beispiel-abc.json", "thw.html", "uebersicht.html"]) {
      expect(istZusatz(u), u).toBe(true);
    }
  });

  it("legt die WebP-Fotos der Seiten in die zweite Stufe, JPG/PNG und Logos nicht (R5-O4)", () => {
    for (const u of ["bilder/meldekopf-zelt.webp", "screenshots/start-breit.webp"]) {
      expect(istZusatz(u), u).toBe(true);
    }
    for (const u of ["bilder/thw-logo.svg", "icons/icon-192.png", "screenshots/start-breit.png"]) {
      expect(istZusatz(u), u).toBe(false);
    }
  });

  it("teilt das Manifest und nennt beide Umfänge", () => {
    const { kern, umfang } = vorratAufteilen([
      { url: "index.html", revision: "1", size: 10 },
      { url: "assets/x-1.json", revision: null, size: 5 },
      { url: "thw.html", revision: "2", size: 7 },
    ]);
    expect(kern.map((e) => e.url)).toEqual(["index.html"]);
    expect(umfang.kern).toEqual([{ url: "index.html", size: 10 }]);
    expect(umfang.zusatz.map((e) => e.url)).toEqual(["assets/x-1.json", "thw.html"]);
  });
});
