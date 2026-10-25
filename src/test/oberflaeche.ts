/**
 * Gemeinsames Setup der Oberflächentests (Projekt „oberflaeche").
 *
 * Herkunft: Erfassungsbogen `src/test/oberflaeche.ts` (Commit f2b77f1, seit
 * Phase 2 mit der Verdrahtung der Einsatz-Sammlung aus 441811c).
 *
 * Räumt nach jedem Test das DOM und den Gerätespeicher auf — die App legt
 * ihre Daten im localStorage ab; ohne Aufräumen würde ein Test den nächsten
 * vorbelegen.
 */

import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { dialogeZuruecksetzen, prellschutzSetzen } from "@bos/oberflaeche/dialoge";
import { speicherVerdrahten } from "../app/speicher-browser";
import { leseSchreibFehlerZuruecksetzen } from "../app/speicher-schonend";
import { einsaetzeLesenZuruecksetzen } from "../app/einsaetze-lesen";
// Testing Library klickt schneller als jeder Finger: der Prellschutz der
// Rückfragen (dialoge.tsx, R2-G1) ist hier aus; sein eigener Test schaltet ihn ein.
prellschutzSetzen(0);

// Älteres jsdom kennt <dialog> nur als Element, nicht seine Methoden. Die App
// öffnet damit alle Rückfragen (src/app/dialoge.tsx) und die Fußzeilen-Dialoge;
// ohne Ersatz bricht jeder Klick darauf ab. Nachgebildet wird nur, was die App
// nutzt: das `open`-Attribut, der Rückgabewert und das `close`-Ereignis.
// Node ab Version 26 legt `localStorage` und `sessionStorage` selbst als Getter
// auf `globalThis` — ohne `--localstorage-file` liefern sie `undefined`. Vitest
// überschreibt vorhandene Getter beim Einhängen der jsdom-Globals nicht, also
// bleibt der Speicher hier leer statt zu fehlen, und jedes `localStorage.clear()`
// wirft. Unter Node 24 (siehe .nvmrc) existiert die Eigenschaft gar nicht und
// jsdom setzt seine eigene ein; dann greift der Ersatz unten nicht.
function speicherErsetzen(name: "localStorage" | "sessionStorage") {
  if ((globalThis as Record<string, unknown>)[name] != null) return;
  const inhalt = new Map<string, string>();
  const ersatz: Storage = {
    get length() {
      return inhalt.size;
    },
    key: (stelle) => [...inhalt.keys()][stelle] ?? null,
    getItem: (schluessel) => inhalt.get(String(schluessel)) ?? null,
    setItem: (schluessel, wert) => {
      inhalt.set(String(schluessel), String(wert));
    },
    removeItem: (schluessel) => {
      inhalt.delete(String(schluessel));
    },
    clear: () => {
      inhalt.clear();
    },
  };
  Object.defineProperty(globalThis, name, { value: ersatz, configurable: true, writable: true });
}

speicherErsetzen("localStorage");
speicherErsetzen("sessionStorage");

// Die Einsatz-Sammlung bekommt ihre Ablage hineingereicht (ADR-003). Im Produkt
// tut das `main.tsx`; die Oberflächentests starten die App nicht über ihren
// Einstieg, brauchen die Ablage aber genauso. Muss nach `speicherErsetzen`
// stehen, damit unter Node 26 der Ersatz und nicht `undefined` eingehängt wird.
speicherVerdrahten();

const dialog = window.HTMLDialogElement?.prototype as HTMLDialogElement | undefined;
if (dialog && typeof dialog.showModal !== "function") {
  dialog.show = function () {
    this.setAttribute("open", "");
  };
  dialog.showModal = function () {
    this.setAttribute("open", "");
  };
  dialog.close = function (rueckgabe?: string) {
    if (!this.hasAttribute("open")) return;
    this.removeAttribute("open");
    if (rueckgabe != null) this.returnValue = rueckgabe;
    this.dispatchEvent(new Event("close"));
  };
}

afterEach(() => {
  cleanup();
  // Eine unbeantwortete Rückfrage überlebt das Abräumen des DOM — ohne
  // Zurücksetzen zeigt der nächste Test sie statt seiner eigenen.
  dialogeZuruecksetzen();
  localStorage.clear();
  sessionStorage.clear();
  leseSchreibFehlerZuruecksetzen();
  einsaetzeLesenZuruecksetzen();
});
