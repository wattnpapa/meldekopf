/**
 * Die Kennfarbe des Meldekopfs im Anzeigemodus aus `@bos/oberflaeche`.
 *
 * Herkunft: der Meldekopf-Teil von `src/app/anzeige-schalter.test.tsx`
 * (Phase 0, aus dem Erfassungsbogen, Commit f2b77f1). Den Schalter selbst
 * prüft seit Phase 1 der Baustein mit seinen eigenen Tests; hier bleibt, was
 * nur diese App betrifft: Petrol statt Dienstblau, an allen drei Stellen
 * gleich (kennfarbe.ts, Meta-Tag und `--akzent` der index.html), und die
 * Browserleiste kehrt nach dem Nacht-Modus zu Petrol zurück, auch wenn das
 * Boot-Skript den Meta-Tag schon vor dem Bundle umgefärbt hat.
 *
 * Der Kopfbalken des Meldekopfs trägt immer dieselbe Kennfarbe
 * (docs/architektur.md Kap. 8.1); Prüfungen gegen die Organisationsfarben
 * entfallen deshalb.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AnzeigeSchalter } from "@bos/oberflaeche/anzeige-schalter";
import { NACHT_KOPF_FOND, standardThemeFarbeSetzen } from "@bos/oberflaeche/anzeige-modus";
import { KENNFARBE } from "../app/kennfarbe";

// Pfad statt URL: unter jsdom ist `URL` die des DOM, und readFileSync nähme sie nicht.
const INDEX = readFileSync(join(import.meta.dirname, "..", "..", "index.html"), "utf8");

describe("Kennfarbe an allen Stellen dieselbe", () => {
  it("Meta-Tag und --akzent der index.html tragen die Kennfarbe aus kennfarbe.ts", () => {
    expect(INDEX).toContain(`<meta name="theme-color" content="${KENNFARBE}" />`);
    expect(INDEX).toMatch(new RegExp(`:root \\{\\s*--akzent:\\s*${KENNFARBE};`));
  });

  it("steht vor den Token des Bausteins (sonst schlüge sie das Bernstein des Nacht-Modus)", () => {
    expect(INDEX.indexOf(`--akzent:      ${KENNFARBE}`)).toBeLessThan(INDEX.indexOf("/* oberflaeche:token */"));
  });
});

/**
 * Browserleiste (`<meta name="theme-color">`) folgt dem Modus (R2-L6):
 * Android färbt damit Status- und Adressleiste ein. Nachts nimmt sie den
 * dunklen Kopf-Ton, sonst die Kennfarbe.
 */
describe("theme-color folgt dem Anzeigemodus", () => {
  function metaFarbe(): string {
    return document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')!.content;
  }
  function meta(inhalt: string): void {
    document.head.querySelector('meta[name="theme-color"]')?.remove();
    const m = document.createElement("meta");
    m.name = "theme-color";
    m.content = inhalt;
    document.head.append(m);
  }
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    standardThemeFarbeSetzen(KENNFARBE); // wie main.tsx
  });
  afterEach(() => standardThemeFarbeSetzen(null));

  it("nachts dunkler Kopf-Ton, in Standard, Feld und Dunkel die Kennfarbe", async () => {
    meta(KENNFARBE);
    const u = userEvent.setup();
    render(<AnzeigeSchalter />);
    await u.click(screen.getByRole("button", { name: "Nacht" }));
    expect(metaFarbe()).toBe(NACHT_KOPF_FOND);
    await u.click(screen.getByRole("button", { name: "Dunkel" }));
    expect(metaFarbe()).toBe(KENNFARBE);
    await u.click(screen.getByRole("button", { name: "Feld" }));
    expect(metaFarbe()).toBe(KENNFARBE);
    await u.click(screen.getByRole("button", { name: "Standard" }));
    expect(metaFarbe()).toBe(KENNFARBE);
  });

  it("Kaltstart in der Nacht: das Boot-Skript hat den Meta-Tag schon umgefärbt, zurück geht es trotzdem zu Petrol", async () => {
    meta(NACHT_KOPF_FOND);
    localStorage.setItem("eeb.anzeigemodus.v1", "nacht");
    document.documentElement.classList.add("nacht-modus");
    const u = userEvent.setup();
    render(<AnzeigeSchalter />);
    await u.click(screen.getByRole("button", { name: "Standard" }));
    expect(metaFarbe()).toBe(KENNFARBE);
  });
});
