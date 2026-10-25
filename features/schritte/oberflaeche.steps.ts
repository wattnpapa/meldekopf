/**
 * Allgemeine Oberflächen-Schritte: klicken, prüfen, Anzeigemodus, Netz.
 * Fachliche Schritte (Einsatz, Dialoge) stehen in app.steps.ts.
 *
 * Herkunft: Erfassungsbogen `features/schritte/oberflaeche.steps.ts` (Commit
 * f2b77f1). Übernommen sind die Schritte, die die Startseite der Phase 0
 * braucht; Feld-, Auswahl- und Tabellen-Schritte kommen mit den Ansichten
 * (Phasen 2 bis 4) unverändert nach.
 *
 * Grundsatz: gewartet wird über `waitFor`/`toPass`-artige Schleifen, nie über
 * feste Pausen — ein `sleep` wäre entweder zu kurz (Flackern) oder zu lang.
 */

import { Given, When, Then } from "@cucumber/cucumber";
import type { EebWelt } from "../support/welt";

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

// --------------------------------------------------------------- Gerätewelt

/**
 * Systemweites dunkles Design des Geräts. Die App folgt ihm nur als Vorgabe
 * beim ersten Start (siehe anzeige-modus.ts) — was hier geprüft wird: dass sie
 * darüber nicht in eine halb dunkle Darstellung kippt (dunkle Fläche, schwarze
 * Schrift).
 */
Given("mein Gerät auf dunkles Design eingestellt ist", async function (this: EebWelt) {
  await this.page.emulateMedia({ colorScheme: "dark" });
});

/**
 * Fenstergröße in CSS-Pixeln. Die Vorgabe von Playwright (1280 × 720) liegt
 * genau auf der Grenze, ab der die App auf Telefonhöhe verdichtet.
 */
Given("das Fenster {int} × {int} Pixel groß ist", async function (this: EebWelt, breite: number, hoehe: number) {
  await this.page.setViewportSize({ width: breite, height: hoehe });
});

// ------------------------------------------------------------------ Bedienen

/** Den Umschalter gibt es zweimal (Kopf- und Fußzeile) — gemeint ist der obere. */
When("ich den Anzeigemodus {string} wähle", async function (this: EebWelt, name: string) {
  await this.page.locator(".anzeige-schalter").first().getByRole("button", { name, exact: true }).click();
});

When("ich die Seite neu lade", async function (this: EebWelt) {
  await this.page.reload({ waitUntil: "domcontentloaded" });
});

/**
 * Netz weg — der Normalfall im Einsatz, nicht die Ausnahme. Vorher muss der
 * Service Worker aktiv sein: er ist es, der die App danach aus dem Cache
 * ausliefert. Ohne das Warten prüfte der Test nur, wie schnell der Browser ist.
 */
When("ich die App vom Netz trenne", async function (this: EebWelt) {
  await this.page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // Der Vorrat ist zweistufig (R3-O3): „ready" heißt nur, dass der Kern liegt;
  // die zweite Stufe lädt die Seite nach. Hier wird gewartet, bis beides da
  // ist — nötig, weil `setOffline` in Chromium nur die Seite vom Netz nimmt,
  // nicht den Service Worker. Als Schleife im Test statt `waitForFunction(async …)`:
  // Playwright wertet das zurückgegebene Versprechen einer async-Funktion
  // selbst als „wahr" und beendete das Warten nach Millisekunden.
  const bis = Date.now() + 25_000;
  for (;;) {
    const fertig = await this.page.evaluate(async () => {
      const r = await fetch(new URL("offline-zusatz.json", document.baseURI), { cache: "no-cache" }).catch(() => null);
      if (!r?.ok) return true; // Ohne Liste (Dev-Server) gibt es keine zweite Stufe.
      const umfang = (await r.json()) as { zusatz: { url: string }[] };
      for (const e of umfang.zusatz) {
        if (!(await caches.match(new URL(e.url, document.baseURI).href))) return false;
      }
      return true;
    });
    if (fertig) break;
    if (Date.now() > bis) throw new Error("Die zweite Stufe des Offline-Vorrats war nach 25 s nicht vollständig im Cache.");
    await this.page.waitForTimeout(250);
  }
  await this.page.context().setOffline(true);
});

// ------------------------------------------------------------------- Prüfen

Then("sehe ich den Hinweis {string}", async function (this: EebWelt, text: string) {
  await this.page.getByText(text).first().waitFor({ state: "visible" });
});

Then("sehe ich den Hinweis {string} nicht", async function (this: EebWelt, text: string) {
  await this.page.getByText(text).first().waitFor({ state: "hidden" });
});

Then("ist die Schaltfläche {string} gesperrt", async function (this: EebWelt, name: string) {
  const knopf = this.page.getByRole("button", { name, exact: true });
  await bisWahr(async () => {
    if (!(await knopf.isDisabled())) throw new Error(`„${name}" ist bedienbar, sollte aber gesperrt sein`);
  });
});

