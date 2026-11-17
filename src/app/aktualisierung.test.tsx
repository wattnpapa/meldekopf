/**
 * Neu im Meldekopf: Suche nach neuen Fassungen, Neuladen jedes Fensters, wenn eine neue Fassung übernimmt, und der
 * Lagemonitor, der ihr folgt (aktualisierung.tsx, lagemonitor-ui.tsx). Der Service Worker ist nachgebaut: Ein
 * Container, dessen Steuerung sich von Hand wechseln lässt, Arbeiter mit Zustand und ein Vorrat (Cache Storage),
 * dessen Inhalt der Test bestimmt.
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

const {
  WebUpdateBanner,
  SUCHE_MS,
  SUCHE_NACH_PAUSE_MS,
  VERALTET_SCHLUESSEL,
  NEU_GESTARTET_SCHLUESSEL,
  aktualisierungStarten,
  aktualisierungBeenden,
  fassungVeraltet,
  fassungsQuelle,
} = await import("./aktualisierung");
const { Lagemonitor, NACH_NEULADEN_SCHLUESSEL } = await import("./lagemonitor-ui");

type Arbeiter = ServiceWorker & { name: string; state: ServiceWorkerState };
/** Ein Service Worker, dessen Zustand sich von Hand weiterschalten lässt. */
function arbeiter(name: string, state: ServiceWorkerState = "activated"): Arbeiter {
  return Object.assign(new EventTarget(), { name, state }) as unknown as Arbeiter;
}
function weiter(sw: Arbeiter, state: ServiceWorkerState) {
  sw.state = state;
  sw.dispatchEvent(new Event("statechange"));
}

/** Service-Worker-Container, dessen Steuerung sich von Hand wechseln lässt. */
function container(gesteuert: boolean) {
  const c = Object.assign(new EventTarget(), { controller: (gesteuert ? arbeiter("alt") : null) as Arbeiter | null });
  Object.defineProperty(navigator, "serviceWorker", { value: c, configurable: true });
  return {
    c,
    /** Eine andere Fassung übernimmt die Steuerung (aus diesem oder einem anderen Fenster aktiviert). */
    wechseln(neu: Arbeiter = arbeiter("neu")) {
      c.controller = neu;
      act(() => void c.dispatchEvent(new Event("controllerchange")));
    },
  };
}

const EIGEN = "https://meldekopf.test/assets/index-Alt12345.js";
/** Vorrat (Workbox-Precache) mit diesen Adressen; `null`: gar keiner. */
function vorrat(adressen: string[] | null) {
  vorraete(adressen ? { "workbox-precache-v2-https://meldekopf.test/": adressen } : {});
}
/** Mehrere Vorräte je Name, in dieser Reihenfolge angelegt (wie caches.keys()), dazu der Laufzeit-Cache der App. */
function vorraete(je: Record<string, string[]>) {
  vi.stubGlobal("caches", {
    keys: async () => [...Object.keys(je), "eeb-zusatz"],
    open: async (name: string) => ({ match: async (u: string) => ((je[name] ?? []).includes(u) ? {} : undefined) }),
  });
}

/** Registrierung mit gezählten Abfragen und von Hand setzbarem `installing`/`waiting`; aktiv ist die bisherige Fassung. */
function registrierung() {
  const r = Object.assign(new EventTarget(), {
    installing: null as Arbeiter | null,
    waiting: null as Arbeiter | null,
    active: arbeiter("alt") as Arbeiter | null,
    update: vi.fn(async () => {}),
  });
  return r;
}

let neuladen: ReturnType<typeof vi.fn>;
const echteLocation = window.location;

/** Bis das virtuelle Modul geladen und registriert ist (dynamischer Import). */
async function registriert(): Promise<Optionen> {
  await act(async () => {
    for (let i = 0; i < 5 && !pwa.optionen; i++) await Promise.resolve();
  });
  await vi.waitFor(() => expect(pwa.optionen).not.toBeNull());
  return pwa.optionen!;
}
/** Wartende Versprechen (Vorrat, Zustand) abarbeiten, ohne Uhr. */
async function ruhe() {
  await act(async () => {
    for (let i = 0; i < 30; i++) await Promise.resolve();
  });
}
function sichtbar(zustand: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { value: zustand, configurable: true });
  act(() => void document.dispatchEvent(new Event("visibilitychange")));
}

