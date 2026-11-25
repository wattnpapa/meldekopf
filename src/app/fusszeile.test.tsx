/**
 * Fußzeile: „Was ist neu" und die Pflege des Änderungsverlaufs.
 *
 * Herkunft: Erfassungsbogen `src/app/fusszeile.test.tsx`, Abschnitte
 * „Was ist neu" und „AENDERUNGEN". Der Test der Liste hält die Regeln aus
 * CLAUDE.md fest: neueste oben, ein Eintrag je Tag, jeder Monat mit Satz.
 */

import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Fusszeile } from "./fusszeile";

describe("Was ist neu", () => {
  it("zeigt zuerst den neuesten Monat mit Zusammenfassung und blättert monatsweise zurück", async () => {
    const nutzer = userEvent.setup();
    const { AENDERUNGEN, MONATE } = await import("./aenderungen");
    render(<Fusszeile />);
    await nutzer.click(screen.getByRole("button", { name: /Was ist neu/ }));
    const dialog = await screen.findByRole("dialog", { name: "Was ist neu", hidden: true });
    const monat = () => dialog.querySelector(".aenderungen-monat")!.textContent;
    const tage = () => [...dialog.querySelectorAll(".aenderung h4")].map((h) => h.textContent);
    const neuester = AENDERUNGEN[0]!.datum;
    expect(dialog.querySelector(".aenderungen-kurz")!.textContent).toBe(MONATE[neuester.slice(0, 7)]);
    // Neuester Eintrag aus den Daten, nicht fest: sonst bricht der Test mit jedem neuen Tag im Verlauf.
    expect(tage()[0]).toBe(neuester.split("-").reverse().join("."));
    const neuer = within(dialog).getByRole("button", { name: "← Neuer", hidden: true }) as HTMLButtonElement;
    expect(neuer.disabled).toBe(true);
    const aelter = within(dialog).getByRole("button", { name: "Älter →", hidden: true }) as HTMLButtonElement;
    const ersterMonat = monat();
    await nutzer.click(aelter);
    expect(monat()).not.toBe(ersterMonat);
    // Bis zum ersten Monat blättern: dort ist „Älter“ gesperrt und der erste Tag steht da.
    while (!aelter.disabled) await nutzer.click(aelter);
    expect(monat()).toBe("Oktober 2026");
    expect(tage()[tage().length - 1]).toBe("25.10.2026");
    const monate = new Set(AENDERUNGEN.map((a) => a.datum.slice(0, 7))).size;
    expect(within(dialog).getByText(/^\d+ von \d+$/).textContent).toBe(`${monate} von ${monate}`);
  });
});

describe("AENDERUNGEN", () => {
  it("steht nach Datum absteigend, ohne doppelte Tage, und jeder Monat hat seine Zusammenfassung", async () => {
    const { AENDERUNGEN, MONATE } = await import("./aenderungen");
    const tage = AENDERUNGEN.map((a) => a.datum);
    expect(tage).toEqual([...tage].sort().reverse());
    expect(new Set(tage).size).toBe(tage.length);
    for (const t of tage) expect(t).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const monate = [...new Set(tage.map((t) => t.slice(0, 7)))];
    expect(Object.keys(MONATE).sort()).toEqual([...monate].sort());
    for (const a of AENDERUNGEN) expect(a.punkte.length).toBeGreaterThan(0);
    expect(tage[tage.length - 1]).toBe("2026-10-25"); // Verlauf seit der ersten Fassung
  });
});
