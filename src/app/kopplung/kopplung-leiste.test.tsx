/**
 * Statusleiste der Kopplung (neu im Meldekopf, ADR-009): Sie sagt in jedem
 * Zustand, ob das andere Gerät den Stand hat und was zu tun ist.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { OrganisationsTyp } from "@bos/eeb-format/model";
import { EinsatzArt, einsatzAnlegen, meldungHinzufuegen } from "@bos/meldekopf/einsaetze";
import { neuerBogen } from "../hilfen";
import { SAMMLER_ROLLE_SATZ } from "./sammler-ansicht";
import { GETRENNT_SATZ, Kopplung, WARTET_SATZ } from "./kopplung-leiste";
import { istKopplungsCode, kopplungAktiv, kopplungsZustandSetzen, kopplungsZustandZuruecksetzen } from "./zustand";

describe("Kopplungsleiste", () => {
  let id: string;
  beforeEach(() => {
    localStorage.clear();
    id = einsatzAnlegen("Hochwasser", EinsatzArt.EINSATZ).id;
  });
  afterEach(() => act(() => kopplungsZustandZuruecksetzen()));

  it("zeigt ohne Kopplung nichts", () => {
    const { container } = render(<Kopplung />);
    expect(container.textContent).toBe("");
    expect(kopplungAktiv()).toBe(false);
  });

  it("zeigt an der Zentrale die Lampe, die Sammlung und die Zeit des letzten Eingangs", () => {
    const { container } = render(<Kopplung />);
    act(() => kopplungsZustandSetzen({ phase: "verbunden", rolle: "zentrale", einsatzId: id, abgleichAm: new Date(2026, 10, 24, 14, 32, 5).getTime() }));
    const leiste = screen.getByRole("status");
    expect(leiste.textContent).toContain("Verbindung aktiv");
    expect(leiste.textContent).toContain("zweites Gerät sammelt");
    expect(leiste.textContent).toContain("„Hochwasser“");
    expect(leiste.textContent).toContain("letzter Eingang 14:32:05");
    expect(container.querySelector(".kopplung-lampe")?.getAttribute("data-phase")).toBe("verbunden");
    expect(screen.getByRole("button", { name: "Trennen" })).toBeTruthy();
    expect(kopplungAktiv()).toBe(true);
  });

  it("sagt bei stockender Verbindung, dass weiter gespeichert wird", () => {
    const { container } = render(<Kopplung />);
    act(() => kopplungsZustandSetzen({ phase: "unterbrochen", einsatzId: id, seit: new Date(2026, 10, 24, 14, 35).getTime() }));
    expect(screen.getByRole("status").textContent).toMatch(/Verbindung unterbrochen seit 14:35\. Dieses Gerät speichert weiter/);
    expect(container.querySelector(".kopplung-lampe")?.getAttribute("data-phase")).toBe("unterbrochen");
  });

  it("meldet die Trennung als Warnung, mit dem Weg zurück", () => {
    const { container } = render(<Kopplung />);
    act(() => kopplungsZustandSetzen({ phase: "getrennt", rolle: "zentrale", einsatzId: id, seit: new Date(2026, 10, 24, 14, 35).getTime(), abgleichAm: new Date(2026, 10, 24, 14, 32).getTime() }));
    const leiste = screen.getByRole("alert");
    expect(leiste.textContent).toContain("Verbindung getrennt seit 14:35, letzter Eingang 14:32.");
    expect(leiste.textContent).toContain(GETRENNT_SATZ);
    expect(container.querySelector(".kopplung-lampe")?.getAttribute("data-phase")).toBe("getrennt");
    expect(screen.getByRole("button", { name: "Neu koppeln…" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Schließen" })).toBeTruthy();
  });

  it("sagt bei einer gerissenen Verbindung, dass sie von selbst wiederkommt", () => {
    render(<Kopplung />);
    act(() => kopplungsZustandSetzen({ phase: "unterbrochen", wartet: true, einsatzId: id, seit: new Date(2026, 10, 24, 14, 35).getTime() }));
    expect(screen.getByRole("status").textContent).toMatch(/unterbrochen seit 14:35\. Sie wird von selbst wiederhergestellt/);
    act(() => kopplungsZustandSetzen({ phase: "getrennt", wartet: true }));
    expect(screen.getByRole("alert").textContent).toContain(WARTET_SATZ);
    expect(screen.getByRole("button", { name: "Neu koppeln…" })).toBeTruthy();
  });

  it("nennt den Grund, wenn die Kopplung von selbst endete, und bietet ohne Sammlung kein Neu-Koppeln an", () => {
    render(<Kopplung />);
    act(() => kopplungsZustandSetzen({ phase: "getrennt", einsatzId: "gibt-es-nicht", seit: 0, hinweis: "Die Sammlung gibt es auf diesem Gerät nicht mehr. Die Kopplung ist beendet." }));
    expect(screen.getByRole("alert").textContent).toContain("Die Sammlung gibt es auf diesem Gerät nicht mehr.");
    expect(screen.queryByRole("button", { name: "Neu koppeln…" })).toBeNull();
  });
});

describe("Sammler-Ansicht", () => {
  let id: string;
  const wege = { onScannen: vi.fn(), onManuell: vi.fn() };
  beforeEach(() => {
    localStorage.clear();
    const dialog = HTMLDialogElement.prototype as { showModal?: () => void; close?: () => void };
    dialog.showModal ??= function (this: HTMLDialogElement) { this.setAttribute("open", ""); };
    dialog.close ??= function (this: HTMLDialogElement) { this.removeAttribute("open"); };
    id = einsatzAnlegen("Hochwasser", EinsatzArt.EINSATZ).id;
    meldungHinzufuegen(id, { ...neuerBogen(), einheit: { organisation: OrganisationsTyp.DLRG, einheitsTyp: { freitext: "Einheit" }, hierarchie: [{ bezeichnung: { freitext: "Ort" }, name: "Wardenburg" }] } }, { quelle: "scan" });
  });
  afterEach(() => act(() => kopplungsZustandZuruecksetzen()));

  it("zeigt dem zweiten Gerät statt der Lage nur Verbindung, Aufnahme und das selbst Aufgenommene", async () => {
    render(<Kopplung sammler={wege} />);
    act(() => kopplungsZustandSetzen({ phase: "verbunden", rolle: "sammler", einsatzId: id, offen: 1 }));
    const bild = await screen.findByRole("dialog", { hidden: true });
    expect(bild.textContent).toContain("Verbindung aktiv");
    expect(bild.textContent).toContain("1 Meldung wird übertragen");
    expect(bild.textContent).toContain(SAMMLER_ROLLE_SATZ);
    expect(bild.textContent).toContain("Von diesem Gerät aufgenommen (1)");
    expect(bild.textContent).toContain("Wardenburg");
    // Ohne Quittung der Zentrale gilt nichts als übertragen.
    expect(bild.querySelector("li")?.getAttribute("data-uebertragen")).toBe("nein");
    expect(bild.textContent).toContain("… wartet");
    // Die Leiste der Zentrale gibt es hier nicht doppelt.
    expect(document.querySelector(".kopplung-leiste")).toBeNull();
    fireEvent.click(within(bild).getByRole("button", { name: /Bogen scannen/, hidden: true }));
    expect(wege.onScannen).toHaveBeenCalledWith(id);
    fireEvent.click(within(bild).getByRole("button", { name: /Einheit von Hand erfassen/, hidden: true }));
    expect(wege.onManuell).toHaveBeenCalledWith(id);
  });

  it("sagt getrennt, dass weiter aufgenommen werden kann und wie viel wartet", async () => {
    render(<Kopplung sammler={wege} />);
    act(() => kopplungsZustandSetzen({ phase: "getrennt", rolle: "sammler", wartet: true, einsatzId: id, offen: 2, seit: new Date(2026, 10, 24, 14, 35).getTime() }));
    const bild = await screen.findByRole("dialog", { hidden: true });
    expect(within(bild).getByRole("alert", { hidden: true }).textContent).toContain("Verbindung getrennt seit 14:35");
    expect(bild.textContent).toContain("2 Meldungen warten auf die Übertragung.");
    expect(bild.textContent).toContain(WARTET_SATZ);
    expect(within(bild).getByRole("button", { name: /Bogen scannen/, hidden: true })).toBeTruthy();
  });

  it("zeigt an der Zentrale die Leiste, auch wenn die App die Sammler-Wege mitgibt", () => {
    render(<Kopplung sammler={wege} />);
    act(() => kopplungsZustandSetzen({ phase: "verbunden", rolle: "zentrale", einsatzId: id }));
    expect(screen.getByRole("status").textContent).toContain("zweites Gerät sammelt");
    expect(screen.queryByRole("dialog", { hidden: true })).toBeNull();
  });
});

describe("Kopplungs-Code erkennen", () => {
  it("erkennt die Marke, auch mit Leerraum und in Kleinbuchstaben", () => {
    expect(istKopplungsCode("MKK1.ABC")).toBe(true);
    expect(istKopplungsCode("  mkk1.abc")).toBe(true);
    expect(istKopplungsCode("https://erfassungsbogen.app/#B.ABC")).toBe(false);
    expect(istKopplungsCode("EEBS.1.2.ABC")).toBe(false);
  });
});
