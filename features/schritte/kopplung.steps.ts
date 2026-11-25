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

/** „Bogen scannen…" des zweiten Geräts: in der Sammler-Ansicht, solange sie offen ist, sonst auf der Seite. */
async function scanKnopf(seite: Page) {
  const ort = (await seite.locator("dialog.sammler").count()) > 0 ? seite.locator("dialog.sammler") : seite.locator("main");
  return ort.getByRole("button", { name: "Bogen scannen…" });
}

async function codeVon(seite: Page, art: "angebot" | "antwort"): Promise<string> {
  const bild = seite.locator(`dialog.kopplung-dialog[data-art=${art}] img[data-code]`);
  await bild.waitFor();
  return (await bild.getAttribute("data-code")) ?? "";
}

/** Die Anzeige der Verbindung: an der Zentrale die Leiste, am Sammler der Kopf seiner Ansicht. */
function leiste(seite: Page) {
  return seite.locator(".kopplung-leiste, .sammler-stand");
}

/** Wartet, bis die Leiste den Text trägt: Der Verbindungsaufbau und das Erkennen einer Trennung brauchen ihre Zeit. */
async function leisteMit(seite: Page, text: string): Promise<void> {
  await leiste(seite).filter({ hasText: text }).waitFor({ state: "visible", timeout: 25_000 });
}

/** Koppeln, wie es im Betrieb geht: ein Scan am zweiten Gerät, der Rest von selbst. */
async function koppeln(welt: EebWelt): Promise<void> {
  const b = zweitesGeraet(welt);
  await welt.page.getByRole("button", { name: "Zweites Gerät koppeln…" }).click();
  const angebot = await codeVon(welt.page, "angebot");
  await (await scanKnopf(b)).click();
  await scannen(b, angebot);
  await leisteMit(welt.page, "Verbindung aktiv");
  await leisteMit(b, "Verbindung aktiv");
}

/** Der Haken sitzt in kopplung.ts: ohne Türen bleibt der Antwort-Code der einzige Weg, wie in einem Browser, der sie nicht öffnen kann. */
Given("das erste Gerät öffnet keine Türen zum Anklopfen", async function (this: EebWelt) {
  await this.page.evaluate("globalThis.__eebKopplungOhneTueren = true");
});

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
  await zweitesGeraet(this).locator("dialog.sammler").getByRole("heading", { level: 1 }).filter({ hasText: "Hochwasser Weser" }).waitFor({ state: "visible" });
});

When("das zweite Gerät meinen Kopplungs-Code scannt", async function (this: EebWelt) {
  const b = zweitesGeraet(this);
  const angebot = await codeVon(this.page, "angebot");
  await (await scanKnopf(b)).click();
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
  await (await scanKnopf(b)).click();
  await scannen(b, encodePayloadUrl(weitereEinheit(OrganisationsTyp.DLRG, "Wardenburg"), KOMPRESSOR));
});

When("das zweite Gerät die Kopplung trennt", async function (this: EebWelt) {
  await zweitesGeraet(this).getByRole("button", { name: "Kopplung trennen" }).click();
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
  await leisteMit(b, "Verbindung aktiv");
  await b.waitForTimeout(1500);
});

Then("zeigt das zweite Gerät den Dialog {string}", async function (this: EebWelt, titel: string) {
  await zweitesGeraet(this).locator("dialog[open]").getByRole("heading", { name: titel }).waitFor({ state: "visible" });
});

Then("zeigt das zweite Gerät die Überschrift {string}", async function (this: EebWelt, text: string) {
  await zweitesGeraet(this).getByRole("heading", { name: text }).first().waitFor({ state: "visible" });
});

Then("zeigt das zweite Gerät den Text {string}", async function (this: EebWelt, text: string) {
  await zweitesGeraet(this).locator("dialog.sammler").getByText(text).first().waitFor({ state: "visible" });
});

