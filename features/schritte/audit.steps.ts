/**
 * Schritte der gemeinsamen Audit-Runde nach Runde 1 des Meldekopfs (offene
 * P2/P3, docs/audits/runde-1/README.md): Lagemonitor im zweiten Fenster,
 * Zeiten relativ zur Uhr der Seite, Browser-Zurück.
 *
 * Neu im Meldekopf; kein Gegenstück im Erfassungsbogen.
 */
import { Given, Then, When } from "@cucumber/cucumber";
import type { Page } from "playwright";
import { tafelLageSpeicher } from "../support/sammlung";
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
Given("auf dem Gerät liegt eine Lage mit {int} Einheiten in {int} Zügen, viele mit Sofortbedarf", async function (this: EebWelt, einheiten: number, zuege: number) {
  const { einsaetze, einsatzId } = tafelLageSpeicher("Hochwasser Hunte", einheiten, zuege);
  await this.page.addInitScript(
    ([e, id]) => {
      if (sessionStorage.getItem("prüfstand.tafellage")) return;
      sessionStorage.setItem("prüfstand.tafellage", "1");
      localStorage.setItem("eeb.einsaetze.v1", e);
      localStorage.setItem("eeb.letzterEinsatz.v1", JSON.stringify({ id, um: Date.now() }));
    },
    [einsaetze, einsatzId] as const,
  );
  await this.oeffneApp();
});

/** Die Wahl in der Einsatzansicht, Block „Lagemonitor für den Fernseher". */
When("ich für den Fernseher die Ansicht {string} wähle", async function (this: EebWelt, name: string) {
  await this.page.getByRole("group", { name: "Ansicht am Fernseher" }).getByRole("radio", { name: new RegExp(`^${name}`) }).check();
});

Then("ist für den Fernseher die Ansicht {string} gewählt", async function (this: EebWelt, name: string) {
  const wahl = this.page.getByRole("group", { name: "Ansicht am Fernseher" }).getByRole("radio", { name: new RegExp(`^${name}`) });
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
    for (const karte of Array.from(document.querySelectorAll<HTMLElement>("main.lt .lt-karte"))) {
      const r = karte.getBoundingClientRect();
      const name = karte.querySelector<HTMLElement>(".lt-herkunft")!;
      if (r.top < flaeche.top - 1 || r.bottom > flaeche.bottom + 1 || r.left < flaeche.left - 1 || r.right > flaeche.right + 1) {
        fehler.push(`„${name.textContent}“ ragt aus der Fläche`);
      }
      if (name.scrollWidth > name.clientWidth + 1) fehler.push(`„${name.textContent}“ ist abgeschnitten`);
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
    if (karten.length === 0) fehler.push("keine Karte auf der Tafel");
    for (const karte of karten) {
      const name = karte.querySelector(".lt-herkunft").textContent + " " + (karte.querySelector(".lt-typ")?.textContent ?? "");
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
      const teile = Array.from(kopf.querySelectorAll(".lt-gruppe-name, .lt-fortsetzung, .lt-gruppe-zahl, .lt-staerke")).filter(sichtbar);
      const titel = kopf.querySelector("h3").textContent;
      if (kopf.querySelector(".lt-fortsetzung") && !teile.some((t) => t.classList.contains("lt-fortsetzung"))) fehler.push("„(Fortsetzung)“ fehlt im Kopf „" + titel + "“");
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
