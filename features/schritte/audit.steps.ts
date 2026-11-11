/**
 * Schritte der gemeinsamen Audit-Runde nach Runde 1 des Meldekopfs (offene
 * P2/P3, docs/audits/runde-1/README.md): Lagemonitor im zweiten Fenster,
 * Zeiten relativ zur Uhr der Seite, Browser-Zurück.
 *
 * Neu im Meldekopf; kein Gegenstück im Erfassungsbogen.
 */
import { Given, Then, When } from "@cucumber/cucumber";
import type { Page } from "playwright";
import { EinsatzArt } from "../../vendor/bos-meldekopf/src/einsaetze";
import { fernseherBoegen, sammlungSpeicher, tafelLageSpeicher, uebungsBoegen, uebungsBogenFragment } from "../support/sammlung";
import type { EebWelt } from "../support/welt";

const MONITOR = new WeakMap<EebWelt, Page>();

/** Wurzel des Monitors in beiden Ansichten: Zeilen (`main.lm`) und Tafel (`main.lt`, neu im Meldekopf). */
const BILD = "main.lm, main.lt";

function monitor(welt: EebWelt): Page {
  const p = MONITOR.get(welt);
  if (!p) throw new Error("Der Lagemonitor ist nicht offen.");
  return p;
}

When("ich den Lagemonitor öffne", async function (this: EebWelt) {
  const [fenster] = await Promise.all([
    this.page.context().waitForEvent("page"),
    this.page.getByRole("button", { name: "Lagemonitor öffnen", exact: true }).click(),
  ]);
  await fenster.waitForLoadState("domcontentloaded");
  // Ein Fernseher, kein Laptopfenster: Unter 800 px Höhe zeigt der Monitor nur eine Bewegungszeile
  // (bewegungenMax, Erfassungsbogen R10).
  await fenster.setViewportSize({ width: 1920, height: 1080 });
  await fenster.locator(BILD).waitFor({ state: "visible" });
  MONITOR.set(this, fenster);
});

Then("zeigt der Lagemonitor {string}", async function (this: EebWelt, text: string) {
  await monitor(this).locator(BILD).getByText(text).first().waitFor({ state: "visible" });
});

Then("zeigt der Lagemonitor {string} nicht", async function (this: EebWelt, text: string) {
  const treffer = monitor(this).locator(BILD).getByText(text);
  if ((await treffer.count()) > 0) throw new Error(`Der Lagemonitor zeigt „${text}“.`);
});

// ---------------------------------------------------------------- Ansicht des Monitors: Zeilen oder Tafel

/**
 * Eine volle Lage für die Tafel liegt im Gerätespeicher und ist die zuletzt geöffnete (support/sammlung.ts). Sie
 * ersetzt, was die Grundlage des Szenarios dorthin gelegt hat; ein Neuladen im Szenario setzt sie nicht zurück.
 */
Given("auf dem Gerät liegt eine Lage mit {int} Einheiten aus {int} Organisationen, viele mit Sofortbedarf", async function (this: EebWelt, einheiten: number, organisationen: number) {
  await tafelLageAufDemGeraet(this, einheiten, organisationen, 0);
});

/** Dieselbe Lage, die zuerst eingetroffenen Einheiten abgerückt: für die volle Randspalte (Bedarf, Abgerückt, Zuletzt). */
Given(
  "auf dem Gerät liegt eine Lage mit {int} Einheiten aus {int} Organisationen, viele mit Sofortbedarf, {int} davon abgerückt",
  async function (this: EebWelt, einheiten: number, organisationen: number, abgerueckt: number) {
    await tafelLageAufDemGeraet(this, einheiten, organisationen, abgerueckt);
  },
);

