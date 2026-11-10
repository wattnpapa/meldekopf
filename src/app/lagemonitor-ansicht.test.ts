/**
 * Neu im Meldekopf: Wahl der Ansicht des Lagemonitors (Zeilen oder Tafel).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ANSICHT_NAME, ANSICHT_SCHLUESSEL, lageAnsichtLaden, lageAnsichtMerken } from "./lagemonitor-ansicht";

/** Ablage wie im Browser; die Logiktests laufen in Node ohne localStorage. */
function ablage(): Storage {
  const inhalt = new Map<string, string>();
  return {
    get length() {
      return inhalt.size;
    },
    key: (i) => [...inhalt.keys()][i] ?? null,
    getItem: (k) => inhalt.get(k) ?? null,
    setItem: (k, v) => void inhalt.set(k, String(v)),
    removeItem: (k) => void inhalt.delete(k),
    clear: () => inhalt.clear(),
  };
}

describe("Ansicht des Lagemonitors", () => {
  beforeEach(() => vi.stubGlobal("localStorage", ablage()));
  afterEach(() => vi.unstubAllGlobals());

  it("zeigt ohne Wahl die Zeilen: Für Bestandsgeräte ändert sich nichts", () => {
    expect(lageAnsichtLaden()).toBe("zeilen");
  });

  it("merkt die Tafel geräteweit und nimmt die Vorgabe wieder aus dem Speicher", () => {
    expect(lageAnsichtMerken("tafel")).toBe(true);
    expect(localStorage.getItem(ANSICHT_SCHLUESSEL)).toBe("tafel");
    expect(lageAnsichtLaden()).toBe("tafel");
    expect(lageAnsichtMerken("zeilen")).toBe(true);
    expect(localStorage.getItem(ANSICHT_SCHLUESSEL)).toBeNull();
    expect(lageAnsichtLaden()).toBe("zeilen");
  });

  it("liest Unbekanntes als Zeilen", () => {
    localStorage.setItem(ANSICHT_SCHLUESSEL, "karussell");
    expect(lageAnsichtLaden()).toBe("zeilen");
  });

  it("liegt unter dem Präfix der App: Die Datensicherung nimmt den Schlüssel mit, „Alle Daten löschen“ entfernt ihn", () => {
    expect(ANSICHT_SCHLUESSEL.startsWith("eeb.")).toBe(true);
  });

  it("übersteht einen gesperrten oder vollen Speicher und meldet ihn", () => {
    vi.stubGlobal("localStorage", {
      ...ablage(),
      getItem: () => {
        throw new DOMException("gesperrt", "SecurityError");
      },
      setItem: () => {
        throw new DOMException("voll", "QuotaExceededError");
      },
    });
    expect(lageAnsichtLaden()).toBe("zeilen");
    expect(lageAnsichtMerken("tafel")).toBe(false);
  });

  it("nennt beide Ansichten beim Namen", () => {
    expect(ANSICHT_NAME).toEqual({ zeilen: "Zeilen", tafel: "Tafel" });
  });
});