Then("ist die Schaltfläche {string} bedienbar", async function (this: EebWelt, name: string) {
  const knopf = this.page.getByRole("button", { name, exact: true });
  await bisWahr(async () => {
    if (await knopf.isDisabled()) throw new Error(`„${name}" ist gesperrt, sollte aber bedienbar sein`);
  });
});

Then("sehe ich die Schaltfläche {string} nicht", async function (this: EebWelt, name: string) {
  await this.page.getByRole("button", { name, exact: true }).waitFor({ state: "hidden" });
});

Then("ist der Anzeigemodus {string} aktiv", async function (this: EebWelt, name: string) {
  await bisWahr(async () => {
    const gedrueckt = await this.page
      .locator(".anzeige-schalter")
      .first()
      .getByRole("button", { name, exact: true })
      .getAttribute("aria-pressed");
    if (gedrueckt !== "true") throw new Error(`Anzeigemodus „${name}" ist nicht aktiv (aria-pressed=${gedrueckt})`);
  });
});

/**
 * Jeder sichtbare Text muss sich in der Helligkeit von seiner tatsächlichen
 * Fläche unterscheiden. Bewusst keine Kontrastzahl nach WCAG: gemessen wird
 * gegen den einen Fehler, der eine Oberfläche unbenutzbar macht — dunkler
 * Hintergrund mit dunkler Schrift (oder umgekehrt).
 *
 * Bewusst als Zeichenkette an den Browser gegeben statt als Funktion: der
 * tsx-Loader übersetzt Pfeilfunktionen mit einem `__name`-Helfer, den es in der
 * Seite nicht gibt — eine so übergebene Funktion stirbt dort sofort.
 */
const HELLIGKEITS_PRUEFUNG = `(() => {
  const zuRgb = (wert) => {
    const z = (wert.match(/[\\d.]+/g) || []).map(Number);
    return [z[0] || 0, z[1] || 0, z[2] || 0, z[3] === undefined ? 1 : z[3]];
  };
  // Relative Helligkeit nach WCAG 2.1 (mit Gamma-Korrektur).
  const helligkeit = (f) => {
    const k = [f[0], f[1], f[2]].map((v) => {
      const n = v / 255;
      return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2];
  };
  // Fläche, auf der ein Element tatsächlich liegt — durchsichtige Eltern übersprungen.
  const flaeche = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const f = zuRgb(getComputedStyle(e).backgroundColor);
      if (f[3] > 0.5) return f;
    }
    return [255, 255, 255, 1];
  };
  const maengel = [];
  for (const el of document.querySelectorAll("#app *")) {
    if (!(el instanceof HTMLElement) || el.offsetParent === null) continue;
    // Nur Elemente mit eigenem Text; Container erben ihre Farbe ohnehin.
    const eigen = Array.from(el.childNodes)
      .filter((k) => k.nodeType === 3)
      .map((k) => (k.textContent || "").trim())
      .join(" ")
      .trim();
    if (eigen === "") continue;
    const text = zuRgb(getComputedStyle(el).color);
    if (text[3] < 0.5) continue; // absichtlich ausgeblendet
    const abstand = Math.abs(helligkeit(text) - helligkeit(flaeche(el)));
    if (abstand < 0.2) {
      maengel.push({
        text: eigen.slice(0, 40),
        auswahl: el.tagName.toLowerCase() + "." + (el.className || "(ohne Klasse)"),
        abstand: Math.round(abstand * 1000) / 1000,
      });
    }
  }
  return maengel;
})()`;

Then("hebt sich jeder Text von seiner Fläche ab", async function (this: EebWelt) {
  const treffer: { text: string; auswahl: string; abstand: number }[] =
    await this.page.evaluate(HELLIGKEITS_PRUEFUNG);
  if (treffer.length > 0) {
    const liste = treffer.slice(0, 5).map((t) => `„${t.text}“ (${t.auswahl}, Δ${t.abstand})`);
    throw new Error(`${treffer.length} Text(e) gehen in ihrer Fläche unter: ${liste.join("; ")}`);
  }
});

/**
 * Der Kontrastschritt oben merkt nicht, wenn eine dunkle Darstellung auf
 * heller Fläche liegt und dabei sogar gut lesbar ist. Gemessen wird deshalb
 * die Grundfläche selbst — sie trägt die ganze Ansicht.
 */
const GRUNDFLAECHE_HELLIGKEIT = `(() => {
  const z = (getComputedStyle(document.body).backgroundColor.match(/[\\d.]+/g) || []).map(Number);
  const k = [z[0] || 0, z[1] || 0, z[2] || 0].map((v) => {
    const n = v / 255;
    return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2];
})()`;

Then("liegt die App auf dunklem Grund", async function (this: EebWelt) {
  const helligkeit: number = await this.page.evaluate(GRUNDFLAECHE_HELLIGKEIT);
  if (helligkeit > 0.15) {
    throw new Error(`Die Grundfläche ist hell (Helligkeit ${Math.round(helligkeit * 100) / 100}) — der Modus greift nur halb.`);
  }
});