async function tafelLageAufDemGeraet(welt: EebWelt, einheiten: number, organisationen: number, abgerueckt: number): Promise<void> {
  const { einsaetze, einsatzId } = tafelLageSpeicher("Hochwasser Hunte", einheiten, organisationen, abgerueckt);
  await welt.page.addInitScript(
    ([e, id]) => {
      if (sessionStorage.getItem("prüfstand.tafellage")) return;
      sessionStorage.setItem("prüfstand.tafellage", "1");
      localStorage.setItem("eeb.einsaetze.v1", e);
      localStorage.setItem("eeb.letzterEinsatz.v1", JSON.stringify({ id, um: Date.now() }));
    },
    [einsaetze, einsatzId] as const,
  );
  await welt.oeffneApp();
}

/**
 * Eine Sammlung der Art „Einsatz" (die Vorgabe beim Anlegen) nur aus Übungsbögen: der Fall, in dem überall null steht.
 * Sie ist die zuletzt geöffnete; ein Neuladen im Szenario setzt sie nicht zurück.
 */
Given("auf dem Gerät liegt die Sammlung {string} mit {int} Übungsbögen", async function (this: EebWelt, name: string, anzahl: number) {
  const { einsaetze, einsatzId } = sammlungSpeicher(name, uebungsBoegen(anzahl));
  await this.page.addInitScript(
    ([e, id]) => {
      if (sessionStorage.getItem("prüfstand.uebung")) return;
      sessionStorage.setItem("prüfstand.uebung", "1");
      localStorage.setItem("eeb.einsaetze.v1", e);
      localStorage.setItem("eeb.letzterEinsatz.v1", JSON.stringify({ id, um: Date.now() }));
    },
    [einsaetze, einsatzId] as const,
  );
  await this.oeffneApp();
});

/** Die Übung vom Foto des Fernsehers (support/sammlung.ts), als Übung geführt; die zuletzt geöffnete Sammlung. */
Given("auf dem Gerät liegt die Übung vom Fernseher mit ihren langen Namen", async function (this: EebWelt) {
  const { einsaetze, einsatzId } = sammlungSpeicher("Übung Monitor 2", fernseherBoegen(), { art: EinsatzArt.UEBUNG });
  await this.page.addInitScript(
    ([e, id]) => {
      if (sessionStorage.getItem("prüfstand.fernseher")) return;
      sessionStorage.setItem("prüfstand.fernseher", "1");
      localStorage.setItem("eeb.einsaetze.v1", e);
      localStorage.setItem("eeb.letzterEinsatz.v1", JSON.stringify({ id, um: Date.now() }));
    },
    [einsaetze, einsatzId] as const,
  );
  await this.oeffneApp();
});

/**
 * Was von einem Namen auf der Tafel zu lesen ist: der volle Name, wenn er in seine Zeile passt, sonst seine Kurzform
 * (lagetafel-ui.tsx, `Herkunft`). Geprüft wird, dass der gesuchte so dasteht, ganz und ohne Auslassung.
 */
Then("steht auf der Tafel der Name {string}", async function (this: EebWelt, gesucht: string) {
  const namen = await monitor(this).evaluate<string[]>(`(() => {
    const messung = document.createRange();
    const ganz = (el) => { messung.selectNodeContents(el); return messung.getBoundingClientRect().width <= el.getBoundingClientRect().width + 0.01; };
    return Array.from(document.querySelectorAll("main.lt .lt-karte .lt-herkunft")).map((h) => {
      const lang = h.querySelector(".lt-herkunft-lang");
      const kasten = h.getBoundingClientRect();
      // Der volle Name steht in der ersten Zeile, wenn er passt; sonst ist er in die zweite umgebrochen, die nicht zu sehen ist.
      const form = lang && lang.getBoundingClientRect().top < kasten.bottom - 1 ? lang : (h.querySelector(".lt-herkunft-kurz") || h);
      const teile = Array.from(form.querySelectorAll(".lt-teil-weich, .lt-teil-fest"));
      if (!teile.every(ganz)) return "(gekürzt) " + form.textContent;
      return (form.textContent || "").replace(/\\s+/g, " ").trim();
    });
  })()`);
  if (!namen.includes(gesucht)) throw new Error(`„${gesucht}“ steht nicht ganz auf der Tafel. Zu lesen: ${namen.join(" | ")}`);
});