beforeEach(() => {
  // Nachgebaute Uhr in allen Tests: Der Rückfall von „Neu laden“ (1,5 s) feuerte sonst nach dem Test ins echte Fenster.
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval", "Date"] });
  localStorage.clear();
  sessionStorage.clear();
  pwa.optionen = null;
  pwa.updateSW = vi.fn(async () => {});
  neuladen = vi.fn();
  fassungsQuelle.adresse = EIGEN;
  Object.defineProperty(window, "location", { value: { ...echteLocation, protocol: "https:", reload: neuladen }, configurable: true });
});

afterEach(() => {
  cleanup();
  aktualisierungBeenden();
  vi.clearAllTimers();
  vi.useRealTimers();
  Reflect.deleteProperty(navigator, "serviceWorker");
  Reflect.deleteProperty(document, "visibilityState");
  Object.defineProperty(window, "location", { value: echteLocation, configurable: true });
  vi.unstubAllGlobals();
});

describe("Prüfung „veraltet“", () => {
  it("findet den eigenen Baustein im Vorrat und gilt im Zweifel als aktuell", async () => {
    vorrat([EIGEN]);
    expect(await fassungVeraltet(EIGEN)).toBe(false);
    vorrat(["https://meldekopf.test/assets/index-Neu67890.js"]);
    expect(await fassungVeraltet(EIGEN)).toBe(true);
    // Kein Precache, kein Baustein aus dem Bau (Entwicklungsserver, Tests), kein Cache-Zugriff: aktuell.
    vorrat(null);
    expect(await fassungVeraltet(EIGEN)).toBe(false);
    vorrat([]);
    expect(await fassungVeraltet("https://meldekopf.test/src/app/aktualisierung.tsx")).toBe(false);
    vi.stubGlobal("caches", { keys: async () => { throw new Error("gesperrt"); } });
    expect(await fassungVeraltet(EIGEN)).toBe(false);
  });

  it("sucht in allen Vorräten der Herkunft, nicht nur im ersten", async () => {
    // Eine zweite App unter einem anderen Pfad derselben Herkunft hat ihren Vorrat zuerst angelegt (Gegenprüfung 2026-11-16).
    const fremd = "workbox-precache-v2-https://meldekopf.test/andere/";
    const eigen = "workbox-precache-v2-https://meldekopf.test/";
    vorraete({ [fremd]: ["https://meldekopf.test/andere/assets/index-Fremd111.js"], [eigen]: [EIGEN] });
    expect(await fassungVeraltet(EIGEN)).toBe(false);
    vorraete({ [fremd]: ["https://meldekopf.test/andere/assets/index-Fremd111.js"], [eigen]: ["https://meldekopf.test/assets/index-Neu67890.js"] });
    expect(await fassungVeraltet(EIGEN)).toBe(true);
  });
});

