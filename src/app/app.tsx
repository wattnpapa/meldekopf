/**
 * Die Anwendung: Zustand, Hash-Routing, Verdrahtung der Ansichten.
 *
 * Herkunft: Erfassungsbogen `src/app/app.tsx` (Commit f2b77f1 und 441811c),
 * hier neu geschrieben und bewusst klein (Übernahme-Doku, Abschnitt E): die
 * Startseite mit der Weiche „Bögen sammeln" (laufende Sammlungen öffnen, neue
 * anlegen), der Einsatzliste und der zuletzt offenen Sammlung (W5); die
 * offene Sammlung zeigt einsatz-ansicht.tsx. Die Eingänge (Scan, Dateien,
 * Einsatz importieren, Link-Empfang) liefert eingang/aufnahme.tsx; die
 * Schnellerfassung kommt mit Phase 4; die Weiche der
 * Startseite bleibt die eine Stelle für Aktionen (Begründung in kopfnav.ts).
 */

import { Fragment, useState, type ReactNode } from "react";
import type { Einsatzsammlung } from "@bos/meldekopf/einsaetze";
import { einsatzErfragen } from "./einsatz-erfragen";
import { ERFASSUNGSBOGEN_URL } from "./adressen";
import { Aktualisierungshinweise } from "./aktualisierung";
import { AnzeigeSchalter } from "@bos/oberflaeche/anzeige-schalter";
import { Dialogschicht } from "@bos/oberflaeche/dialoge";
import { Fusszeile } from "./fusszeile";
import { Kopfnav } from "@bos/oberflaeche/kopfnav-ui";
import { KOPFNAV } from "./kopfnav";
import { imWebBrowser } from "./nativ";
import { SeitenKopf } from "@bos/oberflaeche/seiten-kopf";
import { START_ABSCHNITTE, type Teil } from "./start-inhalt";
import { EinsatzListe, letzteMeldungText } from "./einsaetze-ui";
import { einsaetzeLaden } from "./einsaetze-lesen";
import { EinsatzAnsicht } from "./einsatz-ansicht";
import { useAufnahme } from "./eingang/aufnahme";
import { QrScannerWeb } from "./eingang/qr-scanner-web";
import { letztenEinsatzLaden, letztenEinsatzMerken } from "./letzter-einsatz";
import { SpeicherWarnung } from "./speicher-warnung";
import { UhrWarnung } from "./uhr-warnung";


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
 * Stand der App — sagt ehrlich, was hier schon geht und wo Bögen bis zum
 * Ende der Übernahme entstehen (ADR-007: Übergangszeit im Erfassungsbogen).
 * Dieselbe Karte steht im statischen Gerüst der index.html.
 */
export function StandKarte() {
  return (
    <section className="karte start-stand" aria-labelledby="stand-titel">
      <h2 id="stand-titel">Im Aufbau</h2>
      <p>
        Diese App übernimmt die Einsatz-Sammlung des Erfassungsbogens Schritt für Schritt. Heute: Bögen
        aufnehmen (Scan, Handscanner, Fotos, Dateien, Link), Sammlungen führen, Summen und Lage lesen, ausgeben
        als PDF, CSV und Excel, Datensicherung einspielen.
      </p>
      <p>
        Die Schnellerfassung einer Einheit ohne Bogen folgt als Nächstes. Bis dahin erfasst du sie im{" "}
        <a href={ERFASSUNGSBOGEN_URL}>Erfassungsbogen</a> und scannst ihren QR-Code hier ein.
      </p>
    </section>
  );
}

