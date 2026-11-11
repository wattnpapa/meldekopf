/**
 * Neu im Meldekopf: Die Art einer Sammlung lässt sich nachträglich ändern.
 *
 * Anlass: Eine Übung wird als „Einsatz" angelegt (die Vorgabe beim Anlegen). Die Übungsbögen zählen dann nicht in die
 * Lage (`zaehltInLage`), überall steht null, und beheben ließ sich das nur mit einer neuen Sammlung. Die Regel bleibt,
 * wie sie ist; neu ist der Weg, die Sammlung selbst als Übung zu führen. Geprüft werden der Speicherweg und die Stellen
 * der Einsatzansicht: der Knopf am Hinweis „Nichts gezählt", derselbe im aufgeklappten Hinweis neben echten Meldungen
 * und das Feld „Art" unter „Einsatz bearbeiten…", jeweils mit Quittung und „Rückgängig".
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Erfassungsbogen } from "@bos/eeb-format/model";
import { Dialogschicht } from "@bos/oberflaeche/dialoge";
import { EinsatzArt, MeldeStatus, einsaetzeLaden, einsatzAnlegen, meldungHinzufuegen } from "@bos/meldekopf/einsaetze";
import { aggregiere, uebungenAusserhalbDerLage } from "./auswertung";
import { EinsatzDetail, kopfAenderungText } from "./einsaetze-ui";
import { SpeicherVollFehler, einsatzArtSetzen, einsatzKopfMitArtSetzen, statusMitZeitSetzen } from "./eintrag-zeiten";
import { neuerBogen } from "./hilfen";
import { lagebild } from "./lagemonitor";

function bogen(ort: string, uebung = false): Erfassungsbogen {
  const b = neuerBogen();
  b.einheit.hierarchie[0]!.name = ort;
  b.staerkeManuell = { fuehrer: 0, unterfuehrer: 1, mannschaft: 4, gesamt: 5 };
  if (uebung) b.uebung = true;
  return b;
}

const sammlung = (id: string) => einsaetzeLaden().find((s) => s.id === id)!;

/** Die Einsatzansicht auf dem aktuellen Speicherstand; `neuLaden` baut sie nach einer Änderung neu auf (Rolle von onGeaendert in der App). */
function ansicht(einsatzId: string) {
  const baum = () => (
    <>
      <EinsatzDetail
        einsatz={sammlung(einsatzId)}
        onZurueck={() => {}}
        onGeaendert={() => r.rerender(baum())}
        onScannen={() => {}}
        onManuell={() => {}}
        onDateiImport={() => {}}
        onBilderImport={() => {}}
        onExport={() => {}}
        onCsvExport={() => {}}
        onCsvDetailExport={() => {}}
        onSammelPdf={() => {}}
        onGeloescht={() => {}}
      />
      <Dialogschicht />
    </>
  );
  const r = render(baum());
  return r;
}

const dialog = (titel: string) => document.querySelector<HTMLDialogElement>(`dialog[aria-label='${titel}']`);
/** Die Zahl „Einheiten" der Stärkeleiste samt Zusatz („0 Einheiten (+2 Übung)"). */
const einheitenLeiste = () => document.querySelector(".staerke-leiste .anzahl")!.textContent;