/** Ein Bogen-Link, wie ihn der Erfassungsbogen teilt, für einen als Übung gekennzeichneten Bogen. */
When("ich einen geteilten Bogen-Link eines Übungsbogens öffne", async function (this: EebWelt) {
  await this.oeffneApp(uebungsBogenFragment());
});

/** Übungsmeldungen einer echten Lage stehen als knappe Zeilen in der Gruppe „Übung" (lagetafel-ui.tsx), nicht als Karten. */
Then("zeigt die Tafel {int} Übungsmeldungen als Zeilen", async function (this: EebWelt, anzahl: number) {
  await monitor(this).waitForFunction(
    (n) => document.querySelectorAll("main.lt .lt-uebung-zeile").length === n && document.querySelector("main.lt .lt-gruppe-uebung") != null,
    anzahl,
  );
});

Then("zeigt die Tafel keine Übungsmeldung", async function (this: EebWelt) {
  await monitor(this).waitForFunction(
    () => document.querySelectorAll("main.lt .lt-karte").length > 0 && document.querySelector("main.lt .lt-uebung-zeile, main.lt .lt-gruppe-uebung") == null,
  );
});

/** Die Gesamtstärke im Kopf der Tafel, die Zahl, die vorgelesen wird. */
Then("zeigt die Tafel die Gesamtstärke {int}", async function (this: EebWelt, gesamt: number) {
  await monitor(this).waitForFunction((g) => document.querySelector("main.lt .lt-m-gesamt .lt-m-ziffern")?.textContent === String(g), gesamt);
});

/** Ein kleinerer Fernseher: Das Monitor-Fenster bekommt eine andere Größe; die Tafel setzt sich neu. */
When("ich den Fernseher auf {int} x {int} stelle", async function (this: EebWelt, breite: number, hoehe: number) {
  const seite = monitor(this);
  await seite.setViewportSize({ width: breite, height: hoehe });
  // Der Satz rechnet nach der neuen Größe; die Randspalte misst nach. Kurz warten, bis zwei Bilder gleich sind.
  await seite.evaluate(() => new Promise((fertig) => requestAnimationFrame(() => requestAnimationFrame(() => fertig(true)))));
  await seite.waitForTimeout(300);
});

/**
 * Die Randspalte der Tafel hat eine Rangfolge: Datenstand und Bedienung stehen immer im Bild; der weichende Block
 * „Zuletzt" steht nie angeschnitten da, sondern mindestens mit seiner Überschrift oder gar nicht, und in keiner Liste der
 * Randspalte steht eine Zeile halb.
 *
 * Vorgefallen (Gegenprüfung): Bei voller Lage blieben von „Zuletzt" sechs Pixel Text über dem Fuß. Als Text übergeben,
 * nicht als Funktion mit inneren Hilfsfunktionen (support/haken.ts).
 */
Then("steht die Randspalte der Tafel geordnet im Bild", async function (this: EebWelt) {
  const befund = await monitor(this).evaluate<string[]>(`(() => {
    const fehler = [];
    const kasten = (el) => el.getBoundingClientRect();
    const huelle = document.querySelector("main.lt .lt-rand-inhalt");
    if (!huelle) return ["keine Randspalte"];
    const h = kasten(huelle);
    for (const knopf of document.querySelectorAll("main.lt .lt-bedienung button")) {
      const k = kasten(knopf);
      if (k.bottom > window.innerHeight + 0.5 || k.right > window.innerWidth + 0.5) fehler.push("Knopf „" + knopf.textContent + "“ liegt außerhalb des Bilds");
    }
    for (const block of huelle.querySelectorAll(".lt-block")) {
      const titel = block.querySelector("h2");
      const k = kasten(titel);
      if (k.height < 1 || k.top < h.top - 0.5 || k.bottom > h.bottom + 0.5) fehler.push("Überschrift „" + titel.textContent + "“ ist angeschnitten");
      if (kasten(block).bottom > h.bottom + 0.5 && !block.classList.contains("lt-block-zuletzt")) fehler.push("Block „" + titel.textContent + "“ ragt unter die Randspalte");
    }
    for (const liste of huelle.querySelectorAll(".lt-abgaenge, .lt-bewegungen")) {
      const fenster = kasten(liste);
      const unten = Math.min(fenster.bottom, h.bottom);
      for (const eintrag of liste.children) {
        const k = kasten(eintrag);
        // In „Zuletzt" bricht, was nicht passt, in eine zweite Spalte rechts außerhalb um: Die zählt nicht.
        if (k.left >= fenster.right - 1 || k.top >= unten - 1) continue;
        if (k.bottom > unten + 0.6) fehler.push("Eintrag „" + eintrag.textContent.trim().slice(0, 40) + "“ steht halb da");
      }
    }
    return fehler;
  })()`);
  if (befund.length > 0) throw new Error(`Randspalte nicht geordnet: ${befund.slice(0, 8).join("; ")}${befund.length > 8 ? ` (und ${befund.length - 8} weitere)` : ""}`);
});

