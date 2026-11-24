/**
 * Schritte zur Kopplung zweier Geräte (neu im Meldekopf, ADR-009).
 *
 * Das zweite Gerät ist ein eigenes Browser-Profil desselben Browsers: eigener
 * Speicher, eigene Seite. Die Verbindung zwischen beiden baut der Browser
 * wirklich auf (WebRTC über die lokale Schleife). Die Codes wandern über den
 * Handscanner-Weg des Scanners: getippt und mit der Eingabetaste abgeschlossen.
 */
import { After, Given, Then, When } from "@cucumber/cucumber";
import type { Page } from "playwright";
import { deflateRaw, inflateRaw } from "pako";
import { EEB_URL_PREFIX, encodePayloadUrl } from "../../vendor/eeb-format/src/codec";
import { OrganisationsTyp } from "../../vendor/eeb-format/src/model";
import { V2_FRAGMENT } from "../fixtures";
import { PRUEFSTAND_ZEIT } from "../support/haken";
import { weitereEinheit } from "../support/sammlung";
import type { EebWelt } from "../support/welt";

const KOMPRESSOR = { deflateRaw: (d: Uint8Array) => deflateRaw(d), inflateRaw: (d: Uint8Array) => inflateRaw(d) };

const zweite = new WeakMap<EebWelt, Page>();

function zweitesGeraet(welt: EebWelt): Page {
  const seite = zweite.get(welt);
  if (!seite) throw new Error("Das Szenario hat kein zweites Gerät geöffnet.");
  return seite;
}

/** Wie ein USB-Handscanner: der Code als schnelle Tastenfolge in den offenen Scanner, dann die Eingabetaste. */
async function scannen(seite: Page, text: string): Promise<void> {
  await seite.locator("dialog.scanner[open]").waitFor();
  // Der Lauscher des Scanners hängt nach dem ersten Bild; ein Tastendruck davor ginge verloren.
  await seite.waitForTimeout(300);
  await seite.keyboard.type(text, { delay: 2 });
  await seite.keyboard.press("Enter");
}

async function codeVon(seite: Page, art: "angebot" | "antwort"): Promise<string> {
  const bild = seite.locator(`dialog.kopplung-dialog[data-art=${art}] img[data-code]`);
  await bild.waitFor();
  return (await bild.getAttribute("data-code")) ?? "";
}

function leiste(seite: Page) {
  return seite.locator(".kopplung-leiste");
}

/** Wartet, bis die Leiste den Text trägt: Der Verbindungsaufbau und das Erkennen einer Trennung brauchen ihre Zeit. */
async function leisteMit(seite: Page, text: string): Promise<void> {
  await leiste(seite).filter({ hasText: text }).waitFor({ state: "visible", timeout: 25_000 });
}

async function koppeln(welt: EebWelt): Promise<void> {
  const b = zweitesGeraet(welt);
  await welt.page.getByRole("button", { name: "Zweites Gerät koppeln…" }).click();
  const angebot = await codeVon(welt.page, "angebot");
  await b.getByRole("button", { name: "Bogen scannen…" }).click();
  await scannen(b, angebot);
  const antwort = await codeVon(b, "antwort");
  await welt.page.getByRole("button", { name: "Antwort scannen…" }).click();
  await scannen(welt.page, antwort);
  await leisteMit(welt.page, "Gekoppelt mit zweitem Gerät");
  await leisteMit(b, "Gekoppelt mit zweitem Gerät");
}

Given("ein zweites Gerät hat die App geöffnet", async function (this: EebWelt) {
  const browser = this.page.context().browser();
  if (!browser) throw new Error("Kein Browser für das zweite Gerät.");
  const kontext = await browser.newContext({ viewport: { width: 390, height: 780 } });
  await kontext.clock.install({ time: PRUEFSTAND_ZEIT });
  await kontext.clock.resume();
  await kontext.addInitScript(`globalThis.__EEB_PRELLSCHUTZ_MS = 0;`);
  const seite = await kontext.newPage();
  seite.on("dialog", async (dialog) => {
    this.systemdialoge.push(`zweites Gerät, ${dialog.type()}: ${dialog.message()}`);
    await dialog.dismiss();
  });
  zweite.set(this, seite);
  await seite.goto(`${this.basisUrl}/`, { waitUntil: "domcontentloaded" });
  await seite.getByRole("button", { name: "Bogen scannen…" }).waitFor();
});