describe("Hauptfenster", () => {
  it("zeigt den Hinweis, wenn eine neue Fassung wartet, aktiviert sie erst auf „Neu laden“ und lädt dann neu", async () => {
    const sw = container(true);
    render(<WebUpdateBanner />);
    const o = await registriert();
    expect(screen.queryByText("Neue Version verfügbar.")).toBeNull();
    act(() => o.onNeedRefresh!());
    expect(screen.getByText("Neue Version verfügbar.")).toBeTruthy();
    // Wer tippt, erfährt, dass die anderen Fenster mitstarten.
    expect(screen.getByText("„Neu laden“ startet alle Fenster dieser App neu.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Neu laden" }));
    expect(pwa.updateSW).toHaveBeenCalledWith(true);
    expect(neuladen).not.toHaveBeenCalled();
    expect(screen.getByText("Die neue Version wird geladen …")).toBeTruthy();
    sw.wechseln();
    expect(neuladen).toHaveBeenCalledTimes(1);
    // Selbst getippt: Nach dem Neuladen braucht es keine Erklärung.
    expect(sessionStorage.getItem(NEU_GESTARTET_SCHLUESSEL)).toBeNull();
  });

  it("lädt neu, sobald eine neue Fassung in einem anderen Fenster aktiv wird, auch nach „Später“ und ohne Hinweis", async () => {
    // Weiterlaufen ginge nicht: Die Bausteine der alten Fassung sind weg, die nächste Ansicht stürzte mit „ohne Netz“ ab.
    const sw = container(true);
    render(<WebUpdateBanner />);
    const o = await registriert();
    act(() => o.onNeedRefresh!());
    fireEvent.click(screen.getByRole("button", { name: "Später" }));
    sw.wechseln();
    expect(neuladen).toHaveBeenCalledTimes(1);
    expect(pwa.updateSW).not.toHaveBeenCalled();

    cleanup();
    aktualisierungBeenden();
    neuladen.mockClear();
    const ohne = container(true);
    render(<WebUpdateBanner />);
    await registriert();
    ohne.wechseln();
    expect(neuladen).toHaveBeenCalledTimes(1);
  });

  it("erklärt nach dem Neustart, dass das Fenster von selbst neu gestartet ist", async () => {
    // Ein Kollege tippt im anderen Fenster „Neu laden“; hier war ein Dialog offen (Gegenprüfung 2026-11-16).
    const sw = container(true);
    render(<WebUpdateBanner />);
    await registriert();
    sw.wechseln();
    expect(neuladen).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(NEU_GESTARTET_SCHLUESSEL)).toBe("1");
    // Das neu geladene Fenster.
    cleanup();
    aktualisierungBeenden();
    container(true);
    render(<WebUpdateBanner />);
    await ruhe();
    expect(screen.getByText(/Dieses Fenster ist von selbst neu gestartet\. Eingaben in einem offenen Dialog wurden nicht übernommen\./)).toBeTruthy();
    expect(sessionStorage.getItem(NEU_GESTARTET_SCHLUESSEL)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Verstanden" }));
    expect(screen.queryByText(/von selbst neu gestartet/)).toBeNull();
  });

  it("überlässt das Neuladen dem eigenen Wechsel der Steuerung, nicht der Bibliothek", async () => {
    // Ohne `onNeedReload` lüde die Bibliothek beim Wechsel ein zweites Mal neu (register.js: sonst location.reload()).
    container(true);
    render(<WebUpdateBanner />);
    const o = await registriert();
    expect(typeof o.onNeedReload).toBe("function");
    o.onNeedReload!();
    expect(neuladen).not.toHaveBeenCalled();
  });

  it("zeigt den Hinweis nach „Später“ mit der nächsten Suche wieder, solange die neue Fassung wartet", async () => {
    container(true);
    render(<WebUpdateBanner />);
    const o = await registriert();
    const r = registrierung();
    r.waiting = arbeiter("neu", "installed");
    act(() => o.onRegisteredSW!("/sw.js", r as unknown as ServiceWorkerRegistration));
    act(() => o.onNeedRefresh!());
    fireEvent.click(screen.getByRole("button", { name: "Später" }));
    expect(screen.queryByText("Neue Version verfügbar.")).toBeNull();
    await act(async () => {
      vi.advanceTimersByTime(SUCHE_MS);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText("Neue Version verfügbar.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Neu laden" }));
    expect(pwa.updateSW).toHaveBeenCalledWith(true);
  });

  it("meldet eine wartende Fassung auch in einem hart neu geladenen, ungesteuerten Fenster nach „Später“ wieder", async () => {
    // Strg+Umschalt+R: Die Seite ist ungesteuert, die Registrierung hat aber eine aktive und eine wartende Fassung.
    container(false);
    render(<WebUpdateBanner />);
    const o = await registriert();
    const r = registrierung();
    r.waiting = arbeiter("neu", "installed");
    act(() => o.onRegisteredSW!("/sw.js", r as unknown as ServiceWorkerRegistration));
    act(() => o.onNeedRefresh!());
    fireEvent.click(screen.getByRole("button", { name: "Später" }));
    await act(async () => {
      vi.advanceTimersByTime(SUCHE_MS);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getByText("Neue Version verfügbar.")).toBeTruthy();
  });

  it("meldet bei der ersten Installation nichts, auch wenn die neue Fassung kurz wartet", async () => {
    container(false);
    render(<WebUpdateBanner />);
    const o = await registriert();
    const r = registrierung();
    r.active = null;
    act(() => o.onRegisteredSW!("/sw.js", r as unknown as ServiceWorkerRegistration));
    const erste = arbeiter("erste", "installing");
    r.installing = erste;
    act(() => void r.dispatchEvent(new Event("updatefound")));
    r.installing = null;
    r.waiting = erste;
    act(() => weiter(erste, "installed"));
    expect(screen.queryByText("Neue Version verfügbar.")).toBeNull();
  });

  it("meldet eine Fassung, deren Installation erst nach der Suche fertig wird", async () => {
    // Nach einer abgebrochenen Installation hört die Bibliothek nicht mehr auf neue; `update()` ist früher erfüllt.
    container(true);
    render(<WebUpdateBanner />);
    const o = await registriert();
    const r = registrierung();
    act(() => o.onRegisteredSW!("/sw.js", r as unknown as ServiceWorkerRegistration));
    const neu = arbeiter("neu", "installing");
    r.installing = neu;
    act(() => void r.dispatchEvent(new Event("updatefound")));
    expect(screen.queryByText("Neue Version verfügbar.")).toBeNull();
    r.installing = null;
    r.waiting = neu;
    act(() => weiter(neu, "installed"));
    expect(screen.getByText("Neue Version verfügbar.")).toBeTruthy();
  });

  it("zeigt bei der ersten Installation keinen Hinweis und lädt nicht neu", async () => {
    vorrat([EIGEN]);
    const sw = container(false);
    render(<WebUpdateBanner />);
    await registriert();
    sw.wechseln(arbeiter("erste"));
    await ruhe();
    expect(screen.queryByText("Neue Version verfügbar.")).toBeNull();
    expect(neuladen).not.toHaveBeenCalled();
  });

  it("lädt eine an Service Worker und Vorrat vorbei geladene Seite neu, wenn die übernehmende Fassung ihre Bausteine nicht hat", async () => {
    // Strg+Umschalt+R: Die Seite startet ungesteuert. Übernimmt danach eine neue Fassung, ist sie veraltet.
    vorrat(["https://meldekopf.test/assets/index-Neu67890.js"]);
    const sw = container(false);
    render(<WebUpdateBanner />);
    await registriert();
    const neu = arbeiter("neu", "activating");
    sw.wechseln(neu);
    await ruhe();
    // Erst wenn sie aktiv ist, hat sie den Vorrat aufgeräumt.
    expect(neuladen).not.toHaveBeenCalled();
    act(() => weiter(neu, "activated"));
    await ruhe();
    expect(neuladen).toHaveBeenCalledTimes(1);
  });

  it("lädt beim Start neu, wenn eine neue Fassung schon übernommen hat, aber nur einmal je Fassung", async () => {
    vorrat(["https://meldekopf.test/assets/index-Neu67890.js"]);
    container(true);
    render(<WebUpdateBanner />);
    await ruhe();
    expect(neuladen).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(VERALTET_SCHLUESSEL)).toBe(EIGEN);
    // Dieselbe Fassung noch einmal (die Prüfung irrte, etwa ein beschädigter Vorrat): nicht wieder neu laden und keine
    // neue Version melden, die „Neu laden“ nie herbeiholt.
    sessionStorage.removeItem(NEU_GESTARTET_SCHLUESSEL);
    cleanup();
    aktualisierungBeenden();
    render(<WebUpdateBanner />);
    await ruhe();
    expect(neuladen).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Neue Version verfügbar.")).toBeNull();
    expect(screen.queryByRole("button", { name: "Neu laden" })).toBeNull();
  });

  it("lädt beim Start nicht neu, solange die eigene Fassung im Vorrat liegt", async () => {
    vorrat([EIGEN]);
    container(true);
    render(<WebUpdateBanner />);
    await ruhe();
    expect(neuladen).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(VERALTET_SCHLUESSEL)).toBeNull();
  });

  it("sucht stündlich, nach mindestens zehn Minuten im Hintergrund und bei wiederkehrendem Netz", async () => {
    container(true);
    render(<WebUpdateBanner />);
    const o = await registriert();
    const r = registrierung();
    act(() => o.onRegisteredSW!("/sw.js", r as unknown as ServiceWorkerRegistration));
    expect(r.update).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(SUCHE_MS));
    expect(r.update).toHaveBeenCalledTimes(1);
    // Lange sichtbar, dann kurz weg und wieder da: Das ist keine Pause, auch wenn die letzte Suche lange her ist.
    act(() => void vi.advanceTimersByTime(SUCHE_NACH_PAUSE_MS + 5_000));
    sichtbar("hidden");
    act(() => void vi.advanceTimersByTime(1_000));
    sichtbar("visible");
    expect(r.update).toHaveBeenCalledTimes(1);
    // Zehn Minuten im Hintergrund: beim Zurückkommen gleich nachfragen, nicht erst zur vollen Stunde.
    sichtbar("hidden");
    act(() => void vi.advanceTimersByTime(SUCHE_NACH_PAUSE_MS));
    sichtbar("visible");
    expect(r.update).toHaveBeenCalledTimes(2);
    act(() => void window.dispatchEvent(new Event("online")));
    expect(r.update).toHaveBeenCalledTimes(3);
    // Ohne Netz scheitert die Frage still.
    r.update.mockRejectedValueOnce(new Error("offline"));
    await act(async () => {
      vi.advanceTimersByTime(SUCHE_MS - SUCHE_NACH_PAUSE_MS - 6_000);
      await Promise.resolve();
    });
    expect(r.update).toHaveBeenCalledTimes(4);
    expect(screen.queryByText("Neue Version verfügbar.")).toBeNull();
    aktualisierungBeenden();
    act(() => void vi.advanceTimersByTime(SUCHE_MS * 2));
    act(() => void window.dispatchEvent(new Event("online")));
    expect(r.update).toHaveBeenCalledTimes(4);
  });

  it("startet je Fenster nur einmal, auch wenn der Hinweis mit der Ansicht neu eingehängt wird", async () => {
    container(true);
    const { unmount } = render(<WebUpdateBanner />);
    const o = await registriert();
    act(() => o.onNeedRefresh!());
    fireEvent.click(screen.getByRole("button", { name: "Später" }));
    unmount();
    pwa.optionen = null;
    render(<WebUpdateBanner />);
    await ruhe();
    // Keine zweite Registrierung, und „Später“ gilt weiter bis zur nächsten Suche.
    expect(pwa.optionen).toBeNull();
    expect(screen.queryByText("Neue Version verfügbar.")).toBeNull();
  });
});

