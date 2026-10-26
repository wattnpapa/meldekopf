import { describe, expect, it, afterEach } from "vitest";
import { act, cleanup, render } from "@testing-library/react";
import { useState } from "react";
import { ansichtAusZustand, ansichtGleich, ansichtKette, useAnsichtVerlauf, type Ansicht } from "./ansicht-verlauf";

describe("Ansichten im Verlauf", () => {
  it("liest nur gültige Ansichten aus dem Zustand", () => {
    expect(ansichtAusZustand(null)).toBeNull();
    expect(ansichtAusZustand({ eebAnsicht: { art: "einsatz" } })).toBeNull();
    expect(ansichtAusZustand({ eebAnsicht: { art: "erfassung", id: "x" } })).toEqual({ art: "erfassung", id: "x" });
    expect(ansichtAusZustand({ eebAnsicht: { art: "start", id: 3 } })).toEqual({ art: "start" });
  });

  it("vergleicht Art und Einsatz", () => {
    expect(ansichtGleich({ art: "einsatz", id: "a" }, { art: "einsatz", id: "a" })).toBe(true);
    expect(ansichtGleich({ art: "einsatz", id: "a" }, { art: "einsatz", id: "b" })).toBe(false);
    expect(ansichtGleich({ art: "einsatz", id: "a" }, { art: "erfassung", id: "a" })).toBe(false);
    expect(ansichtGleich({ art: "start" }, null)).toBe(false);
  });

  it("legt unter einer Erfassung Einsatz und Startseite", () => {
    expect(ansichtKette({ art: "erfassung", id: "a" })).toEqual([
      { art: "start" },
      { art: "einsatz", id: "a" },
      { art: "erfassung", id: "a" },
    ]);
  });
});

describe("useAnsichtVerlauf", () => {
  afterEach(cleanup);

  function Probe({ start, rufe }: { start: Ansicht; rufe: (s: (a: Ansicht) => void) => void }) {
    const [ansicht, setAnsicht] = useState<Ansicht>(start);
    rufe(setAnsicht);
    useAnsichtVerlauf(ansicht, setAnsicht);
    return <p data-testid="ansicht">{ansicht.art === "start" ? "start" : `${ansicht.art}:${ansicht.id}`}</p>;
  }

  it("legt beim Kaltstart in einen Einsatz die Startseite darunter", () => {
    history.replaceState(null, "");
    const laenge = history.length;
    render(<Probe start={{ art: "einsatz", id: "e1" }} rufe={() => {}} />);
    expect(history.length).toBe(laenge + 1);
    expect(ansichtAusZustand(history.state)).toEqual({ art: "einsatz", id: "e1" });
  });

  it("legt beim Wechsel in die Tiefe einen Eintrag an und ersetzt bei gleicher Tiefe", () => {
    history.replaceState(null, "");
    let setzen: (a: Ansicht) => void = () => {};
    const { getByTestId } = render(<Probe start={{ art: "start" }} rufe={(s) => (setzen = s)} />);
    expect((history.state as { eebErste?: boolean }).eebErste).toBe(true);
    const laenge = history.length;
    act(() => setzen({ art: "einsatz", id: "a" }));
    expect(history.length).toBe(laenge + 1);
    act(() => setzen({ art: "einsatz", id: "b" }));
    expect(history.length).toBe(laenge + 1);
    expect(ansichtAusZustand(history.state)).toEqual({ art: "einsatz", id: "b" });
    expect(getByTestId("ansicht").textContent).toBe("einsatz:b");
  });

  it("stellt bei Zurück die Ansicht des Eintrags her und schließt vorher ein offenes Fenster", () => {
    history.replaceState(null, "");
    let setzen: (a: Ansicht) => void = () => {};
    const { getByTestId } = render(<Probe start={{ art: "start" }} rufe={(s) => (setzen = s)} />);
    act(() => setzen({ art: "einsatz", id: "a" }));
    // Zurück mit offenem Fenster: Das Fenster geht zu, die Ansicht bleibt.
    const fenster = document.createElement("dialog");
    fenster.setAttribute("open", "");
    document.body.append(fenster);
    history.replaceState({ eebAnsicht: { art: "start" } }, "");
    act(() => void window.dispatchEvent(new PopStateEvent("popstate")));
    expect(fenster.open).toBe(false);
    expect(getByTestId("ansicht").textContent).toBe("einsatz:a");
    fenster.remove();
    // Ohne Fenster: zurück zur Startseite.
    history.replaceState({ eebAnsicht: { art: "start" } }, "");
    act(() => void window.dispatchEvent(new PopStateEvent("popstate")));
    expect(getByTestId("ansicht").textContent).toBe("start");
  });
});