/** Die Wahl in der Einsatzansicht, Block „Lagemonitor für den Fernseher". */
When("ich für den Fernseher die Darstellung {string} wähle", async function (this: EebWelt, name: string) {
  await this.page.getByRole("group", { name: "Darstellung am Fernseher" }).getByRole("radio", { name: new RegExp(`^${name}`) }).check();
});

Then("ist für den Fernseher die Darstellung {string} gewählt", async function (this: EebWelt, name: string) {
  const wahl = this.page.getByRole("group", { name: "Darstellung am Fernseher" }).getByRole("radio", { name: new RegExp(`^${name}`) });
  // Die Wahl kommt über das Speicher-Ereignis aus dem Monitor-Fenster: kurz warten, statt sofort zu lesen.
  await this.page.waitForFunction((el) => (el as HTMLInputElement | null)?.checked === true, await wahl.elementHandle());
});

When("ich im Lagemonitor auf {string} klicke", async function (this: EebWelt, name: string) {
  await monitor(this).getByRole("button", { name, exact: true }).click();
});

Then("zeigt der Lagemonitor die Tafel", async function (this: EebWelt) {
  await monitor(this).locator("main.lt").waitFor({ state: "visible" });
  if ((await monitor(this).locator("main.lm").count()) > 0) throw new Error("Der Lagemonitor zeigt noch die Zeilen.");
});

Then("zeigt der Lagemonitor die Zeilen", async function (this: EebWelt) {
  await monitor(this).locator("main.lm").waitFor({ state: "visible" });
  if ((await monitor(this).locator("main.lt").count()) > 0) throw new Error("Der Lagemonitor zeigt noch die Tafel.");
});

/**
 * Das Zeichen kommt aus einem nachgeladenen Brocken und steht als data:-Adresse im Bild: Geprüft wird, dass es im
 * gebauten Stand ankommt und der Browser es unter der CSP auch zeichnet (Bildbreite größer null).
 */
Then("trägt jede Einheit der Tafel ihr taktisches Zeichen", async function (this: EebWelt) {
  const seite = monitor(this);
  await seite.waitForFunction(() => {
    const karten = document.querySelectorAll("main.lt .lt-karte");
    const bilder = Array.from(document.querySelectorAll<HTMLImageElement>('main.lt .lt-karte .lt-zeichen img[data-zeichen="geladen"]'));
    return karten.length > 0 && bilder.length === karten.length && bilder.every((b) => b.complete && b.naturalWidth > 0);
  });
});

/**
 * Was jsdom nicht rechnen kann: Der Satz der Tafel (lagetafel.ts) und die Stilvorlage müssen im Browser dasselbe
 * ergeben. Jede Karte steht ganz in der Fläche, kein Name einer Einheit ist abgeschnitten, jede Zelle hat die
 * gerechnete Höhe und den gerechneten Abstand, und die Seite rollt nicht.
 */
