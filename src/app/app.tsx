/**
 * Die Anwendung: Zustand, Hash-Routing, Verdrahtung der Ansichten.
 *
 * Herkunft: Erfassungsbogen `src/app/app.tsx` (Commit f2b77f1), hier neu
 * geschrieben und bewusst klein (Übernahme-Doku, Abschnitt E): In Phase 0
 * gibt es nur die Startseite — Kopfnavigation, Kopfbalken mit Anzeigemodus,
 * Einleitung, Stand der App, erklärender Text und Fußzeile. Einsatzliste,
 * Eingangs-Weiche, Link-Empfang und Schnellerfassung kommen mit den Phasen
 * 2 bis 4 hierher; die Weiche der Startseite bleibt dann die eine Stelle für
 * Aktionen (Begründung in kopfnav.ts).
 */

import { Fragment, type ReactNode } from "react";
import { ERFASSUNGSBOGEN_URL } from "./adressen";
import { Aktualisierungshinweise } from "./aktualisierung";
import { AnzeigeSchalter } from "./anzeige-schalter";
import { Dialogschicht } from "./dialoge";
import { Fusszeile } from "./fusszeile";
import { Kopfnav } from "./kopfnav-ui";
import { imWebBrowser } from "./nativ";
import { SeitenKopf } from "./seiten-kopf";
import { START_ABSCHNITTE, type Teil } from "./start-inhalt";

/** Untertitel der Startseite — derselbe Satz wie im statischen Gerüst der index.html. */
export const START_INTRO =
  "Für Meldeköpfe, Bereitstellungsräume und kleine Führungsstellen im ELW: eintreffende Einheiten erfassen, Stärke und Sofortbedarf laufend zählen, die Lage geschlossen weitergeben.";

/** Offline-Zusage unter der Einleitung — derselbe Satz wie im Gerüst. */
export const OFFLINE_ZUSAGE = "Alle Daten bleiben auf diesem Gerät. Nach dem ersten Laden funktioniert die App auch ohne Netz.";

function teile(t: Teil[]): ReactNode {
  return t.map((teil, i) =>
    typeof teil === "string" ? (
      <Fragment key={i}>{teil}</Fragment>
    ) : (
      <a key={i} href={teil.ziel}>
        {teil.text}
      </a>
    ),
  );
}


/**
 * Der erklärende Text der Startseite — dieselben Daten wie das statische
 * Gerüst (start-inhalt.ts), damit beim Mount nichts springt.
 */
export function StartInhalt() {
  return (
    <section className="start-seo" aria-label="Über die Meldekopf-App">
      {START_ABSCHNITTE.map((abschnitt) => (
        <Fragment key={abschnitt.titel}>
          <h2>{abschnitt.titel}</h2>
          {abschnitt.bloecke.map((block, i) =>
            block.art === "absatz" ? (
              <p key={i}>{teile(block.teile)}</p>
            ) : (
              <ul key={i}>
                {block.punkte.map((punkt, j) => (
                  <li key={j}>{teile(punkt)}</li>
                ))}
              </ul>
            ),
          )}
        </Fragment>
      ))}
    </section>
  );
}

/**
 * Stand der App — die eine Karte des Arbeitsbereichs, solange die Sammlung
 * noch nicht übernommen ist. Sie sagt ehrlich, was hier schon geht und wo die
 * Sammlung bis dahin liegt (ADR-007: Übergangszeit im Erfassungsbogen).
 * Dieselbe Karte steht im statischen Gerüst der index.html.
 */
export function StandKarte() {
  return (
    <section className="karte start-stand" aria-labelledby="stand-titel">
      <h2 id="stand-titel">Im Aufbau</h2>
      <p>
        Diese App übernimmt die Einsatz-Sammlung des Erfassungsbogens Schritt für Schritt. Heute steht
        das Gerüst: Startseite, Anzeigemodi für Sonne und Nacht, Offline-Start.
      </p>
      <p>
        Bis die Übernahme abgeschlossen ist, sammelst du Bögen weiter im{" "}
        <a href={ERFASSUNGSBOGEN_URL}>Erfassungsbogen</a>.
      </p>
    </section>
  );
}

export function App() {
  const web = imWebBrowser();
  return (
    <>
      <Aktualisierungshinweise />
      <SeitenKopf variante="start-kopf" vorspann={web ? <Kopfnav /> : undefined}>
        <div className="titelzeile">
          <h1>Meldekopf</h1>
          <AnzeigeSchalter klappbar />
        </div>
      </SeitenKopf>
      <main id="inhalt" tabIndex={-1} className="start">
        <p className="start-intro">{START_INTRO}</p>
        <p className="offline-badge">{OFFLINE_ZUSAGE}</p>
        <StandKarte />
        {/* Nur im Web: In der installierten Fassung ist „was ist das hier?" beantwortet. */}
        {web && <StartInhalt />}
      </main>
      <Fusszeile />
      <Dialogschicht />
    </>
  );
}
