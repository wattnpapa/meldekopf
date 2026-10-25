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
import type { EebWelt } from "../support/welt";

When(
  "ich die Einheit {string} {string} manuell in den Einsatz aufnehme",
  async function (this: EebWelt, organisation: string, name: string) {
    await this.page.getByRole("button", { name: "Einheit manuell erfassen…", exact: true }).click();
    await this.page.getByRole("heading", { name: "Einheit erfassen" }).waitFor({ state: "visible" });
    await this.page.locator("main").getByLabel("Organisation", { exact: true }).selectOption({ label: organisation });
    await this.page
      .locator("main")
      .locator("label")
      .filter({ hasText: /^Ort der Einheit \(Pflicht\)/ })
      .locator("input")
      .first()
      .fill(name);
    await this.page.getByRole("button", { name: "In Einsatz übernehmen", exact: true }).click();
    // Ohne Stärke fragt die App seit R3-N1 nach; die Aufbau-Einheiten führen
    // bewusst keine Stärke, die Rückfrage wird mit Stärke 0 bestätigt.
    const rueckfrage = this.page.getByRole("dialog", { name: "Stärke fehlt" });
    await rueckfrage.waitFor({ state: "visible" });
    await rueckfrage.getByRole("button", { name: "Trotzdem mit Stärke 0 übernehmen", exact: true }).click();
    await this.page.getByRole("heading", { name: /^Einheiten \(/ }).waitFor({ state: "visible" });
  },
);