Then("stehen alle Einheiten der Tafel ganz im Bild", async function (this: EebWelt) {
  const befund = await monitor(this).evaluate(() => {
    const flaeche = document.querySelector("main.lt .lt-flaeche")!.getBoundingClientRect();
    const fehler: string[] = [];
    // Gekürzt ist ein Feld, dessen Text breiter ist als sein Kasten, auch nur um Bruchteile eines Pixels: Schon die lösen die
    // Auslassung aus, „scrollWidth" rundet sie weg.
    const messung = document.createRange();
    // Karten und die Zeilen der Übungsmeldungen stehen in der Fläche; abgeschnitten sein darf der Name nur in einer Zeile.
    for (const karte of Array.from(document.querySelectorAll<HTMLElement>("main.lt .lt-karte, main.lt .lt-uebung-zeile"))) {
      const r = karte.getBoundingClientRect();
      const name = karte.querySelector<HTMLElement>(".lt-herkunft")!;
      // Hat der Name eine Kurzform, steht sie in der Hülle neben dem vollen Namen; genannt wird der volle.
      const text = (name.querySelector(".lt-herkunft-lang") ?? name).textContent;
      if (r.top < flaeche.top - 1 || r.bottom > flaeche.bottom + 1 || r.left < flaeche.left - 1 || r.right > flaeche.right + 1) {
        fehler.push(`„${text}“ ragt aus der Fläche`);
      }
      // Der Name besteht aus Teilen (Organisation und Standort); gekürzt wird der „weiche", erkennbar an seinem Überlauf.
      // Mit Kurzform zählt deren Teil: Der volle Name weicht ihr ganz, gekürzt wäre erst sie.
      const weich = Array.from(name.querySelectorAll<HTMLElement>(".lt-teil-weich"));
      if (
        karte.classList.contains("lt-karte") &&
        weich.some((teil) => {
          messung.selectNodeContents(teil);
          return messung.getBoundingClientRect().width > teil.getBoundingClientRect().width + 0.01;
        })
      ) {
        fehler.push(`„${text}“ ist abgeschnitten`);
      }
    }
    // Rechnung und Stilvorlage müssen dieselben Maße ergeben: Höhe jeder Zelle und ihr Abstand zur Zelle darüber.
    // Ohne benannte Hilfsfunktion: tsx hängt solchen einen Helfer an, den es im Browser nicht gibt (siehe support/haken.ts).
    const stil = document.querySelector<HTMLElement>("main.lt")!.style;
    const schrift = parseFloat(stil.getPropertyValue("--lt-f"));
    const kopfHoehe = parseFloat(stil.getPropertyValue("--lt-kopf-h")) * schrift;
    const kartenHoehe = parseFloat(stil.getPropertyValue("--lt-karte-h")) * schrift;
    const abgangHoehe = parseFloat(stil.getPropertyValue("--lt-abgang-h")) * schrift;
    const absatz = parseFloat(stil.getPropertyValue("--lt-absatz")) * schrift;
    const fuge = parseFloat(stil.getPropertyValue("--lt-fuge")) * schrift;
    for (const spalte of Array.from(document.querySelectorAll("main.lt .lt-spalte"))) {
      const zellen = Array.from(spalte.children) as HTMLElement[];
      zellen.forEach((zelle, i) => {
        const kopf = zelle.classList.contains("lt-gruppe");
        const r = zelle.getBoundingClientRect();
        const hoehe = kopf ? kopfHoehe : zelle.classList.contains("lt-karte") ? kartenHoehe : abgangHoehe;
        if (Math.abs(r.height - hoehe) > 0.6) fehler.push(`Zelle ${i + 1} ist ${r.height.toFixed(1)} px hoch, gerechnet sind ${hoehe.toFixed(1)}`);
        if (i === 0) return;
        const abstand = r.top - zellen[i - 1]!.getBoundingClientRect().bottom;
        const soll = kopf ? absatz : fuge;
        if (Math.abs(abstand - soll) > 0.6) fehler.push(`Abstand über Zelle ${i + 1} ist ${abstand.toFixed(1)} px, gerechnet sind ${soll.toFixed(1)}`);
      });
    }
    const seite = document.documentElement;
    if (seite.scrollHeight > window.innerHeight + 1 || seite.scrollWidth > window.innerWidth + 1) fehler.push("die Seite rollt");
    return fehler;
  });
  if (befund.length > 0) throw new Error(`Tafel passt nicht ins Bild: ${befund.join("; ")}`);
});

