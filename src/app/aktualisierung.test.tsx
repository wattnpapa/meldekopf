/**
 * Neu im Meldekopf: Suche nach neuen Fassungen und Hinweis darauf, im Hauptfenster und im Fenster des Lagemonitors
 * (aktualisierung.tsx, lagemonitor-ui.tsx). Der Service Worker ist nachgebaut: Ein Container, dessen Steuerung sich von
 * Hand wechseln lässt, und eine Registrierung, deren Abfragen gezählt werden.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { EinsatzArt, einsatzAnlegen, meldungHinzufuegen } from "@bos/meldekopf/einsaetze";
import { neuerBogen } from "./hilfen";

vi.mock("./nativ", () => ({ istNativ: () => false }));

interface Optionen {
  onNeedRefresh?: () => void;
  onNeedReload?: () => void;
  onRegisteredSW?: (adresse: string, registrierung: ServiceWorkerRegistration | undefined) => void;
}
const pwa = vi.hoisted(() => ({ optionen: null as Optionen | null, updateSW: null as unknown as ReturnType<typeof vi.fn> }));
vi.mock("virtual:pwa-register", () => ({
  registerSW: (o: Optionen) => {
    pwa.optionen = o;
    return pwa.updateSW;
  },
}));

const { WebUpdateBanner, SUCHE_MS, SUCHE_NACH_PAUSE_MS } = await import("./aktualisierung");
const { Lagemonitor } = await import("./lagemonitor-ui");

/** Service-Worker-Container, dessen Steuerung sich von Hand wechseln lässt. */
function container(gesteuert: boolean) {
  const ziel = new EventTarget();
  const c = Object.assign(ziel, { controller: (gesteuert ? { name: "alt" } : null) as object | null });
  Object.defineProperty(navigator, "serviceWorker", { value: c, configurable: true });
  return {
    c,
    /** Eine andere Fassung übernimmt die Steuerung (aus diesem oder einem anderen Fenster aktiviert). */
    wechseln() {
      c.controller = { name: "neu" };
      act(() => void c.dispatchEvent(new Event("controllerchange")));
    },
  };
}

let neuladen: ReturnType<typeof vi.fn>;
const echteLocation = window.location;

/** Bis das virtuelle Modul geladen und registriert ist (dynamischer Import im Effekt). */
async function registriert(): Promise<Optionen> {
  await act(async () => {
    for (let i = 0; i < 5 && !pwa.optionen; i++) await Promise.resolve();
  });
  await vi.waitFor(() => expect(pwa.optionen).not.toBeNull());
  return pwa.optionen!;
}

beforeEach(() => {
  localStorage.clear();
  pwa.optionen = null;
  pwa.updateSW = vi.fn(async () => {});
  neuladen = vi.fn();
  Object.defineProperty(window, "location", { value: { ...echteLocation, protocol: "https:", reload: neuladen }, configurable: true });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  Reflect.deleteProperty(navigator, "serviceWorker");
  Object.defineProperty(window, "location", { value: echteLocation, configurable: true });
  vi.unstubAllGlobals();
});

