/**
 * Statusleiste der Kopplung (neu im Meldekopf, ADR-009): Sie sagt in jedem
 * Zustand, ob das andere Gerät den Stand hat und was zu tun ist.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { EinsatzArt, einsatzAnlegen } from "@bos/meldekopf/einsaetze";
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

  it("nennt gekoppelt die Sammlung und die Zeit des letzten Abgleichs", () => {
    render(<Kopplung />);
    act(() => kopplungsZustandSetzen({ phase: "verbunden", einsatzId: id, abgleichAm: new Date(2026, 10, 24, 14, 32, 5).getTime() }));
    const leiste = screen.getByRole("status");
    expect(leiste.textContent).toContain("Gekoppelt mit zweitem Gerät");
    expect(leiste.textContent).toContain("„Hochwasser“");
    expect(leiste.textContent).toContain("abgeglichen 14:32:05");
    expect(screen.getByRole("button", { name: "Trennen" })).toBeTruthy();
    expect(kopplungAktiv()).toBe(true);
  });

  it("sagt bei stockender Verbindung, dass weiter gespeichert wird", () => {
    render(<Kopplung />);
    act(() => kopplungsZustandSetzen({ phase: "unterbrochen", einsatzId: id, seit: new Date(2026, 10, 24, 14, 35).getTime() }));
    expect(screen.getByRole("status").textContent).toMatch(/stockt seit 14:35\. Dieses Gerät speichert weiter/);
  });

  it("meldet die Trennung als Warnung, mit dem Weg zurück", () => {
    render(<Kopplung />);
    act(() => kopplungsZustandSetzen({ phase: "getrennt", einsatzId: id, seit: new Date(2026, 10, 24, 14, 35).getTime(), abgleichAm: new Date(2026, 10, 24, 14, 32).getTime() }));
    const leiste = screen.getByRole("alert");
    expect(leiste.textContent).toContain("Kopplung getrennt seit 14:35, zuletzt abgeglichen 14:32.");
    expect(leiste.textContent).toContain(GETRENNT_SATZ);
    expect(screen.getByRole("button", { name: "Neu koppeln…" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Schließen" })).toBeTruthy();
  });

  it("sagt bei einer gerissenen Verbindung, dass sie von selbst wiederkommt", () => {
    render(<Kopplung />);
    act(() => kopplungsZustandSetzen({ phase: "unterbrochen", wartet: true, einsatzId: id, seit: new Date(2026, 10, 24, 14, 35).getTime() }));
    expect(screen.getByRole("status").textContent).toMatch(/stockt seit 14:35\. Sie wird von selbst wiederhergestellt/);
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

describe("Kopplungs-Code erkennen", () => {
  it("erkennt die Marke, auch mit Leerraum und in Kleinbuchstaben", () => {
    expect(istKopplungsCode("MKK1.ABC")).toBe(true);
    expect(istKopplungsCode("  mkk1.abc")).toBe(true);
    expect(istKopplungsCode("https://erfassungsbogen.app/#B.ABC")).toBe(false);
    expect(istKopplungsCode("EEBS.1.2.ABC")).toBe(false);
  });
});