/**
 * Uhrzeit relativ zur Uhr der Seite: Der Prüfstand stellt sie auf einen festen
 * Tag, die Zeitzone kommt vom Rechner. So trifft „vor 60 Minuten" überall.
 */
When(
  "ich in das Feld {string} die Uhrzeit vor {int} Minuten eintrage",
  async function (this: EebWelt, name: string, minuten: number) {
    const wert = await this.page.evaluate((m) => {
      const d = new Date(Date.now() - m * 60_000);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    }, minuten);
    await this.page.locator("main").getByLabel(name, { exact: true }).fill(wert);
  },
);

/** Datum und Uhrzeit für ein `datetime-local`-Feld, relativ zur Uhr der Seite. */
When(
  "ich im Feld {string} Datum und Uhrzeit in {int} Stunden eintrage",
  async function (this: EebWelt, name: string, stunden: number) {
    // Als Text, nicht als Funktion mit innerer Hilfsfunktion: tsx hängt ihr einen __name-Helfer an,
    // den es im Browser nicht gibt (vgl. support/haken.ts).
    const wert = await this.page.evaluate<string>(
      `(() => { const d = new Date(Date.now() + ${stunden} * 3600000); const z = (n) => String(n).padStart(2, "0");` +
        " return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`; })()",
    );
    await this.page.locator("main").getByLabel(name).first().fill(wert);
  },
);

// Browser- bzw. Geräte-Zurück (Audit Meldekopf R1, Fehler F6). Über die Seite statt page.goBack():
// Ein Sprung innerhalb des Dokuments lädt nichts, auf das Playwright warten könnte.
When("ich im Browser zurückgehe", async function (this: EebWelt) {
  await this.page.evaluate("history.back()");
});

When("ich im Browser vorgehe", async function (this: EebWelt) {
  await this.page.evaluate("history.forward()");
});

Then("ist die App noch offen", async function (this: EebWelt) {
  // Kurz warten: Ein Verlassen der Seite meldet sich nicht sofort.
  await this.page.waitForTimeout(300);
  const adresse = this.page.url();
  if (!adresse.startsWith(this.basisUrl)) throw new Error(`Die App ist verlassen: ${adresse}`);
  await this.page.locator("#app main").first().waitFor({ state: "visible" });
});

// Der Knopf trägt unter dem Namen das Alter der letzten Meldung („vor 3 Min"); gesucht wird nach dem Anfang.
When("ich die Sammlung {string} auf der Startseite öffne", async function (this: EebWelt, name: string) {
  await this.page.locator("button.sammlung-oeffnen").filter({ hasText: new RegExp(`„${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[“"] öffnen`) }).first().click();
});

// Am Telefon soll eine Spalte ohne seitliches Wischen im Bild stehen (Audit Meldekopf R1, Tabelle mit 22 Spalten).
Then("steht die Tabellenspalte {string} ohne Wischen im Bild", async function (this: EebWelt, titel: string) {
  const kopf = this.page.locator("table.einheiten-tabelle thead th").filter({ hasText: titel }).first();
  await kopf.waitFor({ state: "visible" });
  const rahmen = await kopf.boundingBox();
  const breite = this.page.viewportSize()?.width ?? 0;
  if (!rahmen || rahmen.x + rahmen.width > breite) {
    throw new Error(`Die Spalte „${titel}" liegt außerhalb des Bildes (rechts bei ${rahmen ? Math.round(rahmen.x + rahmen.width) : "?"} px, Bild ${breite} px).`);
  }
});

// Nachts trägt die Form den Unterschied zwischen Warnung und Hinweis, nicht nur die Farbe (Audit Meldekopf R1, Nacht 2).
function marke(welt: EebWelt, text: string) {
  return welt.page.locator(".einheit-zeile :is(.alt-badge, .neu-badge, .uebung-badge, .bedarf-marke)").filter({ hasText: text }).first();
}

