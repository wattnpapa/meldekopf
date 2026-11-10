/**
 * Der zweite Weg der Startseite: „Bogen erfassen (Erfassungsbogen)“. Gegenstück zum Abschnitt „Bögen sammeln
 * (Meldekopf)“ auf der Startseite des Erfassungsbogens (dort `meldekopf-weg.tsx`, seit 2026-11-09): Seit die
 * Einsatz-Sammlung hier liegt, führt jede der beiden Apps sichtbar zur anderen. Den vollständigen Bogen einer
 * Einheit (Personal mit Namen, Fahrzeuge, Sofortbedarf, Vorlagen) gibt es nur dort; diese App liest ihn ein.
 */

import { ERFASSUNGSBOGEN_URL } from "./adressen";

export function ErfassungsbogenWeg() {
  return (
    <section className="weiche-weg" aria-labelledby="weg-erfassungsbogen">
      <h2 id="weg-erfassungsbogen">Bogen erfassen (Erfassungsbogen)</h2>
      <p className="hinweis">
        Den Bogen einer Einheit vollständig ausfüllen: Einheit, Personal mit Namen und Funktionen, Fahrzeuge,
        Sofortbedarf, dazu Vorlagen und Beispielbögen. Der fertige Bogen kommt als QR-Code, Link oder PDF hierher
        und wird mit „Bogen scannen…“ oder per Datei eingelesen.
      </p>
      <div className="aktionen">
        <a className="datei-knopf primaer erfassungsbogen-link" href={ERFASSUNGSBOGEN_URL} target="_blank" rel="noopener noreferrer">
          Erfassungsbogen öffnen ↗
        </a>
      </div>
    </section>
  );
}
