/**
 * Neu im Meldekopf: Fällt die Tafel-Ansicht aus, zeigt der Lagemonitor die Zeilen, statt leer zu bleiben.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { EinsatzArt, einsatzAnlegen, meldungHinzufuegen } from "@bos/meldekopf/einsaetze";
import { neuerBogen } from "./hilfen";
import { ANSICHT_SCHLUESSEL } from "./lagemonitor-ansicht";
import { Lagemonitor } from "./lagemonitor-ui";

// Der Brocken der Tafel ist nicht zu bekommen: wie in einem lange offenen Monitor-Fenster nach einem Update der App,
// dessen alter Brocken weder im Vorrat noch auf dem Server liegt.
vi.mock("./lagetafel-ui", () => ({
  default: () => {
    throw new Error("Failed to fetch dynamically imported module");
  },
}));

function einsatz(): string {
  const e = einsatzAnlegen("Hochwasser Weser", EinsatzArt.EINSATZ, "Brake");
  const b = neuerBogen();
  b.einheit.hierarchie[0]!.name = "Brake";
  b.staerkeManuell = { fuehrer: 0, unterfuehrer: 2, mannschaft: 7, gesamt: 9 };
  meldungHinzufuegen(e.id, b);
  return e.id;
}

describe("Lagemonitor: Die Tafel fällt aus", () => {
  beforeEach(() => {
    localStorage.clear();
    // React meldet den gefangenen Fehler auf der Konsole; das gehört zum Fall und soll den Testlauf nicht füllen.
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("zeigt die Zeilen, sagt warum und bietet „Neu laden“ statt des Wechsels an", async () => {
    const id = einsatz();
    localStorage.setItem(ANSICHT_SCHLUESSEL, "tafel");
    render(<Lagemonitor einsatzId={id} />);
    // Erst steht der leere Grund da, solange die Tafel lädt; scheitert das, folgen die Zeilen mit dem Hinweis.
    await vi.waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/^Die Tafel lässt sich in diesem Fenster gerade nicht zeigen/));
    // Der Monitor ist nicht leer: Lage und Stärke stehen in den Zeilen da.
    expect(document.querySelector("main.lt")).toBeNull();
    expect(document.querySelector("main.lm")!.textContent).toContain("0 / 2 / 7 = 9");
    expect(screen.queryByRole("button", { name: /^Ansicht:/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Neu laden" })).toBeTruthy();
    // Die Wahl bleibt gemerkt: Nach dem Neuladen steht wieder die Tafel da.
    expect(localStorage.getItem(ANSICHT_SCHLUESSEL)).toBe("tafel");
  });

  it("fällt auch aus den Zeilen heraus zurück, wenn der Wechsel zur Tafel scheitert", async () => {
    const id = einsatz();
    render(<Lagemonitor einsatzId={id} />);
    expect(screen.queryByRole("alert")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Tafel zeigen" }));
    await vi.waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/^Die Tafel lässt sich/));
    expect(document.querySelector("main.lm")).not.toBeNull();
  });

  it("nimmt den Hinweis zurück, sobald wieder die Zeilen gewählt sind", async () => {
    const id = einsatz();
    localStorage.setItem(ANSICHT_SCHLUESSEL, "tafel");
    render(<Lagemonitor einsatzId={id} />);
    await vi.waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
    // Die Einsatzansicht stellt auf Zeilen zurück (Speicher-Ereignis aus dem anderen Fenster).
    localStorage.removeItem(ANSICHT_SCHLUESSEL);
    fireEvent(window, new StorageEvent("storage", { key: ANSICHT_SCHLUESSEL }));
    await vi.waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    expect(screen.getByRole("button", { name: "Tafel zeigen" })).toBeTruthy();
  });
});
