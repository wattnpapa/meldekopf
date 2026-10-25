/**
 * Fachliche Schritte: App öffnen, Schaltflächen, Überschriften, eigene Dialoge.
 *
 * Herkunft: Erfassungsbogen `features/schritte/bogen.steps.ts` (Commit
 * f2b77f1), die allgemeinen Schritte. Die Bogen-, Link- und Einsatz-Schritte
 * kommen mit den Ansichten (Phasen 2 bis 4) unverändert nach.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import type { EebWelt } from "../support/welt";

Given("ich öffne die App", async function (this: EebWelt) {
  await this.oeffneApp();
});

/**
 * Schaltfläche über ihre volle Beschriftung. Bewusst `exact`: bei Teiltreffern
 * fängt „Löschen" auch „Alle Daten löschen" aus der Fußzeile ein — ein Klick,
 * der nicht gemeint war, ist schlimmer als ein Schritt, der die Beschriftung
 * ausschreiben muss.
 */
function schaltflaeche(welt: EebWelt, name: string) {
  return welt.page.getByRole("button", { name, exact: true });
}

When("ich auf {string} klicke", async function (this: EebWelt, name: string) {
  await schaltflaeche(this, name).click();
});

Then("sehe ich die Überschrift {string}", async function (this: EebWelt, text: string) {
  await this.page.getByRole("heading", { name: text }).first().waitFor({ state: "visible" });
});

Then("sehe ich die Schaltfläche {string}", async function (this: EebWelt, name: string) {
  await schaltflaeche(this, name).waitFor({ state: "visible" });
});

Then("sehe ich den Text {string}", async function (this: EebWelt, text: string) {
  await this.page.getByText(text, { exact: true }).first().waitFor({ state: "visible" });
});

Then("sehe ich den Link {string}", async function (this: EebWelt, name: string) {
  await this.page.getByRole("link", { name, exact: true }).first().waitFor({ state: "visible" });
});

// ---------------------------------------------------- Eigene Dialoge der App

/** Der offene Dialog — Abfragen der App tragen ihren Titel als aria-label. */
function dialog(welt: EebWelt, titel: string) {
  return welt.page.getByRole("dialog", { name: titel });
}

/** Der zuletzt geöffnete Dialog; „im Dialog"-Schritte beziehen sich darauf. */
function offenerDialog(welt: EebWelt) {
  return welt.page.locator("dialog[open]").last();
}

Then("sehe ich den Dialog {string}", async function (this: EebWelt, titel: string) {
  await dialog(this, titel).waitFor({ state: "visible" });
});

When("ich im Dialog auf {string} klicke", async function (this: EebWelt, name: string) {
  await offenerDialog(this).getByRole("button", { name }).click();
});

When("ich im Dialog {string} ankreuze", async function (this: EebWelt, name: string) {
  await offenerDialog(this).getByLabel(name, { exact: true }).check();
});

When("ich den Dialog mit Esc schließe", async function (this: EebWelt) {
  await this.page.keyboard.press("Escape");
});

Then("ist kein Dialog offen", async function (this: EebWelt) {
  await this.page.locator("dialog[open]").waitFor({ state: "detached" });
});

Then("sehe ich {string} nicht", async function (this: EebWelt, text: string) {
  await this.page.getByText(text, { exact: true }).waitFor({ state: "hidden" });
});
