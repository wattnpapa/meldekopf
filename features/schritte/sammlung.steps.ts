/**
 * Schritte der Einsatz-Sammlung: Sammlung auf dem Gerät, Einheitenliste und
 * -tabelle, Dialogfelder, Dateien.
 *
 * Herkunft: Erfassungsbogen `features/schritte/bogen.steps.ts` und
 * `features/schritte/oberflaeche.steps.ts` (Commit 441811c), die Schritte, die
 * die Szenarien zur Sammlung brauchen; unverändert bis auf die Grundlage
 * („auf dem Gerät liegt die Sammlung …", siehe support/sammlung.ts).
 */
import { Given, When, Then } from "@cucumber/cucumber";
import { readFile } from "node:fs/promises";
import type { Locator } from "playwright";
import { OrganisationsTyp } from "../../vendor/eeb-format/src/model";
import type { EebWelt } from "../support/welt";
import { alterBogen, sammlungSpeicher, weitereEinheit } from "../support/sammlung";

/**
 * Die Sammlung liegt vor dem Laden im Gerätespeicher und war zuletzt offen —
 * die App öffnet sie wie nach einem Neuladen am Meldekopf-Tablet (W5).
 */
async function sammlungAufDemGeraet(welt: EebWelt, name: string, mitWeiteren: boolean, vomPapier = false): Promise<void> {
  const boegen = [alterBogen()];
  if (mitWeiteren) boegen.push(weitereEinheit(OrganisationsTyp.DLRG, "Wardenburg"), weitereEinheit(OrganisationsTyp.FEUERWEHR, "Aschhausen"));
  const { einsaetze, einsatzId } = sammlungSpeicher(name, boegen, { vomPapier });
  await welt.page.addInitScript(
    ([e, id]) => {
      // Nur beim ersten Laden: ein Neuladen im Szenario soll den Stand nicht zurücksetzen.
      if (sessionStorage.getItem("prüfstand.gesät")) return;
      sessionStorage.setItem("prüfstand.gesät", "1");
      localStorage.setItem("eeb.einsaetze.v1", e);
      localStorage.setItem("eeb.letzterEinsatz.v1", JSON.stringify({ id, um: Date.now() }));
    },
    [einsaetze, einsatzId] as const,
  );
  await welt.oeffneApp();
}

Given("auf dem Gerät liegt die Sammlung {string} mit dem alten Bogen", async function (this: EebWelt, name: string) {
  await sammlungAufDemGeraet(this, name, false);
});

// Wie nach „Bögen einlesen…" vom Ausdruck: Die Karte trägt „vom Papier, Zeiten prüfen", der Papier-Abgleich steht an.
Given("auf dem Gerät liegt die Sammlung {string} mit dem alten Bogen, vom Papier eingelesen", async function (this: EebWelt, name: string) {
  await sammlungAufDemGeraet(this, name, false, true);
});

Given(
  "auf dem Gerät liegt die Sammlung {string} mit dem alten Bogen, DLRG Wardenburg und Feuerwehr Aschhausen",
  async function (this: EebWelt, name: string) {
    await sammlungAufDemGeraet(this, name, true);
  },
);

/** Arbeitsbereich der Seite — schließt Kopf-/Fußzeile und geschlossene Dialoge aus. */
function inhalt(welt: EebWelt): Locator {
  return welt.page.locator("main");
}

/**
 * Bedienelement über seinen zugänglichen Namen — also über das, was auch eine
 * Vorlesesoftware ansagt. Jedes Feld der App trägt genau seinen Feldnamen
 * (`Feld`/`Auswahl` in schritte/bausteine.tsx, geprüft in
 * beschriftungen.feature); ein Freitextfeld neben einer Auswahlliste heißt
 * „<Feldname> (Freitext)". Die Schritte hängen damit an derselben Zusicherung,
 * die auch die Barrierefreiheit trägt — bricht die, brechen sie mit.
 */
