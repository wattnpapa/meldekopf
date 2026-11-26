/**
 * Herkunft: neu in der Meldekopf-App. Kennzeichen im Scanner: Treffer der Kamera, Wahl bei unsicherer Lesung, Buchen.
 * Die echte Texterkennung lädt WebAssembly; hier liest eine Attrappe, was der Test ihr vorgibt.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { OrganisationsTyp, PersonalErfassung, SCHEMA_VERSION, jetztZeitpunkt, type Erfassungsbogen } from "@bos/eeb-format/model";
import { EinsatzArt, MeldeStatus, einsaetzeLaden as kernEinsaetzeLaden, einsatzAnlegen, type MeldeEintrag } from "@bos/meldekopf/einsaetze";
import { einsaetzeLaden } from "../einsaetze-lesen";
import { sammlungenSchreiben } from "../eintrag-zeiten";
import { torFahrzeuge } from "./fahrzeug-stand";
import ScannerTor from "./scanner-tor";

let lesung = "";
const geladen = vi.fn();
vi.mock("./kennzeichen-leser", () => ({
  kennzeichenLeserLaden: async () => {
    geladen();
    return { lesen: async () => lesung, beenden: () => {} };
  },
}));

function bogen(kennzeichen: (string | undefined)[]): Erfassungsbogen {
  return {
    schemaVersion: SCHEMA_VERSION,
    stand: jetztZeitpunkt(),
    einheit: { organisation: OrganisationsTyp.THW, einheitsTyp: { freitext: "B" }, hierarchie: [{ bezeichnung: { freitext: "Ort" }, name: "Rathenow" }] },
    einsatz: { zeitraumVon: 0, zeitraumBis: 0, ortAuftrag: "" },
    personalErfassung: PersonalErfassung.NUR_STAERKE,
    staerkeManuell: { fuehrer: 0, unterfuehrer: 2, mannschaft: 7, gesamt: 9 },
    personal: [],
    fahrzeuge: kennzeichen.map((k) => ({ typ: { freitext: "MTW" }, ...(k ? { kennzeichen: k } : {}) })),
    sofortbedarf: { ruhezeitErforderlich: false, unterbringung: false, verpflegungPersonen: 0, dieselLiter: 0, benzinLiter: 0, gemischLiter: 0 },
  } as Erfassungsbogen;
}

function einsatzMit(kennzeichen: (string | undefined)[]): string {
  const s = einsatzAnlegen("Hochwasser", EinsatzArt.EINSATZ);
  const liste = kernEinsaetzeLaden();
  const e: MeldeEintrag = { id: "m1", einheitSchluessel: "e1", empfangenAm: Date.now() - 60_000, quelle: "manuell", status: MeldeStatus.ANWESEND, bogen: bogen(kennzeichen) };
  liste.find((x) => x.id === s.id)!.eintraege = [e];
  sammlungenSchreiben(liste);
  return s.id;
}

const fahrzeuge = (id: string) => torFahrzeuge(einsaetzeLaden().find((x) => x.id === id)!);

/** Der Scanner reicht Videobild und Rahmen herein; hier stehen dafür zwei leere Elemente. */
function Buehne({ id, onGeaendert = () => {}, kameraLaeuft = true }: { id: string; onGeaendert?: () => void; kameraLaeuft?: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const rahmen = useRef<HTMLDivElement>(null);
  return (
    <>
      <video ref={video} />
      <div ref={rahmen} />
      <ScannerTor einsatzId={id} video={video} rahmen={rahmen} kameraLaeuft={kameraLaeuft} onGeaendert={onGeaendert} />
    </>
  );
}

beforeEach(() => {
  localStorage.clear();
  lesung = "";
  geladen.mockClear();
  // jsdom hat kein Videobild und keine Zeichenfläche: Beides wird als vorhanden gemeldet, gelesen wird die Vorgabe des Tests.
  Object.defineProperty(HTMLMediaElement.prototype, "readyState", { configurable: true, get: () => 4 });
  Object.defineProperty(HTMLVideoElement.prototype, "videoWidth", { configurable: true, get: () => 720 });
  Object.defineProperty(HTMLVideoElement.prototype, "videoHeight", { configurable: true, get: () => 1280 });
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    drawImage: () => {},
    // Ein leeres Bild: Der Schild-Sucher findet nichts, gelesen wird der ganze Ausschnitt.
    getImageData: (_x: number, _y: number, b: number, h: number) => ({ data: new Uint8ClampedArray(b * h * 4) }),
    putImageData: () => {},
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext;
});

describe("Kennzeichen im Scanner", () => {
  it("zeigt das wörtlich gelesene Kennzeichen als Treffer, bucht erst auf Knopfdruck und lässt es zurücknehmen", async () => {
    const nutzer = userEvent.setup();
    lesung = "D THW 81234";
    const geaendert = vi.fn();
    const id = einsatzMit(["THW-81234", "THW-81284"]);
    render(<Buehne id={id} onGeaendert={geaendert} />);
    const treffer = await screen.findByRole("region", { name: "Gewähltes Fahrzeug" }, { timeout: 3000 });
    expect(within(treffer).getByText("THW-81234")).toBeTruthy();
    expect(fahrzeuge(id).every((f) => f.unterwegsSeit == null)).toBe(true);

    await nutzer.click(within(treffer).getByRole("button", { name: "Fährt raus" }));
    expect(fahrzeuge(id)[0]!.unterwegsSeit).not.toBeNull();
    expect(geaendert).toHaveBeenCalledOnce();
    expect(screen.getByText(/✓ MTW THW-81234 .* fährt raus · /)).toBeTruthy();
    // Das eben gebuchte Kennzeichen steht noch im Bild: Es wird nicht gleich wieder vorgeschlagen.
    await new Promise((r) => setTimeout(r, 500));
    expect(screen.queryByRole("region", { name: "Gewähltes Fahrzeug" })).toBeNull();

    await nutzer.click(screen.getByRole("button", { name: "Rückgängig" }));
    expect(fahrzeuge(id)[0]!.unterwegsSeit).toBeNull();
  });

  it("lässt wählen, wenn die Lesung auf zwei Kennzeichen passt", async () => {
    const nutzer = userEvent.setup();
    lesung = "THW 812 4";
    render(<Buehne id={einsatzMit(["THW-81234", "THW-81284"])} />);
    const wahl = await screen.findByRole("region", { name: "Fahrzeug wählen" }, { timeout: 3000 });
    expect(within(wahl).getAllByRole("listitem")).toHaveLength(2);
    await nutzer.click(within(wahl).getByRole("button", { name: /THW-81284/ }));
    expect(within(screen.getByRole("region", { name: "Gewähltes Fahrzeug" })).getByText("THW-81284")).toBeTruthy();
  });

  it("sagt, wenn das gelesene Kennzeichen zu keinem Fahrzeug der Sammlung gehört", async () => {
    lesung = "EE Y SS A 4 THW I8 CT HTHN84588 S55 NAM J";
    render(<Buehne id={einsatzMit(["THW-81234"])} />);
    expect(await screen.findByText(/Kennzeichen gelesen: HTHN84588 – kein Fahrzeug dieser Sammlung\./, undefined, { timeout: 3000 })).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Gewähltes Fahrzeug" })).toBeNull();
  });

  it("findet im Bild eines ganzen Fahrzeugs das Kennzeichen der Sammlung an seinen Ziffern", async () => {
    lesung = "EE Y SS A 4 THW I8 CT HTHN84588 S55 NAM J";
    render(<Buehne id={einsatzMit(["THW-84588", "THW-81234"])} />);
    const treffer = await screen.findByRole("region", { name: "Gewähltes Fahrzeug" }, { timeout: 3000 });
    expect(within(treffer).getByText("THW-84588")).toBeTruthy();
  });

  it("zeigt nichts, solange die Kamera einen QR-Code oder fremden Text sieht", async () => {
    lesung = "TECHNISCHES HILFSWERK";
    const { container } = render(<Buehne id={einsatzMit(["THW-81234"])} />);
    await vi.waitFor(() => expect(geladen).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 400));
    expect(container.querySelector(".scanner-tor")).toBeNull();
  });

  it("lädt die Texterkennung nicht, wenn kein Fahrzeug ein Kennzeichen hat oder die Kamera nicht läuft", async () => {
    const { unmount } = render(<Buehne id={einsatzMit([undefined])} />);
    await new Promise((r) => setTimeout(r, 100));
    unmount();
    render(<Buehne id={einsatzMit(["THW-81234"])} kameraLaeuft={false} />);
    await new Promise((r) => setTimeout(r, 100));
    expect(geladen).not.toHaveBeenCalled();
  });
});
