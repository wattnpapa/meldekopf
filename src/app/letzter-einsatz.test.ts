/**
 * Die zuletzt offene Sammlung öffnet nach dem Neuladen wieder (W5), aber nur
 * für zwölf Stunden und nur, solange es sie gibt.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LETZTER_EINSATZ_FRIST_MS, LETZTER_EINSATZ_SCHLUESSEL, letztenEinsatzLaden, letztenEinsatzMerken } from "./letzter-einsatz";

const vorhanden = vi.hoisted(() => ({ ids: ["s1"] }));
vi.mock("./einsaetze-lesen", () => ({ einsaetzeLaden: () => vorhanden.ids.map((id) => ({ id })) }));

function speicher(): void {
  const inhalt = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => inhalt.get(k) ?? null,
    setItem: (k: string, v: string) => void inhalt.set(k, v),
    removeItem: (k: string) => void inhalt.delete(k),
  });
}

describe("letzter Einsatz", () => {
  beforeEach(speicher);
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("merkt die offene Sammlung und gibt sie wieder", () => {
    letztenEinsatzMerken("s1");
    expect(letztenEinsatzLaden()).toBe("s1");
  });

  it("vergisst sie nach zwölf Stunden", () => {
    vi.useFakeTimers();
    letztenEinsatzMerken("s1");
    vi.advanceTimersByTime(LETZTER_EINSATZ_FRIST_MS + 1);
    expect(letztenEinsatzLaden()).toBeNull();
  });

  it("nennt keine Sammlung, die es nicht mehr gibt", () => {
    letztenEinsatzMerken("weg");
    expect(letztenEinsatzLaden()).toBeNull();
  });

  it("null löscht den Merker", () => {
    letztenEinsatzMerken("s1");
    letztenEinsatzMerken(null);
    expect(localStorage.getItem(LETZTER_EINSATZ_SCHLUESSEL)).toBeNull();
  });
});