describe("einsatzArtSetzen", () => {
  beforeEach(() => localStorage.clear());

  it("stellt die Art um, lässt Meldungen, Name und Ort stehen und liefert die Art davor", () => {
    const s = einsatzAnlegen("Wattsturm", EinsatzArt.EINSATZ, "Hooksiel");
    meldungHinzufuegen(s.id, bogen("Alpha", true));
    const eintraege = JSON.stringify(sammlung(s.id).eintraege);
    expect(einsatzArtSetzen(s.id, EinsatzArt.UEBUNG)).toBe(EinsatzArt.EINSATZ);
    const danach = sammlung(s.id);
    expect(danach.art).toBe(EinsatzArt.UEBUNG);
    expect([danach.name, danach.ort, danach.angelegt]).toEqual(["Wattsturm", "Hooksiel", s.angelegt]);
    expect(JSON.stringify(danach.eintraege)).toBe(eintraege);
    // Mit der Art davor geht es zurück.
    expect(einsatzArtSetzen(s.id, EinsatzArt.EINSATZ)).toBe(EinsatzArt.UEBUNG);
    expect(sammlung(s.id).art).toBe(EinsatzArt.EINSATZ);
  });

  it("schreibt nichts, wenn die Art schon gilt, und liefert null für einen unbekannten Einsatz", () => {
    const s = einsatzAnlegen("Wattsturm", EinsatzArt.VERANSTALTUNG);
    const geaendert = sammlung(s.id).geaendert;
    const schreiben = vi.spyOn(Storage.prototype, "setItem");
    expect(einsatzArtSetzen(s.id, EinsatzArt.VERANSTALTUNG)).toBe(EinsatzArt.VERANSTALTUNG);
    expect(schreiben).not.toHaveBeenCalled();
    schreiben.mockRestore();
    expect(sammlung(s.id).geaendert).toBe(geaendert);
    expect(einsatzArtSetzen("gibt-es-nicht", EinsatzArt.UEBUNG)).toBeNull();
  });

  it("lässt nach dem Umstellen jede Übungsmeldung zählen: Summen, Monitor und die Liste der Ausgenommenen folgen der Art", () => {
    const s = einsatzAnlegen("Wattsturm", EinsatzArt.EINSATZ);
    meldungHinzufuegen(s.id, bogen("Alpha", true));
    meldungHinzufuegen(s.id, bogen("Bravo", true));
    meldungHinzufuegen(s.id, bogen("Echt"));
    let jetzt = sammlung(s.id);
    expect(aggregiere(jetzt.eintraege, jetzt.art).einheiten).toBe(1);
    expect(uebungenAusserhalbDerLage(jetzt.eintraege, jetzt.art)).toHaveLength(2);
    einsatzArtSetzen(s.id, EinsatzArt.UEBUNG);
    jetzt = sammlung(s.id);
    expect(aggregiere(jetzt.eintraege, jetzt.art)).toMatchObject({ einheiten: 3, staerke: { gesamt: 15 } });
    expect(uebungenAusserhalbDerLage(jetzt.eintraege, jetzt.art)).toEqual([]);
    expect(lagebild(jetzt)).toMatchObject({ uebung: true, art: "Übung", uebungenDaneben: 0 });
    expect(lagebild(jetzt).einheiten).toHaveLength(3);
  });
});

describe("einsatzKopfMitArtSetzen", () => {
  beforeEach(() => localStorage.clear());

  it("ändert Name, Ort und Art in einem Schreibvorgang und liefert alle drei Werte davor", () => {
    const s = einsatzAnlegen("Wattsturm", EinsatzArt.EINSATZ, "Hooksiel");
    const schreiben = vi.spyOn(Storage.prototype, "setItem");
    const vorher = einsatzKopfMitArtSetzen(s.id, "  Wattsturm 2026 ", "", EinsatzArt.UEBUNG);
    expect(schreiben.mock.calls.filter(([schluessel]) => schluessel === "eeb.einsaetze.v1")).toHaveLength(1);
    schreiben.mockRestore();
    expect(vorher).toEqual({ name: "Wattsturm", ort: "Hooksiel", art: EinsatzArt.EINSATZ });
    const danach = sammlung(s.id);
    // Wie einsatzKopfSetzen: Der Name wird beschnitten, ein geleerter Ort entfällt.
    expect([danach.name, danach.ort, danach.art]).toEqual(["Wattsturm 2026", undefined, EinsatzArt.UEBUNG]);
    // Mit den Werten davor geht es vollständig zurück.
    einsatzKopfMitArtSetzen(s.id, vorher!.name, vorher!.ort, vorher!.art);
    expect([sammlung(s.id).name, sammlung(s.id).ort, sammlung(s.id).art]).toEqual(["Wattsturm", "Hooksiel", EinsatzArt.EINSATZ]);
    expect(einsatzKopfMitArtSetzen("gibt-es-nicht", "X", "Y", EinsatzArt.UEBUNG)).toBeNull();
  });

  it("lässt bei vollem Speicher den ganzen Kopf stehen: weder Name noch Art sind halb geändert", () => {
    const s = einsatzAnlegen("Wattsturm", EinsatzArt.EINSATZ, "Hooksiel");
    const voll = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("voll", "QuotaExceededError");
    });
    let fehler: unknown;
    try {
      einsatzKopfMitArtSetzen(s.id, "Anders", "Woanders", EinsatzArt.UEBUNG);
    } catch (e) {
      fehler = e;
    }
    voll.mockRestore();
    // sammlungenSchreiben meldet den vollen Speicher als eigenen Fehler; die Einsatzansicht macht daraus die Meldung „Nicht geändert".
    expect(fehler).toBeInstanceOf(SpeicherVollFehler);
    expect([sammlung(s.id).name, sammlung(s.id).ort, sammlung(s.id).art]).toEqual(["Wattsturm", "Hooksiel", EinsatzArt.EINSATZ]);
  });
});