Then("trägt die Marke {string} ein Warnzeichen", async function (this: EebWelt, text: string) {
  const m = marke(this, text);
  await m.waitFor({ state: "visible" });
  const vorne = await m.evaluate((el) => getComputedStyle(el, "::before").content);
  if (!vorne.includes("⚠")) throw new Error(`„${text}" trägt kein Warnzeichen (::before ${vorne}).`);
});

Then("ist die Marke {string} nicht farbig gefüllt", async function (this: EebWelt, text: string) {
  const m = marke(this, text);
  await m.waitFor({ state: "visible" });
  const fond = await m.evaluate((el) => getComputedStyle(el).backgroundColor);
  if (!/rgba\(0, 0, 0, 0\)|transparent/.test(fond)) throw new Error(`„${text}" ist gefüllt (${fond}).`);
});

// Nachts lag der Dialog auf gleicher Fläche wie die Seite, die Abdunklung war unsichtbar (Audit Meldekopf R1, Nacht 3).
Then("dunkelt das offene Fenster die Seite deutlich ab", async function (this: EebWelt) {
  const werte = await this.page.locator("dialog[open]").last().evaluate((d) => ({
    abdunklung: getComputedStyle(d, "::backdrop").backgroundColor,
    fenster: getComputedStyle(d).backgroundColor,
    seite: getComputedStyle(document.body).backgroundColor,
  }));
  const deckkraft = Number(/rgba\(\d+, \d+, \d+, ([\d.]+)\)/.exec(werte.abdunklung)?.[1] ?? "0");
  if (deckkraft < 0.6) throw new Error(`Abdunklung zu schwach: ${werte.abdunklung}`);
  if (werte.fenster === werte.seite) throw new Error(`Fenster und Seite haben dieselbe Fläche: ${werte.fenster}`);
});

/**
 * Auf der vollen Tafel überdeckt keine Angabe einer Karte eine andere, nichts ragt aus seiner Karte, und im
 * Gruppenkopf sind Name, „(Fortsetzung)", Zahl der Einheiten und Stärke nebeneinander zu sehen.
 *
 * Vorgefallen: Bedarfsmarken liefen bei vielen Einheiten nach links über Typ, Funkrufname und Zeichen; der Kopf einer
 * fortgesetzten Gruppe brach um, „(Fortsetzung)" lag unter seiner Kante. Als Text übergeben, nicht als Funktion mit
 * inneren Hilfsfunktionen: tsx hängt ihnen einen __name-Helfer an, den es im Browser nicht gibt (support/haken.ts).
 */