function auswahl(welt: EebWelt, name: string): Locator {
  return inhalt(welt).getByLabel(name, { exact: true }).first();
}

/**
 * Eingabefeld über sein umschließendes <label>, dessen Text mit dem Feldnamen
 * beginnt. Nicht über den zugänglichen Namen wie bei den Auswahllisten: der
 * ändert sich bei einem gefüllten Textfeld im Label mit dem Inhalt mit, und
 * ein Schritt, der nur bei leerem Feld greift, ist keiner.
 *
 * `.first()`: dieselbe Beschriftung wiederholt sich je Zeile/Karte (drei
 * Zugehörigkeits-Ebenen haben drei „Kürzel"). Gemeint ist immer die erste —
 * die unterste Ebene bzw. die zuerst angelegte Person.
 */
function feld(welt: EebWelt, name: string): Locator {
  const anfang = new RegExp("^" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return inhalt(welt)
    .locator("label")
    .filter({ hasText: anfang })
    .locator("input:not([type=checkbox]):not([type=radio]), textarea")
    .first();
}

/**
 * Zählfeld eines Steppers (−/Zahl/+, siehe `Stepper` in
 * schritte/bausteine.tsx). Es steht nicht in einem <label>, sondern trägt
 * seinen Namen als `aria-label` — die Beschriftung sitzt über der Dreiergruppe
 * und darf nicht gleichzeitig Tippziel der Knöpfe sein. Für die Schritte ist
 * das derselbe Zugang wie bei den Auswahllisten: über den angesagten Namen.
 */
function zaehlfeld(welt: EebWelt, name: string): Locator {
  return inhalt(welt).locator(`.stepper input[aria-label="${name}"]`).first();
}

/** Eingabefeld gleich welcher Bauart — normales Feld oder Stepper-Zählfeld. */
async function eingabe(welt: EebWelt, name: string): Promise<Locator> {
  // Erst warten, bis eines von beiden da ist: Die Schnellerfassung lädt nach,
  // und ein sofortiges Zählen griffe vorher ins Leere.
  const gewoehnlich = feld(welt, name);
  await gewoehnlich.or(zaehlfeld(welt, name)).first().waitFor({ state: "attached" });
  return (await gewoehnlich.count()) > 0 ? gewoehnlich : zaehlfeld(welt, name);
}

/** Wartet, bis `pruefung` ohne Ausnahme durchläuft (Standard: 10 s). */
async function bisWahr(pruefung: () => Promise<void>, dauerMs = 10_000): Promise<void> {
  const ende = Date.now() + dauerMs;
  for (;;) {
    try {
      await pruefung();
      return;
    } catch (fehler) {
      if (Date.now() > ende) throw fehler;
      await new Promise((r) => setTimeout(r, 100));
    }
  }
}



const MIME_TYPEN: Record<string, string> = {
  json: "application/json",
  pdf: "application/pdf",
  csv: "text/csv",
};

async function sichtbar(welt: EebWelt, text: string): Promise<void> {
  await welt.page.getByText(text).first().waitFor({ state: "visible" });
}

function einheitenNamen(welt: EebWelt): Promise<string[]> {
  return welt.page.locator(".einheit-zeile .muster-name").allInnerTexts();
}

function tabellenNamen(welt: EebWelt): Promise<string[]> {
  return welt.page.locator("table.einheiten-tabelle tbody th").allInnerTexts();
}

function dialog(welt: EebWelt, titel: string) {
  return welt.page.getByRole("dialog", { name: titel });
}

function offenerDialog(welt: EebWelt) {
  return welt.page.locator("dialog[open]").last();
}

/**
 * Datei-Eingaben stecken in einem `<label className="datei-knopf">`; das
 * `<input type="file">` darin ist nur fürs Auge weg (.nur-sr), damit der Knopf
 * in der Tabfolge bleibt. Angesprochen wird es über die Beschriftung des
 * Labels — also über das, was auch auf dem Knopf steht.
 */
export function dateiKnopf(welt: EebWelt, beschriftung: string): Locator {
  return welt.page
    .locator("label.datei-knopf")
    .filter({ hasText: beschriftung })
    .locator("input[type=file]")
    .first();
}

When("ich das Feld {string} mit {string} fülle", async function (this: EebWelt, name: string, wert: string) {
  await (await eingabe(this, name)).fill(wert);
});

When("ich das Feld {string} auf {string} stelle", async function (this: EebWelt, name: string, wert: string) {
  const el = auswahl(this, name);
  const tag = await el.evaluate((e) => e.tagName.toLowerCase());
  if (tag === "select") {
    await el.selectOption({ label: wert });
    return;
  }
  // Combobox (lange Vokabular-Liste, z. B. Einheitstyp/Fahrzeugtyp): tippen
  // filtert, dann den Vorschlag anklicken, der den vollen Wert trägt. Ein „–“
  // trennt Kürzel und Name; über den Namen wird eine (B)/(C)-Variante eindeutig.
  const [kurz, ...rest] = wert.split(" – ");
  const name2 = rest.length > 0 ? rest.join(" – ") : wert;
  await el.fill(kurz!);
  await inhalt(this).locator("ul.vorschlaege li").filter({ hasText: name2 }).first().click();
});

When("ich {string} ankreuze", async function (this: EebWelt, name: string) {
  await inhalt(this).getByLabel(name, { exact: true }).check();
});

// Reines Antippen/Fokussieren eines Feldes (ohne zu tippen) — für die
// Auswahl-Combobox, die ihre Liste schon auf Tap öffnen soll.
When("ich das Feld {string} anklicke", async function (this: EebWelt, name: string) {
  await auswahl(this, name).click();
});

Then("ist {string} ausgewählt", async function (this: EebWelt, name: string) {
  const feld = inhalt(this).getByLabel(name, { exact: true });
  await bisWahr(async () => {
    if (!(await feld.isChecked())) throw new Error(`„${name}" ist nicht ausgewählt`);
  });
});

When("ich {string} abwähle", async function (this: EebWelt, name: string) {
  await inhalt(this).getByLabel(name, { exact: true }).uncheck();
});

/**
 * Klick, der einen Download auslöst. Bewusst ein eigener Schritt: ohne das
 * Abwarten des Download-Ereignisses liefe das Szenario weiter, bevor die Datei
 * überhaupt entstanden ist.
 */
When(
  "ich auf {string} klicke und eine Datei erhalte",
  { timeout: 60_000 },
  async function (this: EebWelt, name: string) {
    const download = this.page.waitForEvent("download", { timeout: 55_000 });
    await this.page.getByRole("button", { name, exact: true }).click();
    await download;
  },
);

/**
 * Der Gegenweg zum Download: die eben erzeugte Datei wieder einlesen. Erst
 * damit ist eine Sicherung eine Sicherung und eine Sammel-PDF ein Transport —
 * eine Datei, die nur entsteht und nie wieder ankommt, belegt nichts.
 *
 * Bewusst mit dem vorgeschlagenen Dateinamen statt mit dem Pfad aus dem
 * Download-Verzeichnis: der ist eine endungslose UUID, und die App entscheidet
 * an der Endung, ob in der Datei eine Sammlung oder eine Sicherung steckt.
 */
When(
  "ich die zuletzt erhaltene Datei über {string} einlese",
  { timeout: 60_000 },
  async function (this: EebWelt, beschriftung: string) {
    const datei = this.downloads[this.downloads.length - 1];
    if (!datei) throw new Error("In diesem Szenario wurde noch keine Datei heruntergeladen.");
    const pfad = await datei.path();
    if (!pfad) throw new Error(`Download „${datei.suggestedFilename()}" liegt nicht auf der Platte.`);
    const name = datei.suggestedFilename();
    const endung = name.split(".").pop()?.toLowerCase() ?? "";
    await dateiKnopf(this, beschriftung).setInputFiles({
      name,
      mimeType: MIME_TYPEN[endung] ?? "application/octet-stream",
      buffer: await readFile(pfad),
    });
  },
);

/**
 * Beschriftete Paare (`dl.paare`): Begriff und Wert stehen in getrennten
 * Elementen, „sehe ich den Hinweis" greift daher nicht über beide. Geprüft wird
 * der Wert, der zum genannten Begriff gehört — nicht irgendein Vorkommen der
 * Zahl auf der Seite.
 */
Then(
  "sehe ich zu {string} den Wert {string}",
  async function (this: EebWelt, begriff: string, wert: string) {
    await this.page
      .locator("dl.paare dt", { hasText: begriff })
      .first()
      .locator("xpath=following-sibling::dd[1]")
      .filter({ hasText: wert })
      .waitFor({ state: "visible" });
  },
);

/**
 * Datei-Eingaben tragen ihre Beschriftung am umschließenden `<label>`, nicht an
 * einer Schaltfläche — „sehe ich die Schaltfläche" greift für sie nicht. Geprüft
 * wird das Label: das `<input>` darin ist für das Auge weggeblendet (.nur-sr).
 */
Then("sehe ich den Datei-Knopf {string}", async function (this: EebWelt, beschriftung: string) {
  await this.page
    .locator("label.datei-knopf")
    .filter({ hasText: beschriftung })
    .first()
    .waitFor({ state: "visible" });
});

Then("steht im Feld {string} der Wert {string}", async function (this: EebWelt, name: string, wert: string) {
  await bisWahr(async () => {
    const ist = await (await eingabe(this, name)).inputValue();
    if (ist !== wert) throw new Error(`Feld „${name}" enthält „${ist}", erwartet war „${wert}"`);
  });
});

Then("heißt die heruntergeladene Datei wie {string}", async function (this: EebWelt, muster: string) {
  await bisWahr(async () => {
    const namen = this.downloads.map((d) => d.suggestedFilename());
    // „*" als einziger Platzhalter — mehr braucht es für Dateinamen nicht.
    const regex = new RegExp("^" + muster.split("*").map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$");
    if (!namen.some((n) => regex.test(n))) {
      throw new Error(`Kein Download passt auf „${muster}" — vorhanden: ${namen.join(", ") || "(keiner)"}`);
    }
  });
});

// <summary> ist kein Button — der Ausklapper („Weitere Formate" im
// Übergeben-Dialog) braucht deshalb einen eigenen Schritt.
When("ich {string} aufklappe", async function (this: EebWelt, text: string) {
  await this.page.locator("summary", { hasText: text }).click();
});

/**
 * Klick in EINER Zeile der Einheitenliste. Nötig, sobald mehrere Einheiten
 * gemeldet sind: „Details", „Abrücken" oder „Zusammenführen…" stehen dann in
 * jeder Zeile, und ein globaler Klick träfe mehrere Knöpfe gleichen Namens.
 */
When(
  "ich bei der Einheit {string} auf {string} klicke",
  async function (this: EebWelt, einheit: string, name: string) {
    await this.page
      .locator(".einheit-zeile")
      .filter({ hasText: einheit })
      .getByRole("button", { name, exact: true })
      .click();
  },
);

Then("führt die Einheitenliste {string} an Stelle {int}", async function (this: EebWelt, name: string, platz: number) {
  const namen = await einheitenNamen(this);
  const ist = namen[platz - 1];
  if (!ist?.includes(name)) {
    throw new Error(`An Stelle ${platz} steht „${ist ?? "(nichts)"}", erwartet war „${name}". Liste: ${namen.join(" | ")}`);
  }
});

Then("führt die Einheitenliste {string} nicht", async function (this: EebWelt, name: string) {
  const namen = await einheitenNamen(this);
  if (namen.some((n) => n.includes(name))) {
    throw new Error(`„${name}" steht noch in der Liste: ${namen.join(" | ")}`);
  }
});

Then("führt die Einheitentabelle {string} an Stelle {int}", async function (this: EebWelt, name: string, platz: number) {
  const namen = await tabellenNamen(this);
  const ist = namen[platz - 1];
  if (!ist?.includes(name)) {
    throw new Error(`In der Tabelle steht an Stelle ${platz} „${ist ?? "(nichts)"}", erwartet war „${name}". Tabelle: ${namen.join(" | ")}`);
  }
});

Then("führt die Einheitentabelle genau {int} Zeilen", async function (this: EebWelt, anzahl: number) {
  const namen = await tabellenNamen(this);
  if (namen.length !== anzahl) {
    throw new Error(`Die Tabelle führt ${namen.length} Zeilen, erwartet waren ${anzahl}: ${namen.join(" | ")}`);
  }
});

When("ich die Tabelle nach {string} sortiere", async function (this: EebWelt, spalte: string) {
  await this.page
    .locator("table.einheiten-tabelle thead th")
    .filter({ hasText: spalte })
    .first()
    .getByRole("button")
    .click();
});

Then("führt die Einheitenliste genau {int} Einheiten", async function (this: EebWelt, anzahl: number) {
  const namen = await einheitenNamen(this);
  if (namen.length !== anzahl) {
    throw new Error(`Die Liste führt ${namen.length} Einheiten, erwartet waren ${anzahl}: ${namen.join(" | ")}`);
  }
});

/**
 * Die Zahl ganz oben — sie zählt alle anwesenden Einheiten des Einsatzes.
 * Eine Suche darf sie nicht verändern: wer filtert, will etwas finden und
 * nicht die Lagemeldung umschreiben.
 */
Then("meldet die Kopfleiste {int} Einheiten", async function (this: EebWelt, anzahl: number) {
  const wert = (await this.page.locator(".staerke-leiste div").first().locator("strong").innerText()).trim();
  if (wert !== String(anzahl)) {
    throw new Error(`Die Kopfleiste meldet ${wert} Einheiten, erwartet waren ${anzahl}`);
  }
});

When("ich im Dialog {string} mit {string} fülle", async function (this: EebWelt, feld: string, wert: string) {
  await offenerDialog(this).getByLabel(feld, { exact: true }).fill(wert);
});

When("ich im Dialog {string} auf {string} stelle", async function (this: EebWelt, feld: string, wert: string) {
  await offenerDialog(this).getByLabel(feld, { exact: true }).selectOption({ label: wert });
});

/**
 * Benannter Dialog statt „der zuletzt geöffnete": Der Scanner ist kein
 * `<dialog>`, sondern ein Overlay mit `role="dialog"` — und sein „Abbrechen"
 * heißt genauso wie das der Absenderkarte darunter.
 */
When("ich im Dialog {string} auf {string} klicke", async function (this: EebWelt, titel: string, name: string) {
  await dialog(this, titel).getByRole("button", { name, exact: true }).click();
});

When("ich im Dialog den Text {string} eingebe", async function (this: EebWelt, text: string) {
  // Der Dialog hat genau ein mehrzeiliges Feld („Namen einfügen": beschriftet
  // mit „Namensliste …", R2-M5) — der Schritt braucht dessen Namen nicht.
  await offenerDialog(this).locator("textarea").fill(text.replaceAll("\\n", "\n"));
});

When("ich im Dialog die Eingabetaste drücke", async function (this: EebWelt) {
  await this.page.keyboard.press("Enter");
});

Then("ist im Dialog {string} gesperrt", async function (this: EebWelt, name: string) {
  const knopf = offenerDialog(this).getByRole("button", { name });
  if (!(await knopf.isDisabled())) throw new Error(`„${name}" ist bedienbar, sollte aber gesperrt sein`);
});

When("ich das Feld mit dem Platzhalter {string} mit {string} fülle", async function (
  this: EebWelt,
  platzhalter: string,
  wert: string,
) {
  await this.page.getByPlaceholder(platzhalter).first().fill(wert);
});