After(async function (this: EebWelt) {
  const seite = zweite.get(this);
  if (seite && !seite.isClosed()) await seite.context().close();
});

Given("beide Geräte sind gekoppelt", async function (this: EebWelt) {
  await koppeln(this);
  await zweitesGeraet(this).getByRole("heading", { level: 1 }).filter({ hasText: "Hochwasser Weser" }).waitFor({ state: "visible" });
});

When("das zweite Gerät meinen Kopplungs-Code scannt", async function (this: EebWelt) {
  const b = zweitesGeraet(this);
  const angebot = await codeVon(this.page, "angebot");
  await b.getByRole("button", { name: "Bogen scannen…" }).click();
  await scannen(b, angebot);
});

When("ich den Antwort-Code des zweiten Geräts scanne", async function (this: EebWelt) {
  const antwort = await codeVon(zweitesGeraet(this), "antwort");
  await this.page.getByRole("button", { name: "Antwort scannen…" }).click();
  await scannen(this.page, antwort);
});

When("ich statt des Antwort-Codes den QR-Code des alten Bogens scanne", async function (this: EebWelt) {
  await scannen(this.page, EEB_URL_PREFIX + V2_FRAGMENT);
});

When("das zweite Gerät den Bogen der DLRG Wardenburg scannt", async function (this: EebWelt) {
  const b = zweitesGeraet(this);
  await b.getByRole("button", { name: "Bogen scannen…" }).click();
  await scannen(b, encodePayloadUrl(weitereEinheit(OrganisationsTyp.DLRG, "Wardenburg"), KOMPRESSOR));
});

When("das zweite Gerät die Kopplung trennt", async function (this: EebWelt) {
  await leiste(zweitesGeraet(this)).getByRole("button", { name: "Trennen" }).click();
});

/**
 * Wie ein Telefon, das eingeschlafen war: Die Verbindung ist ohne Abschied weg. Der Haken sitzt in kopplung.ts; danach
 * muss das Gerät von selbst über einen wartenden Platz des ersten Geräts zurückfinden. Gewartet wird, bis das erste
 * Gerät wieder zwei wartende Plätze hat, also bis der nächste Abriss wieder aufgefangen würde.
 */
When("die Verbindung am zweiten Gerät abreißt", async function (this: EebWelt) {
  const b = zweitesGeraet(this);
  await b.waitForTimeout(1500);
  await b.evaluate("globalThis.__eebKopplungAbriss()");
  await leisteMit(b, "Gekoppelt mit zweitem Gerät");
  await b.waitForTimeout(1500);
});

Then("zeigt das zweite Gerät den Dialog {string}", async function (this: EebWelt, titel: string) {
  await zweitesGeraet(this).locator("dialog[open]").getByRole("heading", { name: titel }).waitFor({ state: "visible" });
});

Then("zeigt das zweite Gerät die Überschrift {string}", async function (this: EebWelt, text: string) {
  await zweitesGeraet(this).getByRole("heading", { name: text }).first().waitFor({ state: "visible" });
});

Then("zeigt das zweite Gerät den Text {string}", async function (this: EebWelt, text: string) {
  await zweitesGeraet(this).locator("main").getByText(text).first().waitFor({ state: "visible" });
});

Then("meldet die Kopplungsleiste {string}", async function (this: EebWelt, text: string) {
  await leisteMit(this.page, text);
});

Then("meldet die Kopplungsleiste des zweiten Geräts {string}", async function (this: EebWelt, text: string) {
  await leisteMit(zweitesGeraet(this), text);
});

Then("zeigt die App keine Kopplungsleiste", async function (this: EebWelt) {
  await leiste(this.page).waitFor({ state: "detached" });
});

Then("meldet der Scanner {string}", async function (this: EebWelt, text: string) {
  await this.page.locator("dialog.scanner[open]").getByText(text).first().waitFor({ state: "visible" });
});

/** Die Zahl ganz oben, mit Warten: Der Stand des anderen Geräts kommt mit dem nächsten Takt. */
Then("zählt die Übersicht {int} Einheiten", async function (this: EebWelt, anzahl: number) {
  await this.page.locator(".staerke-leiste div").first().locator("strong").filter({ hasText: new RegExp(`^\\s*${anzahl}\\s*$`) }).waitFor({ state: "visible" });
});

Then("führt die Übersicht die Einheit {string}", async function (this: EebWelt, name: string) {
  await this.page.locator("main").getByText(name).first().waitFor({ state: "visible" });
});
