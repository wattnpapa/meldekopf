/**
 * Herkunft: Erfassungsbogen `src/app/lagemonitor-block.test.tsx` (Commit 1d7ed5f).
 */
/** R11-D4, R11-E6, R11-O5: Block „Lagemonitor für den Fernseher" in der Einsatzansicht. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dialogschicht } from "@bos/oberflaeche/dialoge";
import { LagemonitorBlock } from "../lagemonitor-ui";
import { einsatzbeginnLaden, einsatzbeginnSetzen } from "../lagemonitor-beginn";

const zeigen = () =>
  render(
    <>
      <LagemonitorBlock einsatzId="e1" alleIds={["e1"]} />
      <Dialogschicht />
    </>,
  );

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("Lagemonitor-Block (Runde 11)", () => {
  it("fragt vor „Jetzt“ nach, wenn ein Beginn eingetragen ist (R11-D4)", async () => {
    const alt = new Date(2026, 9, 24, 8, 0).getTime();
    einsatzbeginnSetzen("e1", alt, ["e1"]);
    const nutzer = userEvent.setup();
    zeigen();
    await nutzer.click(screen.getByRole("button", { name: "Jetzt" }));
    const dialog = document.querySelector<HTMLDialogElement>("dialog.abfrage")!;
    expect(dialog.textContent).toContain("08:00 Uhr");
    await nutzer.click(within(dialog).getByRole("button", { name: "Beginn behalten" }));
    expect(einsatzbeginnLaden("e1")).toBe(alt);
    await nutzer.click(screen.getByRole("button", { name: "Jetzt" }));
    await nutzer.click(within(document.querySelector<HTMLDialogElement>("dialog.abfrage")!).getByRole("button", { name: "Durch jetzt ersetzen" }));
    expect(einsatzbeginnLaden("e1")).not.toBe(alt);
  });

  it("setzt „Jetzt“ ohne Rückfrage, solange der Beginn leer ist (R11-D4)", async () => {
    const nutzer = userEvent.setup();
    zeigen();
    await nutzer.click(screen.getByRole("button", { name: "Jetzt" }));
    expect(document.querySelector("dialog.abfrage")).toBeNull();
    expect(einsatzbeginnLaden("e1")).not.toBeNull();
  });

  it("warnt bei einem Beginn im falschen Jahr (R11-E6)", () => {
    einsatzbeginnSetzen("e1", new Date(2062, 9, 25, 8, 0).getTime(), ["e1"]);
    zeigen();
    expect(document.querySelector(".lm-beginn-hinweis")?.textContent).toContain("Zukunft");
  });

  it("meldet einen vollen Speicher auch beim Funkrufnamen (R11-O5)", () => {
    zeigen();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("voll", "QuotaExceededError");
    });
    fireEvent.change(screen.getByLabelText(/Funkrufname/), { target: { value: "Florian Test 1" } });
    expect(screen.getByText(/Der Funkrufname konnte nicht gespeichert werden/)).toBeDefined();
  });
});
