// @vitest-environment jsdom
// Die Logiktests laufen sonst in Node; hier braucht es einen XML-Parser, um die
// erzeugte Sitemap wirklich gegen das Schema zu prüfen statt gegen Textmuster.
// Herkunft: Erfassungsbogen `scripts/sitemap.test.ts` (Commit f2b77f1), auf die
// Seiten dieser App gekürzt.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BASIS_URL } from "../src/app/adressen";
import { eintraegeSammeln, quellen, sitemapErzeugen, sitemapXml } from "./sitemap";

const WURZEL = join(import.meta.dirname, "..");
const BASIS = BASIS_URL.replace(/\/$/, "");

/** Fester Datumsgeber, damit die Sammellogik ohne git prüfbar bleibt. */
const FESTES_DATUM = () => "2026-01-31";

/** Adresse aus dem rel="canonical" einer Seite — die Sitemap muss sie treffen. */
function canonical(datei: string): string | undefined {
  const html = readFileSync(join(WURZEL, datei), "utf8");
  return html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/)?.[1]?.replaceAll("%DOMAIN%", new URL(BASIS_URL).host);
}

/** Parst als XML und liefert das Dokument; wirft bei nicht wohlgeformtem XML. */
function xmlParsen(xml: string): Document {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const fehler = doc.querySelector("parsererror");
  if (fehler) throw new Error(`XML nicht wohlgeformt: ${fehler.textContent}`);
  return doc;
}

describe("eintraegeSammeln", () => {
  it("nimmt die Startseite und jede öffentliche Seite auf, aber nicht die 404", () => {
    const locs = eintraegeSammeln(["datenschutz.html", "404.html", "impressum.html"], FESTES_DATUM).map((e) => e.loc);
    expect(locs).toEqual([`${BASIS}/`, `${BASIS}/impressum.html`, `${BASIS}/datenschutz.html`]);
  });

  it("übergeht alles, was keine Seite ist (Icons, robots.txt, Unterordner)", () => {
    const locs = eintraegeSammeln(["robots.txt", "icon.svg", "icons"], FESTES_DATUM).map((e) => e.loc);
    expect(locs).toEqual([`${BASIS}/`]);
  });

  it("hängt eine neue Seite hinter die bekannten Seiten mit 0.7 an", () => {
    const eintraege = eintraegeSammeln(["impressum.html", "datenschutz.html", "bereitstellungsraum.html"], FESTES_DATUM);
    expect(eintraege[eintraege.length - 1]?.loc).toBe(`${BASIS}/bereitstellungsraum.html`);
    expect(eintraege[eintraege.length - 1]?.priority).toBe("0.7");
  });

  it("die Startseite hängt an index.html und src/, jede Textseite an ihrer Datei", () => {
    expect(quellen("")).toEqual(["index.html", "src"]);
    expect(quellen("impressum.html")).toEqual(["public/impressum.html"]);
  });
});

describe("sitemapXml", () => {
  it("schreibt wohlgeformtes XML mit loc, lastmod und priority in dieser Reihenfolge", () => {
    const doc = xmlParsen(sitemapXml([{ loc: `${BASIS}/`, lastmod: "2026-01-31", priority: "1.0" }, { loc: `${BASIS}/a&b.html`, priority: "0.7" }]));
    const urls = [...doc.querySelectorAll("url")];
    expect(urls.map((u) => [...u.children].map((k) => k.tagName))).toEqual([["loc", "lastmod", "priority"], ["loc", "priority"]]);
    expect(urls[1]?.querySelector("loc")?.textContent).toBe(`${BASIS}/a&b.html`);
  });
});

describe("gegen das echte Repo", () => {
  it("deckt genau die Canonical-Adressen der Seiten ab", () => {
    const doc = xmlParsen(sitemapErzeugen(WURZEL));
    const locs = [...doc.querySelectorAll("loc")].map((l) => l.textContent);
    const seiten = ["index.html", ...readdirSync(join(WURZEL, "public")).filter((d) => d.endsWith(".html") && d !== "404.html").map((d) => `public/${d}`)];
    for (const seite of seiten) {
      const c = canonical(seite);
      expect(c, `${seite} ohne rel=canonical`).toBeTruthy();
      expect(locs, `${seite} fehlt in der Sitemap`).toContain(c);
    }
    expect(locs).toHaveLength(seiten.length);
  });
});
