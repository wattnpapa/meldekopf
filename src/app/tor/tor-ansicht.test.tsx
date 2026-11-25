/**
 * Herkunft: neu in der Meldekopf-App. Die Tor-Liste: Tippsuche, Buchen, Rückgängig, Weg zurück zur Kamera.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { OrganisationsTyp, PersonalErfassung, SCHEMA_VERSION, jetztZeitpunkt, type Erfassungsbogen } from "@bos/eeb-format/model";
import { EinsatzArt, MeldeStatus, einsaetzeLaden as kernEinsaetzeLaden, einsatzAnlegen, type MeldeEintrag } from "@bos/meldekopf/einsaetze";
import { einsaetzeLaden } from "../einsaetze-lesen";
import { sammlungenSchreiben } from "../eintrag-zeiten";
import { torFahrzeuge } from "./fahrzeug-stand";
import TorAnsicht from "./tor-ansicht";

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

function Buehne({ id, onSchliessen = () => {}, onKamera }: { id: string; onSchliessen?: () => void; onKamera?: () => void }) {
  const [, neu] = useState(0);
  return <TorAnsicht einsatz={sammlung(id)} onGeaendert={() => neu((n) => n + 1)} onSchliessen={onSchliessen} onKamera={onKamera} />;
}

beforeEach(() => localStorage.clear());

describe("Tor-Liste", () => {
  it("zeigt alle Fahrzeuge der anwesenden Einheiten und führt mit „Mit der Kamera…“ zurück in den Scanner", async () => {
    const nutzer = userEvent.setup();
    const kamera = vi.fn();
    const { unmount } = render(<Buehne id={einsatzAnlegenMit()} onKamera={kamera} />);
    expect(screen.getByText("0 von 3 Fahrzeugen unterwegs")).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    await nutzer.click(screen.getByRole("button", { name: "Mit der Kamera…" }));
    expect(kamera).toHaveBeenCalledOnce();
    unmount();
    // Wo es den kombinierten Scanner nicht gibt (Android-App), fehlt der Knopf.
    render(<Buehne id={einsatzAnlegenMit()} />);
    expect(screen.queryByRole("button", { name: "Mit der Kamera…" })).toBeNull();
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