describe("kopfAenderungText", () => {
  it("nennt die Art mit Alt und Neu zwischen Name und Ort und schweigt, wenn sie gleich bleibt oder nicht mitgegeben ist", () => {
    const vorher = { name: "A", ort: "", art: EinsatzArt.EINSATZ };
    expect(kopfAenderungText(vorher, "A", "", EinsatzArt.UEBUNG)).toBe("Art „Einsatz\" → „Übung\"");
    expect(kopfAenderungText(vorher, "B", "Nord", EinsatzArt.UEBUNG)).toBe("Name „A\" → „B\" · Art „Einsatz\" → „Übung\" · Ort (leer) → „Nord\"");
    expect(kopfAenderungText(vorher, "B", "", EinsatzArt.EINSATZ)).toBe("Name „A\" → „B\"");
    // Wie bisher, ohne Art (Erfassungsbogen R17-S4).
    expect(kopfAenderungText({ name: "A", ort: "Süd" }, "A", "Nord")).toBe("Ort „Süd\" → „Nord\"");
  });
});

describe("Sammlung nachträglich als Übung führen", () => {
  beforeEach(() => localStorage.clear());

  it("bietet den Weg an der Null: Rückfrage, dann zählt jede Übungsmeldung; die Quittung nimmt es zurück", async () => {
    const nutzer = userEvent.setup();
    const s = einsatzAnlegen("Tafel Test", EinsatzArt.EINSATZ, "Nord");
    for (const ort of ["Alpha", "Bravo"]) meldungHinzufuegen(s.id, bogen(ort, true));
    ansicht(s.id);
    expect(einheitenLeiste()).toBe("0Einheiten (+2 Übung)");
    const hinweis = document.querySelector<HTMLElement>(".nur-uebung")!;
    expect(hinweis.textContent).toContain("Nichts gezählt: alle 2 eingegangenen Meldungen sind Übung und zählen nicht in diese Lage.");

    // Abbrechen ändert nichts.
    await nutzer.click(within(hinweis).getByRole("button", { name: "Als Übung führen…" }));
    let frage = dialog("Als Übung führen?")!;
    expect(frage.textContent).toContain("„Tafel Test\" wird dann als Übung geführt");
    expect(frage.textContent).toContain("Übungsmeldungen zählen dann wie jede andere Einheit");
    expect(frage.textContent).toContain("ÜBUNG – keine Echtlage");
    // Der Rückweg nennt den Knopf, den es gibt.
    expect(frage.textContent).toContain("Über „Einsatz bearbeiten…“ im Kopf lässt sich die Art wieder umstellen.");
    expect(screen.getByRole("button", { name: "Einsatz bearbeiten…" })).toBeTruthy();
    await nutzer.click(within(frage).getByRole("button", { name: "Abbrechen" }));
    expect(sammlung(s.id).art).toBe(EinsatzArt.EINSATZ);
    expect(einheitenLeiste()).toBe("0Einheiten (+2 Übung)");

    // Bestätigen stellt um: Beide zählen, der Hinweis ist weg, der Kopf nennt die Art.
    await nutzer.click(within(hinweis).getByRole("button", { name: "Als Übung führen…" }));
    frage = dialog("Als Übung führen?")!;
    await nutzer.click(within(frage).getByRole("button", { name: "Als Übung führen" }));
    await waitFor(() => expect(sammlung(s.id).art).toBe(EinsatzArt.UEBUNG));
    await waitFor(() => expect(einheitenLeiste()).toBe("2Einheiten"));
    expect(document.querySelector(".nur-uebung")).toBeNull();
    expect(document.querySelector("details.uebung-ausgenommen")).toBeNull();
    expect(screen.queryByRole("button", { name: "Als Übung führen…" })).toBeNull();
    expect(screen.getByText(/^Übung · Nord/)).toBeTruthy();

    // Die Quittung nennt Alt und Neu und bietet den Rückweg.
    const quittung = await screen.findByText(/Art „Einsatz" → „Übung"/);
    const leiste = quittung.closest("[role='status'], dialog, .quittung")!;
    await nutzer.click(within(leiste as HTMLElement).getByRole("button", { name: "Änderung am Einsatz rückgängig machen" }));
    await waitFor(() => expect(sammlung(s.id).art).toBe(EinsatzArt.EINSATZ));
    await waitFor(() => expect(einheitenLeiste()).toBe("0Einheiten (+2 Übung)"));
    expect(await screen.findByText("Zurückgenommen: „Tafel Test\" wird wieder als Einsatz geführt.")).toBeTruthy();
  });

  it("bietet denselben Weg neben echten Meldungen im aufgeklappten Hinweis: Danach zählen alle", async () => {
    const nutzer = userEvent.setup();
    const s = einsatzAnlegen("Wattsturm", EinsatzArt.EINSATZ);
    meldungHinzufuegen(s.id, bogen("Echt"));
    meldungHinzufuegen(s.id, bogen("Geübt", true));
    ansicht(s.id);
    expect(einheitenLeiste()).toBe("1Einheiten (+1 Übung)");
    // Die Null-Zeile gibt es hier nicht: Eine Einheit zählt.
    expect(document.querySelector(".nur-uebung")).toBeNull();
    const hinweis = document.querySelector<HTMLDetailsElement>("details.uebung-ausgenommen")!;
    await nutzer.click(hinweis.querySelector("summary")!);
    await nutzer.click(within(hinweis).getByRole("button", { name: "Als Übung führen…" }));
    // Eine echte Einheit steht in der Sammlung: Die Rückfrage sagt das, nennt den Weg je Bogen, und der Fokus liegt auf „Abbrechen".
    const frage = dialog("Als Übung führen?")!;
    expect(frage.textContent).toContain("„Wattsturm\" führt auch eine Einheit ohne Übungskennzeichen.");
    expect(frage.textContent).toContain("an seiner Karte unter „Mehr…“: „Als Einsatzmeldung zählen…“");
    await waitFor(() => expect(document.activeElement).toBe(within(frage).getByRole("button", { name: "Abbrechen" })));
    await nutzer.click(within(frage).getByRole("button", { name: "Als Übung führen" }));
    await waitFor(() => expect(einheitenLeiste()).toBe("2Einheiten"));
    expect(sammlung(s.id).art).toBe(EinsatzArt.UEBUNG);
  });

  it("meldet einen vollen Speicher, lässt die Art stehen und quittiert nichts", async () => {
    const nutzer = userEvent.setup();
    const s = einsatzAnlegen("Tafel Test", EinsatzArt.EINSATZ);
    meldungHinzufuegen(s.id, bogen("Alpha", true));
    ansicht(s.id);
    await nutzer.click(within(document.querySelector<HTMLElement>(".nur-uebung")!).getByRole("button", { name: "Als Übung führen…" }));
    const voll = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("voll", "QuotaExceededError");
    });
    await nutzer.click(within(dialog("Als Übung führen?")!).getByRole("button", { name: "Als Übung führen" }));
    await waitFor(() => expect(dialog("Nicht geändert")).not.toBeNull());
    voll.mockRestore();
    // Zuerst steht, was nicht geschehen ist, dann der Grund (R20-H13).
    expect(dialog("Nicht geändert")!.textContent).toContain("„Tafel Test\" wird weiter als Einsatz geführt. Der Speicher ist voll");
    expect(sammlung(s.id).art).toBe(EinsatzArt.EINSATZ);
    expect(screen.queryByText(/Art „Einsatz" → „Übung"/)).toBeNull();
    expect(einheitenLeiste()).toBe("0Einheiten (+1 Übung)");
  });

  it("bietet den Weg nicht an der Null an, wenn echte Einheiten da waren und abgerückt sind; der Satz nennt dann die anwesenden", async () => {
    const s = einsatzAnlegen("Hochwasser Weser", EinsatzArt.EINSATZ);
    const echt = meldungHinzufuegen(s.id, bogen("Echt"))!.eintrag;
    meldungHinzufuegen(s.id, bogen("Alpha", true));
    meldungHinzufuegen(s.id, bogen("Bravo", true));
    statusMitZeitSetzen(s.id, echt.id, MeldeStatus.ABGERUECKT);
    ansicht(s.id);
    const hinweis = document.querySelector<HTMLElement>(".nur-uebung")!;
    expect(hinweis.textContent).toBe("Nichts gezählt: alle 2 anwesenden Meldungen sind Übung und zählen nicht in diese Lage.");
    expect(within(hinweis).queryByRole("button")).toBeNull();
    // Im aufgeklappten Hinweis bleibt der Weg, mit der Rückfrage, die die echte Einheit nennt.
    expect(within(document.querySelector<HTMLElement>("details.uebung-ausgenommen")!).getByRole("button", { name: "Als Übung führen…" })).toBeTruthy();
  });

  it("bietet in einer Übung nichts an: Dort zählt schon alles", () => {
    const s = einsatzAnlegen("Wattsturm", EinsatzArt.UEBUNG);
    meldungHinzufuegen(s.id, bogen("Geübt", true));
    ansicht(s.id);
    expect(einheitenLeiste()).toBe("1Einheiten");
    expect(screen.queryByRole("button", { name: "Als Übung führen…" })).toBeNull();
  });
});

