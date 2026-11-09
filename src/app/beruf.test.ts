/**
 * Herkunft: Erfassungsbogen `src/app/beruf.test.ts` (Commit 1d7ed5f).
 */
import { describe, expect, it } from "vitest";
import { BERUF_PRAEFIX, alsBeruf, berufText, istBeruf, qualifikationenUndBerufe, zusatzqualifikationenAus } from "./beruf";

describe("Berufe im Feld der Zusatzqualifikationen", () => {
  it("erkennt einen Beruf am Präfix — Codes und sonstiger Freitext sind keiner", () => {
    expect(istBeruf({ freitext: "Beruf: Elektroniker/in" })).toBe(true);
    expect(istBeruf({ freitext: "Motorsägenschein" })).toBe(false);
    expect(istBeruf({ freitext: "Berufskraftfahrer (extern)" })).toBe(false);
    expect(istBeruf({ code: 32 })).toBe(false);
  });

  it("liefert die Bezeichnung ohne Präfix und markiert sie umgekehrt genau einmal", () => {
    expect(berufText({ freitext: "Beruf: Elektroniker/in" })).toBe("Elektroniker/in");
    expect(berufText({ freitext: "Elektroniker/in" })).toBe("Elektroniker/in");
    expect(alsBeruf("  Dachdecker/in ")).toEqual({ freitext: `${BERUF_PRAEFIX}Dachdecker/in` });
    expect(alsBeruf("Beruf: Dachdecker/in")).toEqual({ freitext: "Beruf: Dachdecker/in" });
  });

  it("trennt ein gemischtes Feld in Reihenfolge und fügt es als Qualifikationen + Berufe wieder zusammen", () => {
    const feld = [{ freitext: "Beruf: Zimmerer/in" }, { code: 32 }, { freitext: "Motorsägenschein" }, { freitext: "Beruf: Elektroniker/in" }];
    const { qualifikationen, berufe } = qualifikationenUndBerufe({ zusatzqualifikationen: feld });
    expect(qualifikationen).toEqual([{ code: 32 }, { freitext: "Motorsägenschein" }]);
    expect(berufe).toEqual([{ freitext: "Beruf: Zimmerer/in" }, { freitext: "Beruf: Elektroniker/in" }]);
    // Das Berufsfeld reicht die Chips ohne Präfix zurück; leere Einträge fallen weg.
    expect(zusatzqualifikationenAus(qualifikationen, [{ freitext: "Zimmerer/in" }, { freitext: " " }])).toEqual([
      { code: 32 },
      { freitext: "Motorsägenschein" },
      { freitext: "Beruf: Zimmerer/in" },
    ]);
  });
});
