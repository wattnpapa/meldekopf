/**
 * Die Startseite der leeren App (Phase 0): Kopf, Stand-Karte, erklärender
 * Text, Fußzeile mit Pflichtangaben und Anzeigemodus.
 */
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "./app";

describe("Startseite", () => {
  it("zeigt Titel, Einleitung, Stand und den erklärenden Text", () => {
    render(<App />);
    expect(screen.getByRole("heading", { level: 1, name: "Meldekopf" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Im Aufbau" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Die Produktfamilie" })).toBeTruthy();
    // Die Offline-Zeile nennt den echten Stand (offline-bereit.ts); jsdom hat keinen Service Worker.
    expect(screen.getByText(/Offline-Vorrat ist in diesem Browser nicht möglich.*Alle Daten bleiben auf diesem Gerät/)).toBeTruthy();
  });

  it("die Kopfnavigation führt zum Erfassungsbogen und zu den Pflichtangaben", () => {
    render(<App />);
    const nav = screen.getByRole("navigation", { name: "Hauptnavigation" });
    expect(within(nav).getByRole("link", { name: "Erfassungsbogen" }).getAttribute("href")).toBe("https://erfassungsbogen.app/");
    expect(within(nav).getByRole("link", { name: "Impressum" }).getAttribute("href")).toBe("./impressum.html");
  });

  it("Impressum und Datenschutz öffnen als eigene Dialoge, nicht als Systemdialoge", async () => {
    const u = userEvent.setup();
    render(<App />);
    await u.click(screen.getByRole("button", { name: "Impressum" }));
    const impressum = screen.getByRole("dialog", { name: "Impressum" }) as HTMLDialogElement;
    expect(impressum.open).toBe(true);
    expect(within(impressum).getByText(/§ 5 DDG/)).toBeTruthy();
    await u.click(within(impressum).getByRole("button", { name: "Schließen" }));
    expect(impressum.open).toBe(false);

    await u.click(screen.getByRole("button", { name: "Datenschutz" }));
    const datenschutz = screen.getByRole("dialog", { name: "Datenschutz" });
    expect(within(datenschutz).getByRole("heading", { name: "1. Verantwortlicher" })).toBeTruthy();
    // Widerspruch gegen die Reichweitenmessung wird gespeichert (statistik.ts).
    await u.click(within(datenschutz).getByLabelText(/Nicht mitzählen/));
    expect(localStorage.getItem("skipgc")).toBe("t");
  });

  it("trägt den Anzeigemodus im Kopf und in der Fußzeile — beide schalten gemeinsam", async () => {
    const u = userEvent.setup();
    render(<App />);
    const gruppen = screen.getAllByRole("group", { name: "Anzeigemodus" });
    expect(gruppen).toHaveLength(2);
    await u.click(within(gruppen[1]!).getByRole("button", { name: "Nacht" }));
    expect(within(gruppen[0]!).getByRole("button", { name: "Nacht" }).getAttribute("aria-pressed")).toBe("true");
    expect(document.documentElement.classList.contains("nacht-modus")).toBe(true);
  });
});