describe("Hauptfenster", () => {
  it("zeigt den Hinweis, wenn eine neue Fassung wartet, und aktiviert sie erst auf „Neu laden“", async () => {
    const sw = container(true);
    render(<WebUpdateBanner />);
    const o = await registriert();
    expect(screen.queryByText("Neue Version verfügbar.")).toBeNull();
    act(() => o.onNeedRefresh!());
    expect(screen.getByText("Neue Version verfügbar.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Neu laden" }));
    expect(pwa.updateSW).toHaveBeenCalledWith(true);
    expect(neuladen).not.toHaveBeenCalled();
    // Die neue Fassung übernimmt: Dieses Fenster hat sie angefordert und lädt neu.
    sw.wechseln();
    expect(neuladen).toHaveBeenCalled();
  });

  it("lädt nicht von selbst neu, wenn die neue Fassung in einem anderen Fenster aktiv wird, sondern zeigt den Hinweis", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"] });
    const sw = container(true);
    render(<WebUpdateBanner />);
    const o = await registriert();
    act(() => o.onNeedRefresh!());
    fireEvent.click(screen.getByRole("button", { name: "Später" }));
    expect(screen.queryByText("Neue Version verfügbar.")).toBeNull();
    // Eine laufende Eingabe bleibt stehen; die Bibliothek lüde hier von selbst neu.
    o.onNeedReload?.();
    sw.wechseln();
    expect(neuladen).not.toHaveBeenCalled();
    expect(screen.getByText("Neue Version verfügbar.")).toBeTruthy();
    // „Neu laden" lädt jetzt sofort neu, ohne erst etwas zu aktivieren: Die Fassung ist schon aktiv.
    fireEvent.click(screen.getByRole("button", { name: "Neu laden" }));
    expect(neuladen).toHaveBeenCalled();
    expect(pwa.updateSW).not.toHaveBeenCalled();
  });

  it("zeigt bei der ersten Installation keinen Hinweis", async () => {
    const sw = container(false);
    render(<WebUpdateBanner />);
    await registriert();
    sw.wechseln();
    expect(screen.queryByText("Neue Version verfügbar.")).toBeNull();
    expect(neuladen).not.toHaveBeenCalled();
  });

  it("sucht stündlich, nach einer längeren Pause und bei wiederkehrendem Netz nach einer neuen Fassung", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"] });
    container(true);
    render(<WebUpdateBanner />);
    const o = await registriert();
    const update = vi.fn(async () => {});
    act(() => o.onRegisteredSW!("/sw.js", { update } as unknown as ServiceWorkerRegistration));
    expect(update).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(SUCHE_MS));
    expect(update).toHaveBeenCalledTimes(1);
    // Kurz weg und wieder da: noch keine neue Frage.
    act(() => void vi.advanceTimersByTime(60_000));
    act(() => void document.dispatchEvent(new Event("visibilitychange")));
    expect(update).toHaveBeenCalledTimes(1);
    // Nach längerer Pause gleich nachfragen, nicht erst zur vollen Stunde.
    act(() => void vi.advanceTimersByTime(SUCHE_NACH_PAUSE_MS));
    act(() => void document.dispatchEvent(new Event("visibilitychange")));
    expect(update).toHaveBeenCalledTimes(2);
    act(() => void window.dispatchEvent(new Event("online")));
    expect(update).toHaveBeenCalledTimes(3);
    // Ohne Netz scheitert die Frage still.
    update.mockRejectedValueOnce(new Error("offline"));
    act(() => void vi.advanceTimersByTime(SUCHE_MS));
    expect(update).toHaveBeenCalledTimes(4);
    cleanup();
    act(() => void vi.advanceTimersByTime(SUCHE_MS * 2));
    expect(update).toHaveBeenCalledTimes(4);
  });
});

describe("Fenster des Lagemonitors", () => {
  function monitor() {
    const e = einsatzAnlegen("Hochwasser Süd", EinsatzArt.EINSATZ);
    const b = neuerBogen();
    b.einheit.hierarchie[0]!.name = "OV Musterstadt";
    meldungHinzufuegen(e.id, b);
    return render(<Lagemonitor einsatzId={e.id} />);
  }

  it("folgt einer neuen Fassung von selbst, sobald sie aktiv ist", async () => {
    const sw = container(true);
    monitor();
    await registriert();
    sw.wechseln();
    expect(neuladen).toHaveBeenCalled();
  });

  it("verweist bei offenem Hauptfenster dorthin und aktiviert nichts selbst", async () => {
    container(true);
    vi.stubGlobal("opener", { closed: false });
    monitor();
    const o = await registriert();
    act(() => o.onNeedRefresh!());
    const hinweis = screen.getByRole("status", { name: "" });
    expect(document.querySelector(".lm-neue-version")!.textContent).toBe("Neue Version: im Hauptfenster „Neu laden“, dieses Fenster folgt von selbst.");
    expect(hinweis).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Neu laden" })).toBeNull();
    expect(pwa.updateSW).not.toHaveBeenCalled();
  });

  it("aktualisiert allein (ohne Hauptfenster) auf „Neu laden“", async () => {
    container(true);
    vi.stubGlobal("opener", null);
    monitor();
    const o = await registriert();
    act(() => o.onNeedRefresh!());
    expect(document.querySelector(".lm-neue-version")!.textContent).toContain("Neue Version verfügbar.");
    fireEvent.click(screen.getByRole("button", { name: "Neu laden" }));
    expect(pwa.updateSW).toHaveBeenCalledWith(true);
    expect(document.querySelector(".lm-neue-version")!.textContent).toContain("Die neue Version wird geladen …");
  });
});
