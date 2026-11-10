import { describe, expect, it } from "vitest";
import { ERFASSUNGSBOGEN_URL, erfassungsbogenMitRueckweg } from "./adressen";

describe("erfassungsbogenMitRueckweg()", () => {
  it("öffnet den Erfassungsbogen mit Rücksprung-Marke, der Bogen steht im Fragment", () => {
    const url = new URL(erfassungsbogenMitRueckweg("AbC-_1"));
    expect(url.origin + url.pathname).toBe(ERFASSUNGSBOGEN_URL);
    expect(url.searchParams.get("rueck")).toBe("meldekopf");
    expect(url.hash).toBe("#AbC-_1");
  });
});
