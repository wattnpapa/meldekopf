/**
 * Die Anwendung: Zustand, Hash-Routing, Verdrahtung der Ansichten.
 *
 * Herkunft: Erfassungsbogen `src/app/app.tsx` (Commit f2b77f1 und 441811c),
 * hier neu geschrieben und bewusst klein (Übernahme-Doku, Abschnitt E): die
 * Startseite mit der Weiche „Bögen sammeln" (laufende Sammlungen öffnen, neue
 * anlegen), der Einsatzliste und der zuletzt offenen Sammlung (W5); die
 * offene Sammlung zeigt einsatz-ansicht.tsx. Eingangs-Weiche, Link-Empfang
 * und Schnellerfassung kommen mit den Phasen 3 und 4 hierher; die Weiche der
 * Startseite bleibt die eine Stelle für Aktionen (Begründung in kopfnav.ts).
 */

import { Fragment, useState, type ReactNode } from "react";
import { EinsatzArt, einsatzAnlegen, type Einsatzsammlung } from "@bos/meldekopf/einsaetze";
import { frageFelder, zeigeHinweis } from "@bos/oberflaeche/dialoge";
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
import { ART_LABEL, EinsatzListe, letzteMeldungText } from "./einsaetze-ui";
import { einsaetzeLaden } from "./einsaetze-lesen";
import { EinsatzAnsicht } from "./einsatz-ansicht";
import { SpeicherVollFehler, istSpeicherVoll } from "./eintrag-zeiten";
import { letztenEinsatzLaden, letztenEinsatzMerken } from "./letzter-einsatz";
import { fehlerText } from "./nachladen";
import { SpeicherWarnung } from "./speicher-warnung";
import { UhrWarnung } from "./uhr-warnung";

const ART_WAHL = Object.entries(ART_LABEL).map(([wert, label]) => ({ wert, label }));

/**
 * Neue Sammlung erfragen und anlegen (Erfassungsbogen `einsatzErfragen`).
 * Voller Speicher: der Dialog schloss, und es gab weder Sammlung noch Meldung
 * — nur einen Fehler in der Konsole (Audit Runde 2, R2-O2). Deshalb sagt es
 * die App.
 */
async function einsatzErfragen(): Promise<Einsatzsammlung | null> {
  const werte = await frageFelder({
    titel: "Neue Einsatz-Sammlung anlegen",
    hinweis: "Die Sammelmappe des Meldekopfs für eintreffende Bögen — mit Stärke-Summen über alle anwesenden Einheiten.",
    ok: "Einsatz anlegen",
    felder: [
      { name: "name", label: "Name", platzhalter: "z. B. Hochwasser Weser" },
      { name: "art", label: "Art", auswahl: ART_WAHL },
      { name: "ort", label: "Ort / Auftrag (optional)", optional: true, platzhalter: "z. B. Deichabschnitt Nord" },
    ],
  });
  if (!werte) return null;
  try {
    return einsatzAnlegen(werte.name!, Number(werte.art) as EinsatzArt, werte.ort);
  } catch (e) {
    await zeigeHinweis({
      titel: "Sammlung nicht angelegt",
      text: istSpeicherVoll(e) ? new SpeicherVollFehler(e).message : fehlerText(e),
    });
    return null;
  }
}

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
        Diese App übernimmt die Einsatz-Sammlung des Erfassungsbogens Schritt für Schritt. Heute: Sammlungen
        anlegen und führen, Summen und Lage lesen, ausgeben als PDF, CSV und Excel, Datensicherung einspielen.
      </p>
      <p>
        Bögen aufnehmen (Scan, Datei, Schnellerfassung) folgt als Nächstes. Bis dahin sammelst du Bögen im{" "}
        <a href={ERFASSUNGSBOGEN_URL}>Erfassungsbogen</a> und spielst seine Datensicherung hier ein.
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
  const offenerEinsatz = offenerEinsatzId ? einsaetze.find((s) => s.id === offenerEinsatzId) : undefined;

  async function neuerEinsatz() {
    const s = await einsatzErfragen();
    if (!s) return;
    einsaetzeNeuLaden();
    setOffenerEinsatzId(s.id);
  }

  if (offenerEinsatz) {
    return (
      <>
        <Aktualisierungshinweise />
        <EinsatzAnsicht
          einsatz={offenerEinsatz}
          einsaetze={einsaetze}
          onZurueck={() => setOffenerEinsatzId(null)}
          onGeaendert={einsaetzeNeuLaden}
          onGeloescht={() => {
            // Quittung mit Rückweg: die Startseite (R2-D6, zuletztGeloeschterEinsatz in einsaetze-ui).
            setOffenerEinsatzId(null);
            einsaetzeNeuLaden();
          }}
        />
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
            </div>
          </section>
        </div>
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
      <Fusszeile />
      <Dialogschicht />
    </>
  );
}
