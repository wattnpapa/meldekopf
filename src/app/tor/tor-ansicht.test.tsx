/**
 * Herkunft: neu in der Meldekopf-App. Die Tor-Ansicht: Tippsuche, Buchen, Rückgängig, Treffer der Kamera.
 * Die echte Texterkennung lädt WebAssembly; hier liest eine Attrappe, was der Test ihr vorgibt.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { OrganisationsTyp, PersonalErfassung, SCHEMA_VERSION, jetztZeitpunkt, type Erfassungsbogen } from "@bos/eeb-format/model";
import { EinsatzArt, MeldeStatus, einsaetzeLaden as kernEinsaetzeLaden, einsatzAnlegen, type MeldeEintrag } from "@bos/meldekopf/einsaetze";
import { einsaetzeLaden } from "../einsaetze-lesen";
import { sammlungenSchreiben } from "../eintrag-zeiten";
import { torFahrzeuge } from "./fahrzeug-stand";
import TorAnsicht, { rahmenAusschnitt } from "./tor-ansicht";

let lesung = "";
vi.mock("./kennzeichen-leser", () => ({
  kennzeichenLeserLaden: async () => ({ lesen: async () => lesung, beenden: () => {} }),
}));

function bogen(ort: string, kennzeichen: string[]): Erfassungsbogen {
  return {
    schemaVersion: SCHEMA_VERSION,
    stand: jetztZeitpunkt(),
    einheit: { organisation: OrganisationsTyp.THW, einheitsTyp: { freitext: "B" }, hierarchie: [{ bezeichnung: { freitext: "Ort" }, name: ort }] },
    einsatz: { zeitraumVon: 0, zeitraumBis: 0, ortAuftrag: "" },
    personalErfassung: PersonalErfassung.NUR_STAERKE,
    staerkeManuell: { fuehrer: 0, unterfuehrer: 2, mannschaft: 7, gesamt: 9 },
    personal: [],
    fahrzeuge: kennzeichen.map((k) => ({ typ: { freitext: "MTW" }, kennzeichen: k })),
    sofortbedarf: { ruhezeitErforderlich: false, unterbringung: false, verpflegungPersonen: 0, dieselLiter: 0, benzinLiter: 0, gemischLiter: 0 },
  } as Erfassungsbogen;
}

function einsatzAnlegenMit(): string {
  const s = einsatzAnlegen("Hochwasser", EinsatzArt.EINSATZ);
  const T = Date.now() - 60_000;
  const liste = kernEinsaetzeLaden();
  const e = (id: string, schl: string, b: Erfassungsbogen): MeldeEintrag => ({ id, einheitSchluessel: schl, empfangenAm: T, quelle: "manuell", status: MeldeStatus.ANWESEND, bogen: b });
  liste.find((x) => x.id === s.id)!.eintraege = [e("m1", "e1", bogen("Rathenow", ["THW-81234", "THW-81284"])), e("m2", "e2", bogen("Nauen", ["HVL-FW 112"]))];
  sammlungenSchreiben(liste);
  return s.id;
}

const sammlung = (id: string) => einsaetzeLaden().find((x) => x.id === id)!;

function Buehne({ id, onSchliessen = () => {} }: { id: string; onSchliessen?: () => void }) {
  const [, neu] = useState(0);
  return <TorAnsicht einsatz={sammlung(id)} onGeaendert={() => neu((n) => n + 1)} onSchliessen={onSchliessen} />;
}

const echteMediaDevices = navigator.mediaDevices;
function mediaDevicesSetzen(wert: unknown): void {
  Object.defineProperty(navigator, "mediaDevices", { value: wert, configurable: true });
}

beforeEach(() => {
  localStorage.clear();
  lesung = "";
  HTMLMediaElement.prototype.play = vi.fn(async () => {});
  // Vorgabe: ein Gerät ohne Kamera-Schnittstelle. Die Tippsuche muss damit vollständig gehen.
  mediaDevicesSetzen(undefined);
});
afterEach(() => mediaDevicesSetzen(echteMediaDevices));

describe("Tor-Ansicht ohne Kamera", () => {
  it("sagt, dass die Kamera fehlt, und zeigt alle Fahrzeuge der anwesenden Einheiten", async () => {
    render(<Buehne id={einsatzAnlegenMit()} />);
    expect(await screen.findByText(/gibt die Kamera für Webseiten nicht frei\. Kennzeichen unten eintippen\./)).toBeTruthy();
    expect(screen.getByText("0 von 3 Fahrzeugen unterwegs")).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it("findet über die letzten Zeichen, bucht „Fährt raus“ und nimmt es mit „Rückgängig“ zurück", async () => {
    const nutzer = userEvent.setup();
    const id = einsatzAnlegenMit();
    render(<Buehne id={id} />);
    await nutzer.type(screen.getByRole("searchbox"), "284");
    const zeilen = screen.getAllByRole("listitem");
    expect(zeilen).toHaveLength(1);
    await nutzer.click(within(zeilen[0]!).getByRole("button"));

    const treffer = screen.getByRole("region", { name: "Gewähltes Fahrzeug" });
    expect(within(treffer).getByText("THW-81284")).toBeTruthy();
    expect(within(treffer).getByText("Jetzt: im Bereitstellungsraum")).toBeTruthy();
    // Der erwartete Schritt ist der hervorgehobene.
    expect(within(treffer).getByRole("button", { name: "Fährt raus" }).className).toContain("primaer");
    await nutzer.click(within(treffer).getByRole("button", { name: "Fährt raus" }));

    expect(screen.getByText("1 von 3 Fahrzeugen unterwegs")).toBeTruthy();
    expect(screen.getByText(/✓ MTW THW-81284 \(.*Rathenow.*\) fährt raus · /)).toBeTruthy();
    expect(torFahrzeuge(sammlung(id)).find((f) => f.schluessel === "THW81284")!.unterwegsSeit).not.toBeNull();
    // Die Suche ist wieder leer, das Fahrzeug steht oben in der Liste.
    expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe("");
    expect(within(screen.getAllByRole("listitem")[0]!).getByText(/^unterwegs seit /)).toBeTruthy();

    await nutzer.click(screen.getByRole("button", { name: "Rückgängig" }));
    expect(screen.getByText("0 von 3 Fahrzeugen unterwegs")).toBeTruthy();
    expect(sammlung(id).eintraege[0]!.vermerke).toBeUndefined();
  });

  it("hebt bei einem Fahrzeug, das unterwegs ist, „Kommt zurück“ hervor", async () => {
    const nutzer = userEvent.setup();
    const id = einsatzAnlegenMit();
    render(<Buehne id={id} />);
    await nutzer.type(screen.getByRole("searchbox"), "nauen");
    await nutzer.click(within(screen.getAllByRole("listitem")[0]!).getByRole("button"));
    await nutzer.click(screen.getByRole("button", { name: "Fährt raus" }));
    await nutzer.click(within(screen.getAllByRole("listitem")[0]!).getByRole("button"));
    expect(screen.getByText(/^Jetzt: unterwegs seit /)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Kommt zurück" }).className).toContain("primaer");
    await nutzer.click(screen.getByRole("button", { name: "Kommt zurück" }));
    expect(screen.getByText("0 von 3 Fahrzeugen unterwegs")).toBeTruthy();
    expect(sammlung(id).eintraege[1]!.vermerke?.map((v) => v.text)).toEqual(["Fahrzeug MTW HVL-FW 112: fährt raus", "Fahrzeug MTW HVL-FW 112: ist zurück"]);
  });

  it("sagt, wenn nichts passt, und schließt über „Schließen“", async () => {
    const nutzer = userEvent.setup();
    const zu = vi.fn();
    render(<Buehne id={einsatzAnlegenMit()} onSchliessen={zu} />);
    await nutzer.type(screen.getByRole("searchbox"), "999");
    expect(screen.getByText("Kein Fahrzeug dieser Sammlung passt zu „999“.")).toBeTruthy();
    await nutzer.click(screen.getByRole("button", { name: "Schließen" }));
    expect(zu).toHaveBeenCalledOnce();
  });
});

describe("Tor-Ansicht mit Kamera", () => {
  function kameraAn() {
    const spur = { stop: vi.fn(), getSettings: () => ({}) };
    const stream = { getTracks: () => [spur], getVideoTracks: () => [spur] } as unknown as MediaStream;
    mediaDevicesSetzen({ getUserMedia: vi.fn(async () => stream) });
    // jsdom hat kein Videobild und keine Zeichenfläche: Beides wird als vorhanden gemeldet, gelesen wird die Vorgabe des Tests.
    Object.defineProperty(HTMLMediaElement.prototype, "readyState", { configurable: true, get: () => 4 });
    Object.defineProperty(HTMLVideoElement.prototype, "videoWidth", { configurable: true, get: () => 1280 });
    Object.defineProperty(HTMLVideoElement.prototype, "videoHeight", { configurable: true, get: () => 720 });
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ drawImage: () => {} })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
    return spur;
  }

  it("zeigt das wörtlich gelesene Kennzeichen als Treffer, bucht aber nicht von selbst", async () => {
    kameraAn();
    lesung = "D THW 81234";
    const id = einsatzAnlegenMit();
    render(<Buehne id={id} />);
    const treffer = await screen.findByRole("region", { name: "Gewähltes Fahrzeug" }, { timeout: 3000 });
    expect(within(treffer).getByText("THW-81234")).toBeTruthy();
    expect(screen.getByText("Gelesen: D THW 81234")).toBeTruthy();
    expect(torFahrzeuge(sammlung(id)).every((f) => f.unterwegsSeit == null)).toBe(true);
  });

  it("lässt wählen, wenn die Lesung auf zwei Kennzeichen passt", async () => {
    kameraAn();
    lesung = "THW 812 4";
    render(<Buehne id={einsatzAnlegenMit()} />);
    expect(await screen.findByText(/Die Kamera ist nicht sicher\. Welches Fahrzeug ist es\?/, undefined, { timeout: 3000 })).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("schaltet die Kamera mit „Kamera aus“ ab und gibt sie frei", async () => {
    const nutzer = userEvent.setup();
    const spur = kameraAn();
    render(<Buehne id={einsatzAnlegenMit()} />);
    await screen.findByText("Kennzeichen in den Rahmen halten", undefined, { timeout: 3000 });
    await nutzer.click(screen.getByRole("button", { name: "Kamera aus" }));
    await waitFor(() => expect(spur.stop).toHaveBeenCalled());
    expect(screen.getByText("Kamera ist aus. Kennzeichen unten eintippen.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Kamera ein" })).toBeTruthy();
  });
});

describe("Bildausschnitt unter dem Rahmen", () => {
  it("rechnet den Rahmen in Kamerapixel um, mit Zugabe, bei beschnittenem Video", () => {
    // Video 1280 × 720 in einem Kasten 400 × 200 (cover: Maßstab 0,3125, oben und unten beschnitten); Rahmen 320 × 80 mittig.
    const a = rahmenAusschnitt({ breite: 1280, hoehe: 720 }, { x: 0, y: 0, width: 400, height: 200 }, { x: 40, y: 60, width: 320, height: 80 }, 1);
    expect(a).toEqual({ x: 128, y: 232, breite: 1024, hoehe: 256 });
  });
  it("gibt ohne brauchbaren Rahmen das ganze Bild", () => {
    expect(rahmenAusschnitt({ breite: 640, hoehe: 480 }, { x: 0, y: 0, width: 0, height: 0 }, undefined)).toEqual({ x: 0, y: 0, breite: 640, hoehe: 480 });
  });
});