Then("zeigt das zweite Gerät {string} nicht", async function (this: EebWelt, text: string) {
  const b = zweitesGeraet(this);
  await b.locator("dialog.sammler").waitFor({ state: "visible" });
  if ((await b.locator("dialog.sammler").getByText(text).count()) > 0) throw new Error(`Das zweite Gerät zeigt „${text}".`);
  // Auch im Speicher des Sammlers steht die Lage der Zentrale nicht.
  const speicher = String(await b.evaluate("JSON.stringify(Object.fromEntries(Object.entries(localStorage)))"));
  if (speicher.includes(text)) throw new Error(`Im Speicher des zweiten Geräts steht „${text}".`);
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

Then("meldet der Dialog {string}", async function (this: EebWelt, text: string) {
  await this.page.locator("dialog[open]").getByText(text).first().waitFor({ state: "visible" });
});

/**
 * Neu laden wie ein vom Browser weggeräumter Tab: Die Verbindungsobjekte sind weg, das Gemerkte (merker.ts) bleibt.
 * Vorher kurz warten, bis das erste Gerät wieder wartende Plätze angeboten hat und sie gemerkt sind.
 */
When("das zweite Gerät seine Seite neu lädt", async function (this: EebWelt) {
  const b = zweitesGeraet(this);
  await b.waitForTimeout(1500);
  const getrennt = (await b.locator("dialog.sammler").count()) === 0;
  await b.reload({ waitUntil: "domcontentloaded" });
  // Die gemerkte Kopplung setzt sich nach dem Laden fort; erst dann steht die Sammler-Ansicht wieder.
  if (!getrennt) await b.locator("dialog.sammler").waitFor({ state: "visible" });
});

Then("zeigt das zweite Gerät keine Kopplung", async function (this: EebWelt) {
  const b = zweitesGeraet(this);
  await b.getByRole("button", { name: "Bogen scannen…" }).first().waitFor({ state: "visible" });
  await b.waitForTimeout(1500);
  if ((await b.locator(".kopplung-leiste, dialog.sammler").count()) > 0) throw new Error("Das zweite Gerät zeigt weiter eine Kopplung.");
});

/** Vorher kurz warten, bis das zweite Gerät seine wartenden Plätze angeboten hat und das erste sie gemerkt hat. */
When("das erste Gerät seine Seite neu lädt", async function (this: EebWelt) {
  await this.page.waitForTimeout(1500);
  await this.page.reload({ waitUntil: "domcontentloaded" });
});

When("beide Geräte ihre Seite zugleich neu laden", async function (this: EebWelt) {
  await this.page.waitForTimeout(1500);
  await Promise.all([this.page.reload({ waitUntil: "domcontentloaded" }), zweitesGeraet(this).reload({ waitUntil: "domcontentloaded" })]);
});

// ---------------------------------------------------------------------------------------------- mehrere Sammler

const dritte = new WeakMap<EebWelt, Page>();

function drittesGeraet(welt: EebWelt): Page {
  const seite = dritte.get(welt);
  if (!seite) throw new Error("Das Szenario hat kein drittes Gerät geöffnet.");
  return seite;
}

Given("ein drittes Gerät hat die App geöffnet", async function (this: EebWelt) {
  const browser = this.page.context().browser();
  if (!browser) throw new Error("Kein Browser für das dritte Gerät.");
  const kontext = await browser.newContext({ viewport: { width: 390, height: 780 } });
  await kontext.clock.install({ time: PRUEFSTAND_ZEIT });
  await kontext.clock.resume();
  await kontext.addInitScript(`globalThis.__EEB_PRELLSCHUTZ_MS = 0;`);
  const seite = await kontext.newPage();
  seite.on("dialog", async (dialog) => {
    this.systemdialoge.push(`drittes Gerät, ${dialog.type()}: ${dialog.message()}`);
    await dialog.dismiss();
  });
  dritte.set(this, seite);
  await seite.goto(`${this.basisUrl}/`, { waitUntil: "domcontentloaded" });
  await seite.getByRole("button", { name: "Bogen scannen…" }).waitFor();
});

After(async function (this: EebWelt) {
  const seite = dritte.get(this);
  if (seite && !seite.isClosed()) await seite.context().close();
});

When("das dritte Gerät meinen Kopplungs-Code scannt", async function (this: EebWelt) {
  const c = drittesGeraet(this);
  const angebot = await codeVon(this.page, "angebot");
  await (await scanKnopf(c)).click();
  await scannen(c, angebot);
});

When("das dritte Gerät den Bogen der Feuerwehr Aschhausen scannt", async function (this: EebWelt) {
  const c = drittesGeraet(this);
  await (await scanKnopf(c)).click();
  await scannen(c, encodePayloadUrl(weitereEinheit(OrganisationsTyp.FEUERWEHR, "Aschhausen"), KOMPRESSOR));
  // Der Scanner bleibt für den nächsten Bogen offen; hier ist der Durchgang zu Ende.
  await c.keyboard.press("Escape");
});

When("das dritte Gerät sich {string} nennt", async function (this: EebWelt, name: string) {
  const c = drittesGeraet(this);
  await c.locator("dialog.sammler").getByRole("button", { name: "Name ändern…" }).click();
  const dialog = c.locator("dialog[open]").filter({ hasText: "Name dieses Geräts" });
  await dialog.getByRole("textbox").fill(name);
  await dialog.getByRole("button", { name: "Übernehmen" }).click();
});

When("das dritte Gerät die Kopplung trennt", async function (this: EebWelt) {
  await drittesGeraet(this).getByRole("button", { name: "Kopplung trennen" }).click();
});

/** Wie ein Telefon, das ausgeht und aus bleibt: Die Seite ist weg, niemand ruft zurück. */
When("die Verbindung am dritten Gerät abreißt und es nicht zurückfindet", async function (this: EebWelt) {
  const c = drittesGeraet(this);
  await c.waitForTimeout(1500);
  await c.context().close();
});

Then("meldet die Kopplungsleiste des dritten Geräts {string}", async function (this: EebWelt, text: string) {
  await leisteMit(drittesGeraet(this), text);
});

Then("zeigt das dritte Gerät den Text {string}", async function (this: EebWelt, text: string) {
  await drittesGeraet(this).locator("dialog.sammler").getByText(text).first().waitFor({ state: "visible" });
});

Then("zeigt das dritte Gerät {string} nicht", async function (this: EebWelt, text: string) {
  const c = drittesGeraet(this);
  await c.locator("dialog.sammler").waitFor({ state: "visible" });
  if ((await c.locator("dialog.sammler").getByText(text).count()) > 0) throw new Error(`Das dritte Gerät zeigt „${text}".`);
  const speicher = String(await c.evaluate("JSON.stringify(Object.fromEntries(Object.entries(localStorage)))"));
  if (speicher.includes(text)) throw new Error(`Im Speicher des dritten Geräts steht „${text}".`);
});

/** Ohne Liste führt die Leiste genau einen Sammler (sie nennt ihn im Satz); mit Liste zählen deren Zeilen. */
Then("führt die Kopplungsleiste genau {int} Sammler", async function (this: EebWelt, anzahl: number) {
  await this.page.waitForTimeout(1500);
  const zeilen = await this.page.locator(".kopplung-leiste .kopplung-geraete li").count();
  const ist = zeilen === 0 ? 1 : zeilen;
  if (ist !== anzahl) throw new Error(`Die Leiste führt ${ist} Sammler, erwartet waren ${anzahl}.`);
});

// ------------------------------------------------------------------------------------- Stand der Zentrale, Nachsenden

/**
 * Die Zentrale ist weg, ohne sich zu verabschieden (Rechner zugeklappt, außer Reichweite): Ihre Seite verlässt die App.
 * Das Telefon merkt es an der ausbleibenden Antwort und nimmt weiter auf.
 */
When("das erste Gerät nicht erreichbar ist", async function (this: EebWelt) {
  await this.page.waitForTimeout(1500);
  await this.page.goto("about:blank");
  await leisteMit(zweitesGeraet(this), "Verbindung unterbrochen");
});

/** Die Zentrale kommt zurück und setzt ihre gemerkte Kopplung fort (merker.ts): Sie ruft das Telefon an. */
When("das erste Gerät wieder erreichbar ist", async function (this: EebWelt) {
  await this.oeffneApp();
  await leisteMit(this.page, "Verbindung aktiv");
});

When("ich die Einheit {string} an der Zentrale entferne", async function (this: EebWelt, name: string) {
  const id = String(
    await this.page.evaluate(`(() => {
      const s = JSON.parse(localStorage.getItem("eeb.einsaetze.v1"))[0];
      return s.id;
    })()`),
  );
  // Über denselben Weg wie die Karte der Einheit („Mehr… → Entfernen"): hier direkt im Speicher, die Ansicht liest neu.
  await this.page.evaluate(
    `(() => {
      const liste = JSON.parse(localStorage.getItem("eeb.einsaetze.v1"));
      const s = liste.find((x) => x.id === ${JSON.stringify(id)});
      const weg = s.eintraege.filter((e) => JSON.stringify(e.bogen.einheit).includes(${JSON.stringify(name.replace(/^DLRG /, ""))}));
      s.eintraege = s.eintraege.filter((e) => !weg.includes(e));
      s.geaendert = Date.now();
      localStorage.setItem("eeb.einsaetze.v1", JSON.stringify(liste));
      const entfernt = JSON.parse(localStorage.getItem("eeb.entfernt.v1") || "{}");
      entfernt[s.id] = [...(entfernt[s.id] || []), ...weg.map((e) => e.id)];
      localStorage.setItem("eeb.entfernt.v1", JSON.stringify(entfernt));
      window.dispatchEvent(new StorageEvent("storage", { key: "eeb.einsaetze.v1" }));
    })()`,
  );
});
