/**
 * Browser-Einstieg: Anzeige-Modus setzen, Start zählen, die Anwendung
 * (siehe app.tsx) in den Wurzelknoten hängen.
 *
 * Herkunft: Erfassungsbogen `src/app/main.tsx` (Commit f2b77f1). In Phase 0
 * ohne die Teile, deren Module noch nicht übernommen sind: Speicher-Verdrahtung
 * der Sammlung und geprüfte Uhr (Phase 2), Fehlerfänger (mit sicherung.ts,
 * Phase 2), Lagemonitor-Fenster (Phase 5), Plattform-Klassen und Debug-Leiste
 * (mit den Capacitor-Hüllen, Phase 5).
 */

// Oberflächenschrift: Archivo (Grotesk in der DIN-Linie — der Formenwelt der
// Fahrzeug- und Schilderbeschriftung im BOS-Umfeld). Bewusst aus dem Bundle
// statt von einem CDN: die App muss offline vollständig funktionieren.
import "@fontsource-variable/archivo";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import { wendeAnzeigeModusAn } from "./anzeige-modus";
import { tastaturWaechterStarten } from "./tastatur";
import { schriftStufeStarten } from "./schrift-stufe";
import { statistikStarten } from "./statistik";
import { dialogVerlaufVerdrahten } from "./modal-overlay";

// Zurück schließt jedes Fenster der Startseite, statt die App zu verlassen (R6-S3).
dialogVerlaufVerdrahten();

wendeAnzeigeModusAn();
// Feste Leiste weicht der Bildschirmtastatur (R4-G3).
tastaturWaechterStarten();
// Große Systemschrift: Das Stylesheet verdichtet dann die niedrigen Fenster (R5-M3).
schriftStufeStarten();

// Einen Start zählen (Browser, PWA, App). Schlägt ohne Netz still fehl.
statistikStarten();

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
