/**
 * Was als „angefangene Erfassung" gilt: Eine frisch geöffnete Schnellerfassung
 * ist es nicht (sonst fragte die App bei jedem Öffnen), eine mit Ort schon.
 */
import { describe, expect, it } from "vitest";
import { bogenHatInhalt } from "../hilfen";
import { schnellerfassungsBogen } from "./schnellerfassung";

describe("angefangene Erfassung", () => {
  it("ein frischer Nur-Stärke-Bogen hat noch keinen Inhalt", () => {
    expect(bogenHatInhalt(schnellerfassungsBogen())).toBe(false);
  });

  it("mit Ort oder gezählter Stärke ist er angefangen", () => {
    const mitOrt = schnellerfassungsBogen();
    mitOrt.einheit.hierarchie[0]!.name = "Bremen";
    expect(bogenHatInhalt(mitOrt)).toBe(true);
    const gezaehlt = schnellerfassungsBogen();
    gezaehlt.staerkeManuell = { fuehrer: 0, unterfuehrer: 1, mannschaft: 3, gesamt: 4 };
    expect(bogenHatInhalt(gezaehlt)).toBe(true);
  });
});