Then("überdeckt auf der Tafel keine Angabe eine andere", async function (this: EebWelt) {
  const befund = await monitor(this).evaluate<string[]>(`(() => {
    const fehler = [];
    const kasten = (el) => el.getBoundingClientRect();
    const sichtbar = (el) => { const k = kasten(el); return k.width > 0 && k.height > 0; };
    const schneidet = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.6 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.6;
    const karten = Array.from(document.querySelectorAll("main.lt .lt-karte"));
    const zeilen = Array.from(document.querySelectorAll("main.lt .lt-uebung-zeile"));
    if (karten.length + zeilen.length === 0) fehler.push("weder Karte noch Zeile auf der Tafel");
    // Der volle Name; hat er eine Kurzform, steht sie daneben in derselben Hülle.
    const nameVon = (el) => (el.querySelector(".lt-herkunft-lang") || el.querySelector(".lt-herkunft")).textContent;
    // Gekürzt ist ein Feld, dessen Text breiter ist als sein Kasten, auch nur um Bruchteile eines Pixels: Schon die lösen die
    // Auslassung aus („T… (Fortsetzung)“ stand bei 0,03 px da), „scrollWidth“ rundet sie weg.
    const messung = document.createRange();
    const gekuerzt = (el) => { messung.selectNodeContents(el); return messung.getBoundingClientRect().width > kasten(el).width + 0.01; };
    for (const zeile of zeilen) {
      const name = nameVon(zeile);
      const teile = Array.from(zeile.querySelectorAll(".lt-herkunft, .lt-uebung-typ, .lt-staerke")).filter(sichtbar);
      const rand = kasten(zeile);
      teile.forEach((teil, i) => {
        const k = kasten(teil);
        if (k.left < rand.left - 0.6 || k.right > rand.right + 0.6 || k.top < rand.top - 0.6 || k.bottom > rand.bottom + 0.6) fehler.push(teil.className + " ragt aus der Zeile „" + name + "“");
        for (const anderes of teile.slice(i + 1)) if (schneidet(k, kasten(anderes))) fehler.push(teil.className + " und " + anderes.className + " überdecken sich in der Zeile „" + name + "“");
      });
    }
    for (const karte of karten) {
      const name = nameVon(karte) + " " + (karte.querySelector(".lt-typ-lang")?.textContent ?? karte.querySelector(".lt-typ")?.textContent ?? "");
      const teile = Array.from(karte.querySelectorAll(".lt-zeichen, .lt-herkunft, .lt-staerke, .lt-typ, .lt-funkruf, .lt-auftrag-text, .lt-marke, .lt-stand")).filter(sichtbar);
      const rand = kasten(karte);
      teile.forEach((teil, i) => {
        const k = kasten(teil);
        if (k.left < rand.left - 0.6 || k.right > rand.right + 0.6 || k.top < rand.top - 0.6 || k.bottom > rand.bottom + 0.6) fehler.push(teil.className + " ragt aus der Karte „" + name + "“");
        for (const anderes of teile.slice(i + 1)) {
          if (schneidet(k, kasten(anderes))) fehler.push(teil.className + " und " + anderes.className + " überdecken sich bei „" + name + "“");
        }
      });
      // Eine Marke, von der nichts zu lesen bleibt, wäre so gut wie keine.
      for (const marke of karte.querySelectorAll(".lt-marke")) if (kasten(marke).width < 14) fehler.push("Marke ohne Platz bei „" + name + "“");
    }
    for (const kopf of document.querySelectorAll("main.lt .lt-gruppe")) {
      const rand = kasten(kopf);
      const teile = Array.from(kopf.querySelectorAll(".lt-gruppe-name, .lt-fortsetzung, .lt-gruppe-zahl, .lt-staerke, .lt-gruppe-ohne")).filter(sichtbar);
      const titel = kopf.querySelector("h3").textContent;
      if (kopf.querySelector(".lt-fortsetzung") && !teile.some((t) => t.classList.contains("lt-fortsetzung"))) fehler.push("„(Fortsetzung)“ fehlt im Kopf „" + titel + "“");
      // Die Zahl der Einheiten weicht vor dem Namen: Auf dem Fernseher stand „T… (Fortsetzung)“ neben „11 Einheiten“.
      const gruppe = kopf.querySelector(".lt-gruppe-name");
      const zahl = kopf.querySelector(".lt-gruppe-zahl");
      if (gruppe && gekuerzt(gruppe) && zahl && kasten(zahl).width > 2) fehler.push("Im Kopf „" + titel + "“ ist der Name gekürzt, während die Zahl der Einheiten daneben steht");
      teile.forEach((teil, i) => {
        const k = kasten(teil);
        if (k.bottom > rand.bottom + 0.6 || k.right > rand.right + 0.6) fehler.push(teil.className + " liegt außerhalb des Kopfs „" + titel + "“");
        for (const anderes of teile.slice(i + 1)) if (schneidet(k, kasten(anderes))) fehler.push("Im Kopf „" + titel + "“ überdecken sich " + teil.className + " und " + anderes.className);
      });
    }
    return fehler;
  })()`);
  if (befund.length > 0) throw new Error(`Die Tafel überdeckt oder verliert Angaben: ${befund.slice(0, 8).join("; ")}${befund.length > 8 ? ` (und ${befund.length - 8} weitere)` : ""}`);
});