describe("Fenster des Lagemonitors", () => {
  function monitor() {
    const e = einsatzAnlegen("Hochwasser Süd", EinsatzArt.EINSATZ);
    const b = neuerBogen();
    b.einheit.hierarchie[0]!.name = "OV Musterstadt";
    meldungHinzufuegen(e.id, b);
    return { e, ...render(<Lagemonitor einsatzId={e.id} />) };
  }

  it("folgt einer neuen Fassung von selbst und zeigt keinen Hinweis", async () => {
    const sw = container(true);
    aktualisierungStarten("anzeige"); // wie main.tsx
    monitor();
    await ruhe();
    expect(document.body.textContent).not.toContain("Neue Version");
    expect(screen.queryByRole("button", { name: "Neu laden" })).toBeNull();
    sw.wechseln();
    expect(neuladen).toHaveBeenCalledTimes(1);
    expect(pwa.updateSW).not.toHaveBeenCalled();
    // Keine Erklärung im Fernseher: Er zeigt nur die Lage.
    expect(sessionStorage.getItem(NEU_GESTARTET_SCHLUESSEL)).toBeNull();
  });

  it("meldet den Service Worker nicht an und sucht nicht selbst", async () => {
    // Seine Anmeldung kurz nach dem Öffnen ließ im Wettlauf mit „Neu laden“ das Hauptfenster hängen (Gegenprüfung 2026-11-16).
    container(true);
    aktualisierungStarten("anzeige");
    monitor();
    await ruhe();
    act(() => void vi.advanceTimersByTime(SUCHE_MS * 3));
    act(() => void window.dispatchEvent(new Event("online")));
    await ruhe();
    expect(pwa.optionen).toBeNull();
  });

  it("behält die Stufe „Hell“ über das selbsttätige Neuladen, aber nicht über ein eigenes", async () => {
    const sw = container(true);
    aktualisierungStarten("anzeige");
    const { e } = monitor();
    const klasse = () => document.querySelector("main.lm")!.className;
    fireEvent.click(screen.getByRole("button", { name: /^Heller/ }));
    expect(klasse()).toContain("lm-hell");
    sw.wechseln();
    expect(neuladen).toHaveBeenCalledTimes(1);
    expect(JSON.parse(sessionStorage.getItem(NACH_NEULADEN_SCHLUESSEL)!)).toEqual({ stufe: "hell", vollbild: false });
    // Das neue Bild nach dem Neuladen: wieder „Hell“, der Merker gilt einmal.
    cleanup();
    aktualisierungBeenden();
    render(<Lagemonitor einsatzId={e.id} />);
    expect(klasse()).toContain("lm-hell");
    expect(sessionStorage.getItem(NACH_NEULADEN_SCHLUESSEL)).toBeNull();
    // Ein eigenes Neuladen (F5) folgt wieder R7-L3: „Hell“ wird nicht gemerkt.
    cleanup();
    render(<Lagemonitor einsatzId={e.id} />);
    expect(klasse()).not.toContain("lm-hell");
  });

  it("holt das Vollbild nach dem selbsttätigen Neuladen mit dem ersten Klick oder Tipp ins Fenster zurück", async () => {
    sessionStorage.setItem(NACH_NEULADEN_SCHLUESSEL, JSON.stringify({ stufe: "dunkel", vollbild: true }));
    const vollbild = vi.fn(async () => {});
    Object.defineProperty(document.documentElement, "requestFullscreen", { value: vollbild, configurable: true });
    try {
      monitor();
      // Ein Knopf behält seine Aufgabe.
      fireEvent.click(screen.getByRole("button", { name: "Dunkler" }));
      expect(vollbild).not.toHaveBeenCalled();
      fireEvent.click(document.querySelector("main.lm")!);
      expect(vollbild).toHaveBeenCalledTimes(1);
      await ruhe();
      fireEvent.click(document.querySelector("main.lm")!);
      expect(vollbild).toHaveBeenCalledTimes(1);
    } finally {
      Reflect.deleteProperty(document.documentElement, "requestFullscreen");
    }
  });

  it("versucht es beim nächsten Tipp wieder, wenn der Browser das Vollbild ablehnt", async () => {
    // Per Touch zählte „pointerdown“ nicht als Geste; ein abgelehnter Versuch nahm den Zuhörer mit (Gegenprüfung 2026-11-16).
    sessionStorage.setItem(NACH_NEULADEN_SCHLUESSEL, JSON.stringify({ stufe: "dunkel", vollbild: true }));
    const vollbild = vi.fn().mockRejectedValueOnce(new Error("API can only be initiated by a user gesture")).mockResolvedValue(undefined);
    Object.defineProperty(document.documentElement, "requestFullscreen", { value: vollbild, configurable: true });
    try {
      monitor();
      fireEvent.click(document.querySelector("main.lm")!);
      await ruhe();
      fireEvent.click(document.querySelector("main.lm")!);
      await ruhe();
      expect(vollbild).toHaveBeenCalledTimes(2);
      fireEvent.click(document.querySelector("main.lm")!);
      expect(vollbild).toHaveBeenCalledTimes(2);
    } finally {
      Reflect.deleteProperty(document.documentElement, "requestFullscreen");
    }
  });

  it("merkt das Vollbild weiter, solange es nach einem Neuladen nicht zurückgeholt ist", () => {
    // Zwei Fassungen nacheinander, niemand tippt dazwischen: Auch nach dem zweiten Neuladen soll es zurückkommen.
    sessionStorage.setItem(NACH_NEULADEN_SCHLUESSEL, JSON.stringify({ stufe: "hell", vollbild: true }));
    const sw = container(true);
    aktualisierungStarten("anzeige");
    monitor();
    sw.wechseln();
    expect(neuladen).toHaveBeenCalledTimes(1);
    expect(JSON.parse(sessionStorage.getItem(NACH_NEULADEN_SCHLUESSEL)!)).toEqual({ stufe: "hell", vollbild: true });
  });
});
