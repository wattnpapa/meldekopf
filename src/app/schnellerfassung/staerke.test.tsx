/**
 * Abschnitt Stärke: Zähler und Führungskraft schreiben in den Bogen, was die
 * Lage später liest (Stärke aus `staerkeManuell`, Rückrufnummer am Personal).
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { KontaktArt, PersonalErfassung, StaerkeRolle, type Erfassungsbogen } from "@bos/eeb-format/model";
import { neuerBogen } from "../hilfen";
import { AbschnittStaerke } from "./staerke";

function Buehne() {
  const [bogen, setBogen] = useState<Erfassungsbogen>({
    ...neuerBogen(),
    personalErfassung: PersonalErfassung.NUR_STAERKE,
    staerkeManuell: { fuehrer: 0, unterfuehrer: 0, mannschaft: 0, gesamt: 0 },
  });
  return (
    <>
      <AbschnittStaerke bogen={bogen} aendern={(p) => setBogen((b) => ({ ...b, ...p }))} />
      <output data-testid="bogen">{JSON.stringify({ s: bogen.staerkeManuell, p: bogen.personal })}</output>
    </>
  );
}

const stand = () => JSON.parse(screen.getByTestId("bogen").textContent!) as { s: Erfassungsbogen["staerkeManuell"]; p: Erfassungsbogen["personal"] };

describe("Abschnitt Stärke", () => {
  it("zählt mit den Zählern und rechnet die Gesamtstärke", async () => {
    const nutzer = userEvent.setup();
    render(<Buehne />);
    await nutzer.click(screen.getByRole("button", { name: "Führer: erhöhen" }));
    await nutzer.click(screen.getByRole("button", { name: "Mannschaft: erhöhen" }));
    await nutzer.click(screen.getByRole("button", { name: "Mannschaft: erhöhen" }));
    expect(stand().s).toEqual({ fuehrer: 1, unterfuehrer: 0, mannschaft: 2, gesamt: 3 });
    expect((screen.getByLabelText("Gesamt") as HTMLInputElement).value).toBe("3");
  });

  it("legt die Führungskraft mit Mobilnummer an und nimmt sie geleert wieder weg", async () => {
    const nutzer = userEvent.setup();
    render(<Buehne />);
    await nutzer.type(screen.getByLabelText("Name"), "Weber");
    await nutzer.type(screen.getByLabelText("Telefon"), "0171 234-56");
    const p = stand().p;
    expect(p).toHaveLength(1);
    expect(p[0]!.nachname).toBe("Weber");
    expect(p[0]!.staerkeRolle).toBe(StaerkeRolle.FUEHRER);
    expect(p[0]!.kontakte).toEqual([{ art: KontaktArt.MOBIL, dienstlich: true, wert: "017123456" }]);

    await nutzer.clear(screen.getByLabelText("Name"));
    await nutzer.clear(screen.getByLabelText("Telefon"));
    expect(stand().p).toEqual([]);
  });

  it("die Führungskraft zählt nicht in die Stärke", async () => {
    const nutzer = userEvent.setup();
    render(<Buehne />);
    await nutzer.type(screen.getByLabelText("Name"), "Weber");
    expect(stand().s?.gesamt).toBe(0);
  });
});
