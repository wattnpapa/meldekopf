/**
 * Schritte der Schnellerfassung: eine Einheit ohne Bogen in den offenen
 * Einsatz aufnehmen.
 *
 * Herkunft: Erfassungsbogen `features/schritte/bogen.steps.ts` (Commit
 * 441811c), „ich die Einheit … manuell in den Einsatz aufnehme". Anders hier:
 * Die Schnellerfassung ist eine Seite ohne Schritte, „In Einsatz übernehmen"
 * steht in der festen Leiste; der Sprung zu „6. Übersicht" entfällt.
 */
import { When } from "@cucumber/cucumber";
import type { Page } from "playwright";
import type { EebWelt } from "../support/welt";

async function manuellAufnehmen(page: Page, organisation: string, name: string): Promise<void> {
  await page.getByRole("button", { name: "Einheit manuell erfassen…", exact: true }).click();
  await page.getByRole("heading", { name: "Einheit erfassen" }).waitFor({ state: "visible" });
  await page.locator("main").getByLabel("Organisation", { exact: true }).selectOption({ label: organisation });
  await page.locator("main").locator("label").filter({ hasText: /^Ort der Einheit \(Pflicht\)/ }).locator("input").first().fill(name);
  await page.getByRole("button", { name: "In Einsatz übernehmen", exact: true }).click();
  // Ohne Stärke fragt die App seit R3-N1 nach; die Aufbau-Einheiten führen
  // bewusst keine Stärke, die Rückfrage wird mit Stärke 0 bestätigt.
  const rueckfrage = page.getByRole("dialog", { name: "Stärke fehlt" });
  await rueckfrage.waitFor({ state: "visible" });
  await rueckfrage.getByRole("button", { name: "Trotzdem mit Stärke 0 übernehmen", exact: true }).click();
  await page.getByRole("heading", { name: /^Einheiten \(/ }).waitFor({ state: "visible" });
}

/**
 * Zweites Fenster derselben App (installierte App und Browser, R2-O4): Es
 * öffnet dieselbe Sammlung, nimmt eine Einheit auf und schließt wieder. Das
 * erste Fenster bleibt dabei unberührt offen.
 */
When(
  "in einem zweiten Fenster die Einheit {string} {string} manuell aufgenommen wird",
  async function (this: EebWelt, organisation: string, name: string) {
    const zweites = await this.page.context().newPage();
    await zweites.goto(this.page.url(), { waitUntil: "domcontentloaded" });
    await manuellAufnehmen(zweites, organisation, name);
    await zweites.close();
  },
);

When(
  "ich die Einheit {string} {string} manuell in den Einsatz aufnehme",
  async function (this: EebWelt, organisation: string, name: string) {
    await manuellAufnehmen(this.page, organisation, name);
  },
);
