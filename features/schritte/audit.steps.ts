/**
 * Schritte der gemeinsamen Audit-Runde nach Runde 1 des Meldekopfs (offene
 * P2/P3, docs/audits/runde-1/README.md): Lagemonitor im zweiten Fenster,
 * Zeiten relativ zur Uhr der Seite, Browser-Zurück.
 *
 * Neu im Meldekopf; kein Gegenstück im Erfassungsbogen.
 */
import { Then, When } from "@cucumber/cucumber";
import type { Page } from "playwright";
import type { EebWelt } from "../support/welt";

const MONITOR = new WeakMap<EebWelt, Page>();

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
  await fenster.locator("main.lm").waitFor({ state: "visible" });
  MONITOR.set(this, fenster);
});

Then("zeigt der Lagemonitor {string}", async function (this: EebWelt, text: string) {
  await monitor(this).locator("main.lm").getByText(text).first().waitFor({ state: "visible" });
});

Then("zeigt der Lagemonitor {string} nicht", async function (this: EebWelt, text: string) {
  const treffer = monitor(this).locator("main.lm").getByText(text);
  if ((await treffer.count()) > 0) throw new Error(`Der Lagemonitor zeigt „${text}“.`);
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
  await this.page.locator("button.sammlung-oeffnen").filter({ hasText: `„${name}" öffnen` }).first().click();
});
