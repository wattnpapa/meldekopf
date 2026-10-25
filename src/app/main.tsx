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

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import { standardThemeFarbeSetzen, wendeAnzeigeModusAn } from "@bos/oberflaeche/anzeige-modus";
import { KENNFARBE } from "./kennfarbe";
import { tastaturWaechterStarten } from "@bos/oberflaeche/tastatur";
import { schriftStufeStarten } from "@bos/oberflaeche/schrift-stufe";
import { statistikStarten } from "./statistik";
import { dialogVerlaufVerdrahten } from "@bos/oberflaeche/modal-overlay";
import { Fehlerfaenger, type FehlerfaengerWege } from "@bos/oberflaeche/fehlerfaenger";
import { Lagemonitor, lagemonitorKennung } from "./lagemonitor-ui";
import { dauerhaftWennWertvoll, speicherVerdrahten } from "./speicher-browser";
import { blobAlsDownload, stempelQuelleSetzen } from "./hilfen";
import { stempelZeitpunkt } from "./datenschutz-uhr";
import { alleDatenLoeschen, sicherungErstellen } from "./sicherung";
import { LETZTER_EINSATZ_SCHLUESSEL } from "./letzter-einsatz";

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

// Einen Start zählen (Browser, PWA, App). Schlägt ohne Netz still fehl.
statistikStarten();

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
  // Zweites Fenster mit der Lage für den Fernseher: nur Anzeige, ohne die App.
  const monitorEinsatz = lagemonitorKennung();
  if (monitorEinsatz) return <Lagemonitor einsatzId={monitorEinsatz} />;
  return (
    <Fehlerfaenger wege={FEHLERFAENGER_WEGE}>
      <App />
    </Fehlerfaenger>
  );
}

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <Wurzel />
  </StrictMode>,
);