describe("Einsatz bearbeiten: Art", () => {
  beforeEach(() => localStorage.clear());

  it("führt die Art als Auswahl mit dem geltenden Wert; die Änderung wird quittiert und lässt sich zurücknehmen", async () => {
    const nutzer = userEvent.setup();
    const s = einsatzAnlegen("Wattsturm", EinsatzArt.EINSATZ, "Hooksiel");
    meldungHinzufuegen(s.id, bogen("Geübt", true));
    ansicht(s.id);
    // Der Knopf heißt wie der Dialog und wie die Texte, die auf ihn verweisen.
    await nutzer.click(screen.getByRole("button", { name: "Einsatz bearbeiten…" }));
    const bearbeiten = dialog("Einsatz bearbeiten")!;
    expect(bearbeiten.textContent).toContain("Die Art entscheidet, ob Übungsmeldungen zählen");
    const art = within(bearbeiten).getByLabelText("Art") as HTMLSelectElement;
    expect(Array.from(art.options).map((o) => o.textContent)).toEqual(["Einsatz", "Übung", "Veranstaltung"]);
    expect(art.selectedOptions[0]!.textContent).toBe("Einsatz");
    await nutzer.selectOptions(art, "Übung");
    await nutzer.clear(within(bearbeiten).getByLabelText("Name"));
    await nutzer.type(within(bearbeiten).getByLabelText("Name"), "Wattsturm 2026");
    await nutzer.click(within(bearbeiten).getByRole("button", { name: "Übernehmen" }));

    await waitFor(() => expect(sammlung(s.id).art).toBe(EinsatzArt.UEBUNG));
    expect([sammlung(s.id).name, sammlung(s.id).ort]).toEqual(["Wattsturm 2026", "Hooksiel"]);
    await waitFor(() => expect(einheitenLeiste()).toBe("1Einheiten"));
    const quittung = await screen.findByText(/Name „Wattsturm" → „Wattsturm 2026" · Art „Einsatz" → „Übung"/);
    const leiste = quittung.closest("[role='status'], dialog, .quittung")!;
    await nutzer.click(within(leiste as HTMLElement).getByRole("button", { name: "Änderung am Einsatz rückgängig machen" }));
    await waitFor(() => expect(sammlung(s.id).art).toBe(EinsatzArt.EINSATZ));
    expect(sammlung(s.id).name).toBe("Wattsturm");
    expect(await screen.findByText("Zurückgenommen: Der Einsatz heißt wieder „Wattsturm\" und wird wieder als Einsatz geführt.")).toBeTruthy();
  });

  it("lässt die Art stehen, wenn nur der Ort geändert wird, und schreibt nichts, wenn nichts geändert ist", async () => {
    const nutzer = userEvent.setup();
    const s = einsatzAnlegen("Wattsturm", EinsatzArt.VERANSTALTUNG);
    ansicht(s.id);
    // Ohne Ort steht der Cursor im Feld Ort (R17-S4); das Feld „Art" steht trotzdem da.
    await nutzer.click(screen.getByRole("button", { name: "Einsatz bearbeiten…" }));
    let bearbeiten = dialog("Einsatz bearbeiten")!;
    expect(document.activeElement).toBe(within(bearbeiten).getByLabelText(/^Ort/));
    expect((within(bearbeiten).getByLabelText("Art") as HTMLSelectElement).selectedOptions[0]!.textContent).toBe("Veranstaltung");
    const geaendert = sammlung(s.id).geaendert;
    await nutzer.click(within(bearbeiten).getByRole("button", { name: "Übernehmen" }));
    expect(sammlung(s.id).geaendert).toBe(geaendert);
    expect(screen.queryByText(/Einsatz geändert/)).toBeNull();

    await nutzer.click(screen.getByRole("button", { name: "Einsatz bearbeiten…" }));
    bearbeiten = dialog("Einsatz bearbeiten")!;
    await nutzer.type(within(bearbeiten).getByLabelText(/^Ort/), "Marktplatz");
    await nutzer.click(within(bearbeiten).getByRole("button", { name: "Übernehmen" }));
    await waitFor(() => expect(sammlung(s.id).ort).toBe("Marktplatz"));
    expect(sammlung(s.id).art).toBe(EinsatzArt.VERANSTALTUNG);
    expect(await screen.findByText(/Ort \(leer\) → „Marktplatz"/)).toBeTruthy();
    expect(screen.queryByText(/Art „/)).toBeNull();
  });
});
