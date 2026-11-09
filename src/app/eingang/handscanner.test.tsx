/**
 * Herkunft: Erfassungsbogen `src/app/handscanner.test.tsx` (Commit 1d7ed5f).
 */
/**
 * Der Handscanner-Lauscher: Scanner-Tempo erkennen, Abschluss mit und ohne
 * Enter, und die Tastatur der Seite in Ruhe lassen, wenn ein Mensch tippt.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  HANDSCANNER_ABSCHLUSS_MS,
  gemerkterScanWeg,
  handscannerLauscher,
  merkeScanWeg,
  tastaturGehoertElement,
  type HandscannerOptionen,
} from "./handscanner";

/** Uhr-Attrappe: jede Taste rückt die Zeit um `schritt` ms vor. */
function uhr(schritt: number) {
  let t = 1000;
  return vi.spyOn(performance, "now").mockImplementation(() => (t += schritt));
}

/** Eine Taste drücken; liefert `false`, wenn preventDefault() gerufen wurde. */
function taste(key: string, extra: KeyboardEventInit = {}): boolean {
  return window.dispatchEvent(new KeyboardEvent("keydown", { key, cancelable: true, bubbles: true, ...extra }));
}

const URL = "https://erfassungsbogen.app/#0ABC$*-/:XYZ";

let aushaengen: () => void = () => {};
function lauschen(opt: Partial<HandscannerOptionen> & Pick<HandscannerOptionen, "onScan">): void {
  aushaengen = handscannerLauscher(window, opt);
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  aushaengen();
  vi.restoreAllMocks();
  vi.useRealTimers();
  localStorage.clear();
});

describe("Handscanner-Lauscher auf der Seite", () => {
  it("meldet eine Tastenfolge im Scanner-Tempo mit Enter als Scan und hält sie von der Seite fern", () => {
    uhr(5);
    const onScan = vi.fn();
    lauschen({ onScan });

    const durchgelassen = [...URL].map((z) => taste(z));
    // Das erste Zeichen geht noch an die Seite — ab dem zweiten ist es ein Scan.
    expect(durchgelassen[0]).toBe(true);
    expect(durchgelassen.slice(1).every((d) => !d)).toBe(true);
    // Das Enter erreicht keinen fokussierten Knopf.
    expect(taste("Enter")).toBe(false);
    expect(onScan).toHaveBeenCalledExactlyOnceWith(URL);
  });

  it("schließt einen Scan ohne Enter nach kurzer Stille ab", () => {
    uhr(5);
    const onScan = vi.fn();
    const onZeichen = vi.fn();
    lauschen({ onScan, onZeichen });

    for (const z of URL) taste(z);
    expect(onScan).not.toHaveBeenCalled();
    vi.advanceTimersByTime(HANDSCANNER_ABSCHLUSS_MS + 1);
    expect(onScan).toHaveBeenCalledExactlyOnceWith(URL);
    expect(onZeichen).toHaveBeenLastCalledWith(0);
    // Ein verspätetes Enter des Scanners drückt danach keinen Knopf.
    expect(taste("Enter")).toBe(false);
  });

  it("lässt menschliches Tippen durch und meldet es nicht", () => {
    uhr(120); // flott, aber kein Scanner
    const onScan = vi.fn();
    lauschen({ onScan });

    expect([...URL].map((z) => taste(z)).every(Boolean)).toBe(true);
    vi.advanceTimersByTime(HANDSCANNER_ABSCHLUSS_MS * 4);
    expect(onScan).not.toHaveBeenCalled();
  });

  it("hält sich heraus, wo die Seite die Tastatur braucht (zustaendig = false)", () => {
    uhr(5);
    const onScan = vi.fn();
    lauschen({ onScan, zustaendig: () => false });

    for (const z of URL) taste(z);
    taste("Enter");
    vi.advanceTimersByTime(HANDSCANNER_ABSCHLUSS_MS * 2);
    expect(onScan).not.toHaveBeenCalled();
  });

  it("lässt Kurzbefehle und ein einzelnes Zeichen plus Enter in Ruhe", () => {
    uhr(5);
    const onScan = vi.fn();
    lauschen({ onScan });

    expect(taste("k", { ctrlKey: true })).toBe(true);
    expect(taste("a")).toBe(true);
    expect(taste("Enter")).toBe(true);
    expect(onScan).not.toHaveBeenCalled();
  });

  it("meldet im strengen Modus (Overlay) auch einen kurzen, mit Enter abgeschlossenen Code", () => {
    uhr(5);
    const onScan = vi.fn();
    lauschen({ onScan, streng: true });

    expect(taste("4")).toBe(false); // im Overlay wird jedes Zeichen verschluckt
    taste("2");
    taste("Enter");
    expect(onScan).toHaveBeenCalledExactlyOnceWith("42");
  });

  it("ruft bei Escape den Ausgang, ohne den Puffer anzufassen", () => {
    uhr(5);
    const onScan = vi.fn();
    const onEscape = vi.fn();
    lauschen({ onScan, onEscape, streng: true });

    for (const z of "https://erfassungsbogen.app/#") taste(z);
    expect(taste("Escape")).toBe(false);
    expect(onEscape).toHaveBeenCalledOnce();
    for (const z of "0ABC") taste(z);
    taste("Enter");
    expect(onScan).toHaveBeenCalledExactlyOnceWith("https://erfassungsbogen.app/#0ABC");
  });
});

describe("Wem die Tastatur gehört", () => {
  it("lässt Eingabefelder jeder Art, Auswahllisten und editierbare Bereiche in Ruhe", () => {
    for (const typ of ["text", "time", "date", "number", "tel", "search", "password"]) {
      const feld = document.createElement("input");
      feld.type = typ;
      expect(tastaturGehoertElement(feld), typ).toBe(true);
    }
    const ohneTyp = document.createElement("input");
    expect(tastaturGehoertElement(ohneTyp)).toBe(true);
    expect(tastaturGehoertElement(document.createElement("textarea"))).toBe(true);
    expect(tastaturGehoertElement(document.createElement("select"))).toBe(true);
    const bereich = document.createElement("div");
    bereich.setAttribute("contenteditable", "true");
    document.body.append(bereich);
    expect(tastaturGehoertElement(bereich)).toBe(true);
    bereich.remove();
  });

  it("gibt den Scan bei Knöpfen, Haken, Links und ohne Fokus frei", () => {
    for (const typ of ["checkbox", "radio", "button", "submit", "file", "range"]) {
      const feld = document.createElement("input");
      feld.type = typ;
      expect(tastaturGehoertElement(feld), typ).toBe(false);
    }
    expect(tastaturGehoertElement(document.createElement("button"))).toBe(false);
    expect(tastaturGehoertElement(document.createElement("a"))).toBe(false);
    expect(tastaturGehoertElement(document.body)).toBe(false);
    expect(tastaturGehoertElement(null)).toBe(false);
  });
});

describe("Gemerkter Scan-Weg", () => {
  it("ist ohne Eintrag die Kamera und merkt sich den Handscanner", () => {
    expect(gemerkterScanWeg()).toBe("kamera");
    merkeScanWeg("handscanner");
    expect(gemerkterScanWeg()).toBe("handscanner");
    merkeScanWeg("kamera");
    expect(gemerkterScanWeg()).toBe("kamera");
    expect(localStorage.getItem("eeb-scanweg")).toBeNull();
  });
});