export function App() {
  const web = imWebBrowser();
  const [einsaetze, setEinsaetze] = useState<Einsatzsammlung[]>(() => einsaetzeLaden());
  // Beim Kaltstart die zuletzt offene Sammlung wieder öffnen (W5).
  const [offenerEinsatzId, setOffenerEinsatzIdRoh] = useState<string | null>(() => letztenEinsatzLaden());
  const setOffenerEinsatzId = (id: string | null) => {
    setOffenerEinsatzIdRoh(id);
    letztenEinsatzMerken(id);
  };
  const einsaetzeNeuLaden = () => setEinsaetze(einsaetzeLaden());
  // Rückmeldung der letzten Aufnahme oder Handlung, auf Startseite und in der Einsatzansicht.
  const [meldung, setMeldung] = useState("");
  const [fehler, setFehler] = useState("");
  const aufnahme = useAufnahme({ offenerEinsatzId, setOffenerEinsatzId, einsaetzeNeuLaden, setMeldung, setFehler });
  const offenerEinsatz = offenerEinsatzId ? einsaetze.find((s) => s.id === offenerEinsatzId) : undefined;

  async function neuerEinsatz() {
    const s = await einsatzErfragen();
    if (!s) return;
    einsaetzeNeuLaden();
    setOffenerEinsatzId(s.id);
  }

  // Kiosk-Scan: die aufgenommenen Bögen bleiben im Einsatz — der Knopf beendet
  // nur den Durchgang, deshalb „Fertig". Liegen Teile eines noch
  // unvollständigen Bogens im Sammelstand, gehen sie beim Schließen verloren —
  // dann ist es ehrlicher ein „Abbrechen".
  const scanner = aufnahme.scannerOffen && (
    <QrScannerWeb
      onErgebnis={(text) => void aufnahme.scanErgebnisWeb(text)}
      fortschritt={aufnahme.scanFortschritt}
      onAbbruch={() => aufnahme.scanAbbrechen(true)}
      onBild={(e) => void aufnahme.ladeQrBild(e)}
      teile={aufnahme.segmentStand}
      abbruchText={aufnahme.segmentStand.length > 0 ? "Abbrechen" : "Fertig"}
    />
  );

  if (offenerEinsatz) {
    return (
      <>
        <Aktualisierungshinweise />
        <EinsatzAnsicht
          einsatz={offenerEinsatz}
          einsaetze={einsaetze}
          aufnahme={aufnahme}
          meldung={meldung}
          fehler={fehler}
          onZurueck={() => {
            setOffenerEinsatzId(null);
            setMeldung("");
            setFehler("");
            aufnahme.setEinlese(null);
            aufnahme.setStapelBericht([]);
          }}
          onGeaendert={einsaetzeNeuLaden}
          onGeloescht={() => {
            // Quittung mit Rückweg: die Startseite (R2-D6, zuletztGeloeschterEinsatz in einsaetze-ui).
            setOffenerEinsatzId(null);
            einsaetzeNeuLaden();
          }}
        />
        {scanner}
        <Fusszeile />
        <Dialogschicht />
      </>
    );
  }

  // Laufende Sammlungen direkt in der Weiche öffnen, die zuletzt geänderten
  // zuerst (Audit Runde 3, R3-K5).
  const laufende = [...einsaetze].sort((a, b) => b.geaendert - a.geaendert).slice(0, 3);
  return (
    <>
      <Aktualisierungshinweise />
      <SeitenKopf variante="start-kopf" vorspann={web ? <Kopfnav quelle={KOPFNAV} /> : undefined}>
        <div className="titelzeile">
          <h1>Meldekopf</h1>
          <AnzeigeSchalter klappbar />
        </div>
      </SeitenKopf>
      <main id="inhalt" tabIndex={-1} className="start">
        <p className="start-intro">{START_INTRO}</p>
        <p className="offline-badge">{OFFLINE_ZUSAGE}</p>
        <SpeicherWarnung stand={einsaetze} />
        <UhrWarnung />
        <div className="weiche">
          <section className="weiche-weg" aria-labelledby="weg-meldekopf">
            <h2 id="weg-meldekopf">Bögen sammeln</h2>
            <p className="hinweis">
              Eintreffende Einheiten unter einem Einsatz bündeln — Stärke und Sofortbedarf laufend zusammengezählt.
            </p>
            <div className="aktionen">
              {laufende.map((s) => (
                <button key={s.id} type="button" className="primaer sammlung-oeffnen" onClick={() => setOffenerEinsatzId(s.id)}>
                  „{s.name}" öffnen
                  <span className="knopf-zusatz">{letzteMeldungText(s)}</span>
                </button>
              ))}
              <button type="button" className={laufende.length > 0 ? "" : "primaer"} onClick={() => void neuerEinsatz()}>
                Neue Einsatz-Sammlung…
              </button>
              {/* Ohne offene Sammlung: Der Bogen fragt nach dem Einlesen, wohin. */}
              <button type="button" onClick={() => { setMeldung(""); setFehler(""); void aufnahme.scanneQr(); }}>
                Bogen scannen…
              </button>
              <label className="datei-knopf">
                Einsatz importieren…
                <input type="file" accept=".json,application/json,.pdf,application/pdf" className="nur-sr" onChange={(e) => void aufnahme.importiereEinsatzDatei(e)} />
              </label>
            </div>
          </section>
        </div>
        {(meldung || fehler) && <p className={fehler ? "fehler" : "meldung"} role="status">{fehler || meldung}</p>}
        <StandKarte />
        {/* Die Überschrift bleibt wörtlich wie im Erfassungsbogen: Szenarien
            und Anleitung verweisen auf sie. */}
        <section className="start-vorlagen">
          <h2>Einsatz-Sammlung (Meldekopf)</h2>
          <EinsatzListe einsaetze={einsaetze} onOeffnen={(s) => setOffenerEinsatzId(s.id)} onGeaendert={einsaetzeNeuLaden} />
        </section>
        {/* Nur im Web: In der installierten Fassung ist „was ist das hier?" beantwortet. */}
        {web && <StartInhalt />}
      </main>
      {scanner}
      <Fusszeile />
      <Dialogschicht />
    </>
  );
}
