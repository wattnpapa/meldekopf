/**
 * Browser-Einstieg: Anzeige-Modus setzen, Start zählen, die Anwendung
 * (siehe app.tsx) in den Wurzelknoten hängen.
 *
 * Herkunft: Erfassungsbogen `src/app/main.tsx` (Commit 441811c). Die
 * Oberflächen-Mechanik kommt seit Phase 1 aus `@bos/oberflaeche`; seit Phase 2
 * mit Speicher-Verdrahtung der Sammlung, geprüfter Uhr, Fehlerfänger und dem
 * Lagemonitor-Fenster. Plattform-Klassen und Debug-Leiste kommen mit den
 * Capacitor-Hüllen (Phase 5).
 */

// Oberflächenschrift: Archivo (Grotesk in der DIN-Linie — der Formenwelt der
// Fahrzeug- und Schilderbeschriftung im BOS-Umfeld). Bewusst aus dem Bundle
// statt von einem CDN: die App muss offline vollständig funktionieren.
import "@fontsource-variable/archivo";

import { StrictMode, Suspense, lazy, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import { lagemonitorKennung } from "./lagemonitor-kennung";
import { standardThemeFarbeSetzen, wendeAnzeigeModusAn } from "@bos/oberflaeche/anzeige-modus";
import { KENNFARBE } from "./kennfarbe";
import { tastaturWaechterStarten } from "@bos/oberflaeche/tastatur";
import { schriftStufeStarten } from "@bos/oberflaeche/schrift-stufe";
import { statistikStarten } from "./statistik";
import { dialogVerlaufVerdrahten } from "@bos/oberflaeche/modal-overlay";
import { Fehlerfaenger, type FehlerfaengerWege } from "@bos/oberflaeche/fehlerfaenger";
import { dauerhaftWennWertvoll, speicherVerdrahten } from "./speicher-browser";
import { blobAlsDownload, stempelQuelleSetzen } from "./hilfen";
import { stempelZeitpunkt } from "./datenschutz-uhr";
import { alleDatenLoeschen, sicherungErstellen } from "./sicherung";
import { LETZTER_EINSATZ_SCHLUESSEL } from "./letzter-einsatz";
import { anfuehrungWaechterStarten } from "./typografie";
import { aktualisierungStarten } from "./aktualisierung";

// Der Lagemonitor wird nur nachgeladen, wenn die Adresse ihn verlangt (Startbündel, ADR-003 Aufnahmeregel 5).
const Lagemonitor = lazy(() => import("./lagemonitor-ui").then((m) => ({ default: m.Lagemonitor })));

// Die Einsatz-Sammlung bekommt ihre Ablage hineingereicht (ADR-003); ohne
// diese Zeile bliebe sie speicherlos. Muss vor dem ersten Lesen stehen.
speicherVerdrahten();
// Neue Stände werden mit der geprüften Uhr gestempelt (R5-E2); hilfen.ts importiert
// sie bewusst nicht selbst (Startbündel, siehe dort).
stempelQuelleSetzen(stempelZeitpunkt);
// Um dauerhaften Speicher bitten, sobald hier etwas Wertvolles liegt (R2-O6).
dauerhaftWennWertvoll();

// Zurück schließt jedes Fenster der Startseite, statt die App zu verlassen (R6-S3).
dialogVerlaufVerdrahten();

// Browserleiste ohne Modus in der Kennfarbe dieser App, nicht der des
// Erfassungsbogens. Vor dem ersten Abgleich: Das Boot-Skript hat den Meta-Tag
// nachts schon umgefärbt.
standardThemeFarbeSetzen(KENNFARBE);
wendeAnzeigeModusAn();
// Feste Leiste weicht der Bildschirmtastatur (R4-G3).
tastaturWaechterStarten();
// Große Systemschrift: Das Stylesheet verdichtet dann die niedrigen Fenster (R5-M3).
schriftStufeStarten();

// Service Worker und neue Fassungen, einmal je Fenster und gleich beim Start: Übernimmt eine neue Fassung, während die
// Seite noch lädt, verpasste ein später angemeldeter Hörer den Wechsel (Fernseher geöffnet, während im Hauptfenster
// „Neu laden“ lief). Das Fenster des Lagemonitors folgt nur, das Hauptfenster sucht und meldet (aktualisierung.tsx).
aktualisierungStarten(lagemonitorKennung() ? "anzeige" : "hauptfenster");

// Einen Start zählen (Browser, PWA, App). Schlägt ohne Netz still fehl. Nicht
// im Lagemonitor-Fenster: Es ist derselbe Start am selben Gerät, und zählte
// sonst als zweiter (anders als im Erfassungsbogen, 441811c).
if (!lagemonitorKennung()) statistikStarten();

/**
 * Was der Fehlerfänger aus @bos/oberflaeche von dieser App braucht (R5-E1):
 * die Datensicherung und das Löschen aus sicherung.ts, und welche Merker beim
 * Neustart wieder in die abgestürzte Ansicht führten.
 */
const FEHLERFAENGER_WEGE: FehlerfaengerWege = {
  sicherungErstellen,
  alleDatenLoeschen: () => void alleDatenLoeschen(),
  herunterladen: blobAlsDownload,
  ansichtVergessen: () => {
    localStorage.removeItem(LETZTER_EINSATZ_SCHLUESSEL); // zuletzt geöffnete Sammlung (app.tsx)
    sessionStorage.removeItem("eeb.abgleich.fortsetzen"); // „Stand aus dem anderen Fenster laden" (fenster-abgleich.tsx)
  },
  datenUmfang: "Sammlungen, den Papierkorb, Einstellungen und den Geräteschlüssel",
};

function Wurzel() {
  // R21-A2, E2: Die Klasse „einsatz-wiedereinstieg" (Skript in index.html) verdeckt nur das statische Start-Gerüst bis zum ersten Bild der App.
  useEffect(() => {
    document.documentElement.classList.remove("einsatz-wiedereinstieg");
  }, []);
  // Zweites Fenster mit der Lage für den Fernseher: nur Anzeige, ohne die App.
  const monitorEinsatz = lagemonitorKennung();
  if (monitorEinsatz) return <Suspense fallback={null}><Lagemonitor einsatzId={monitorEinsatz} /></Suspense>;
  return (
    <Fehlerfaenger wege={FEHLERFAENGER_WEGE}>
      <App />
    </Fehlerfaenger>
  );
}

// Schließende Anführungszeichen einheitlich „…“ (R17-W3).
anfuehrungWaechterStarten(document.getElementById("app")!);

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <Wurzel />
  </StrictMode>,
);
