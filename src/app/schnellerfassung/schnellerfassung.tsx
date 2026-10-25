/**
 * Schnellerfassung: eine Einheit ohne Bogen in eine Sammlung aufnehmen. Eine
 * Seite statt eines Assistenten: Zettel-Angaben (Eintreffzeit, Nummer, Zug),
 * Einheit, Stärke mit Führungskraft, Fahrzeuge, dann „In Einsatz übernehmen".
 *
 * Herkunft: Erfassungsbogen `src/app/app.tsx` (Commit 441811c), die fremde
 * Erfassung für eine Sammlung: `manuellInEinsatz`, `schnellerfassungsBogen`,
 * `staerkeFreigeben`, `erfassungUebernehmen` und der Assistenten-Rahmen
 * (Kopf mit Rückweg in den Einsatz, F2; feste Leiste mit dem Abschluss,
 * R3-G3). Die Rückfragen tragen ihre Audit-Kürzel (R3-E3, R3-N1, R3-S6,
 * R4-E3, R5-A4, R6-E2, R6-E6, R9-S1). Anders hier: kein Assistent mit sechs
 * Schritten (ADR-006), sondern die Abschnitte untereinander; die Stärke ist
 * immer „nur Stärke"; „Stärke eintragen" springt zum Abschnitt Stärke statt
 * zu Schritt 3. Die Sollstärken-Rückfrage (R2-E2, R7-A1) entfällt, weil die
 * Schnellerfassung keine unbenannten Sollplätze vorbelegt.
 */
import { useEffect, useRef, useState } from "react";
import { PersonalErfassung, staerke, type Erfassungsbogen } from "@bos/eeb-format/model";
import { einheitSchluessel, bogenInhaltsId, type Einsatzsammlung } from "@bos/meldekopf/einsaetze";
import { einheitOrt } from "@bos/meldekopf/darstellung";
import { frageJaNein, frageWahl, zeigeHinweis } from "@bos/oberflaeche/dialoge";
import { SeitenKopf } from "@bos/oberflaeche/seiten-kopf";
import { AnzeigeSchalter } from "@bos/oberflaeche/anzeige-schalter";
import { browserKompressor, einheitAnzeigename, neuerBogen, staerkePlausibilitaet } from "../hilfen";
import { EEB_URL_PREFIX, base64UrlKodieren, encodePayload } from "@bos/eeb-format/codec";
import { stempelZeitpunkt } from "../datenschutz-uhr";
import { einsaetzeLaden } from "../einsaetze-lesen";
import { eintreffzeitSetzen, nummerUndZugSetzen, zeitKurz, zeitLang } from "../eintrag-zeiten";
import { meldungsNummern } from "../einheiten-tabelle";
import { entwurfSpeichern, entwurfVerwerfen } from "../entwurf";
import { erfassungFuer } from "./angefangen";
import type { Aufnahme } from "../eingang/aufnahme";
import { EintreffzeitFeld, eintreffzeitPruefen } from "./nacherfassung";
import { AbschnittEinheit } from "./einheit";
import { AbschnittStaerke } from "./staerke";
import { AbschnittFahrzeuge } from "./fahrzeuge";
import { FensterKonflikt, useFensterAbgleich } from "../fenster-abgleich";

/** Ab so langer Erfassung ohne „Eingetroffen um" fragt die Übernahme nach der Zeit (R3-S6). */
export const ERFASSUNG_PAUSE_MS = 5 * 60_000;

/** Leerer Bogen für die Schnellerfassung (nur Stärke). */
export function schnellerfassungsBogen(): Erfassungsbogen {
  return {
    ...neuerBogen(),
    personalErfassung: PersonalErfassung.NUR_STAERKE,
    staerkeManuell: { fuehrer: 0, unterfuehrer: 0, mannschaft: 0, gesamt: 0 },
  };
}

/** „0 / 2 / 6 / 8" */
function staerkeKurz(b: Erfassungsbogen): string {
  const s = staerke(b);
  return `${s.fuehrer} / ${s.unterfuehrer} / ${s.mannschaft} / ${s.gesamt}`;
}

export function Schnellerfassung({
  einsatz,
  aufnahme,
  setMeldung,
  onEnde,
}: {
  einsatz: Einsatzsammlung;
  aufnahme: Aufnahme;
  setMeldung: (text: string) => void;
  /** Zurück in die Einsatzansicht — nach dem Übernehmen, Verwerfen oder über „‹ Einsatz". */
  onEnde: () => void;
}) {
  // Eine angefangene Erfassung für diese Sammlung samt Zettel-Angaben fortsetzen (R9-S1).
  const [start] = useState(() => erfassungFuer(einsatz.id));
  const [bogen, setBogen] = useState<Erfassungsbogen>(() => start?.bogen ?? schnellerfassungsBogen());
  const [beginn] = useState<number>(() => start?.fremd?.beginn ?? Date.now());
  const [zeit, setZeit] = useState(start?.fremd?.zettel?.zeit ?? "");
  const [nummer, setNummer] = useState(start?.fremd?.zettel?.nr ?? "");
  const [zug, setZug] = useState(start?.fremd?.zettel?.zug ?? "");
  const [gespeichert, setGespeichert] = useState(true);
  const staerkeAbschnitt = useRef<HTMLDivElement>(null);
  const beendet = useRef(false);

  // Jede Änderung landet sofort im Entwurf: Ein Neuladen oder ein leerer Akku
  // nimmt die halbe Erfassung nicht mit.
  // Dieselbe Erfassung in einem zweiten Fenster (installierte App und Browser):
  // nicht still überschreiben, sondern fragen (R2-O4). Einen Rückholplatz wie im
  // Erfassungsbogen gibt es hier nicht.
  const bogenRef = useRef(bogen);
  bogenRef.current = bogen;
  const fenster = useFensterAbgleich(true, () => {}, { eigenerBogen: () => bogenRef.current, rueckholplatz: false });

  useEffect(() => {
    if (beendet.current) return;
    setGespeichert(
      entwurfSpeichern(bogen, {
        fremd: { einsatzId: einsatz.id, beginn, zettel: { zeit: zeit || undefined, nr: nummer || undefined, zug: zug || undefined } },
      }),
    );
  }, [bogen, zeit, nummer, zug, einsatz.id, beginn, fenster.runde]);

  // Jede Bearbeitung datiert den Stand neu — Zeitgruppe im PDF und Reihenfolge der Fassungen.
  const aendern = (patch: Partial<Erfassungsbogen>) => setBogen((b) => ({ ...b, ...patch, stand: stempelZeitpunkt() }));

  function beenden() {
    beendet.current = true;
    entwurfVerwerfen();
    onEnde();
  }

  /**
   * „‹ Einsatz": Die Erfassung bleibt als Entwurf liegen und lässt sich über
   * „Einheit manuell erfassen…" fortsetzen. Nach einem Neuladen steht die App
   * dann im Einsatz, nicht im halbfertigen Formular (R5-N3).
   */
  function zurueckInDenEinsatz() {
    beendet.current = true;
    entwurfSpeichern(bogen, {
      fremd: { einsatzId: einsatz.id, beginn, startseite: true, zettel: { zeit: zeit || undefined, nr: nummer || undefined, zug: zug || undefined } },
    });
    onEnde();
  }

  function zurStaerke() {
    const ziel = staerkeAbschnitt.current;
    ziel?.scrollIntoView?.({ block: "start" });
    ziel?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true });
  }

  /**
   * Stärke 0: Die Einheit galt sonst als angekommen, ihre Leute fehlten in
   * Stärke, Verpflegung und Unterbringung (Audit Runde 3, R3-N1).
   * Rückgabe: true = ablegen.
   */
  async function staerkeFreigeben(b: Erfassungsbogen): Promise<boolean> {
    if (staerke(b).gesamt > 0) return true;
    const wahl = await frageWahl({
      titel: "Stärke fehlt",
      text: `„${einheitAnzeigename(b.einheit)}" hat noch keine Stärke (0 Personen). In der Lage zählte sie als Einheit ohne Leute.`,
      wege: [
        { wert: "eintragen", label: "Stärke eintragen", hinweis: "Springt zu den Zählern — die Zahl genügt." },
        { wert: "null", label: "Trotzdem mit Stärke 0 übernehmen", hinweis: "Die Karte trägt die Marke „Stärke fehlt“; nachtragen als Folgemeldung.", gefahr: true },
      ],
    });
    if (wahl === "eintragen") zurStaerke();
    return wahl === "null";
  }

  async function uebernehmen() {
    const b = bogen;
    // Ohne Namen keine Meldung: Eine Einheit „THW" mit Stärke 0 ließ sich
    // niemandem zuordnen (Audit Runde 3, R3-E3, R3-G3).
    if (!einheitOrt(b.einheit) && b.einheit.standortRef == null) {
      await zeigeHinweis({
        // Das Feld heißt „Ort der Einheit (Pflicht)“; die Rückfrage nennt es so (Audit Phase 6, Neuling).
        titel: "Ort der Einheit fehlt",
        text: "Ohne Ort lässt sich die Meldung keiner Einheit zuordnen — in der Lage stünde nur die Organisation. Bitte zuerst „Ort der Einheit“ eintragen.",
        ok: "Zum Feld „Ort der Einheit“",
      });
      const feld = document.getElementById("feld-einheit-name");
      feld?.scrollIntoView?.({ block: "center" });
      feld?.focus({ preventScroll: true });
      return;
    }
    if (!(await staerkeFreigeben(b))) return;
    // Zahlendreher („99" statt „9"), bevor die Einheit in die Lage zählt (Audit Runde 6, R6-E6).
    const warnungen = staerkePlausibilitaet(staerke(b));
    if (warnungen.length > 0) {
      const ja = await frageJaNein({
        titel: "Stimmt die Stärke?",
        text: (
          <>
            <p>Stärke {staerkeKurz(b)}</p>
            <ul>
              {warnungen.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </>
        ),
        ok: "Ja, so übernehmen",
        abbruch: "Zahlen korrigieren",
        fokus: "abbruch", // Enter ersetzt sonst die Zahlen (R9-D4)
      });
      if (!ja) {
        zurStaerke();
        return;
      }
    }
    let eintreffzeit: number | null = null;
    const gelesen = eintreffzeitPruefen(zeit);
    if (gelesen.art === "zeit") eintreffzeit = gelesen.zeit;
    else if (gelesen.art === "frage") {
      // Zukunft, und gestern läge fast einen Tag zurück: fragen statt still auf
      // gestern zu legen (R4-E3). Der sichere Weg steht vorn (R5-E5).
      const wahl = await frageWahl({
        titel: "Stimmt die Zeit?",
        text: `„Eingetroffen um" ${zeit} liegt in der Zukunft — Stunde oder Tag vertauscht? Jetzt ist es ${zeitKurz(Date.now())} Uhr.`,
        wege: [
          { wert: "korrigieren", label: "Zeit korrigieren", hinweis: "Das Feld „Eingetroffen um“ bleibt offen, der Wert steht zum Ändern darin." },
          { wert: "heute", label: `Trotzdem heute ${zeitLang(gelesen.heute)}` },
          { wert: "gestern", label: `Gestern ${zeitLang(gelesen.gestern)}` },
        ],
      });
      if (!wahl || wahl === "korrigieren") return;
      eintreffzeit = wahl === "gestern" ? gelesen.gestern : gelesen.heute;
    }
    // Kein Blatt-Wert und eine Unterbrechung dazwischen: fragen statt die
    // Uhrzeit des Übernehmens still zur Eintreffzeit zu machen (R3-S6).
    if (eintreffzeit == null && Date.now() - beginn > ERFASSUNG_PAUSE_MS) {
      const wahl = await frageWahl({
        titel: "Wann ist die Einheit eingetroffen?",
        text: `Die Erfassung von „${einheitAnzeigename(b.einheit)}" läuft seit ${zeitKurz(beginn)} Uhr, „Eingetroffen um" ist leer.`,
        wege: [
          { wert: "beginn", label: `Um ${zeitKurz(beginn)} (Beginn der Erfassung)` },
          { wert: "jetzt", label: `Jetzt, ${zeitKurz(Date.now())}` },
        ],
      });
      if (!wahl) return;
      if (wahl === "beginn") eintreffzeit = beginn;
    }
    // „Nr. laut Zettel": eine ganze Zahl ab 1, nicht schon an eine andere Einheit vergeben (R5-A4).
    let zettelNr: number | undefined;
    if (nummer.trim() !== "") {
      const n = Number(nummer.trim());
      if (!Number.isInteger(n) || n < 1) {
        await zeigeHinweis({ titel: "Nr. laut Zettel", text: "Bitte eine ganze Zahl ab 1 eintragen oder das Feld leer lassen — dann vergibt die App die Nummer." });
        return;
      }
      const sammlung = einsaetzeLaden().find((s) => s.id === einsatz.id);
      const belegt = sammlung ? [...meldungsNummern(sammlung.eintraege)].find(([schl, nr]) => nr === n && schl !== einheitSchluessel(b.einheit)) : undefined;
      if (belegt) {
        const wer = sammlung!.eintraege.find((e) => e.einheitSchluessel === belegt[0]);
        await zeigeHinweis({
          titel: "Nr. schon vergeben",
          text: `Nr. ${n} gehört schon ${wer ? `„${einheitAnzeigename(wer.bogen.einheit)}“` : "einer anderen Einheit"}. Eine andere Nummer eintragen oder das Feld leer lassen.`,
        });
        return;
      }
      zettelNr = n;
    }
    setMeldung("");
    const vorherDa = new Set(einsaetzeLaden().find((s) => s.id === einsatz.id)?.eintraege.map((e) => e.id));
    // Von Hand erfasst ist kein signierter Transport.
    const ok = await aufnahme.bogenInSammlung(einsatz.id, b, "manuell");
    if (!ok) {
      // Voller Speicher: Ein Dialog nennt die Zahl, die sich sonst nirgends mehr
      // findet; die Eingaben bleiben stehen (Audit Runde 6, R6-E2).
      const grund = aufnahme.ablageFehlerText();
      if (grund) {
        await zeigeHinweis({
          titel: "Nicht übernommen",
          text: (
            <>
              <p>{grund}</p>
              <p>
                <strong>
                  „{einheitAnzeigename(b.einheit) || "Einheit"}“, Stärke {staerkeKurz(b)}: bitte auf dem Meldeblock notieren, Platz schaffen und
                  dann noch einmal übernehmen. Die Eingaben bleiben stehen.
                </strong>
              </p>
            </>
          ),
        });
      }
      return;
    }
    // Uhrzeit, Nummer und Zug vom Blatt an die NEUE Einheit (R2-A5). Eine
    // Folgemeldung erbt die Eintreffzeit ihrer Vorgängerin, die bleibt maßgeblich.
    const eintraege = einsaetzeLaden().find((s) => s.id === einsatz.id)?.eintraege ?? [];
    const neu = eintraege.find((e) => e.id === bogenInhaltsId(b) && !vorherDa.has(e.id));
    let nrSatz = "";
    if (neu && eintraege.filter((e) => e.einheitSchluessel === neu.einheitSchluessel).length === 1) {
      if (eintreffzeit != null) eintreffzeitSetzen(einsatz.id, neu.id, eintreffzeit);
      if (zettelNr != null || zug.trim() !== "") nummerUndZugSetzen(einsatz.id, neu.id, { nummer: zettelNr, zug });
      // Ohne Nr. vom Zettel: sagen, welche die App vergeben hat — sie gehört auf
      // den Zettel, sonst laufen Papier und Gerät in zwei Nummernreihen (R5-A4).
      if (zettelNr == null) {
        const nr = meldungsNummern(einsaetzeLaden().find((s) => s.id === einsatz.id)?.eintraege ?? []).get(neu.einheitSchluessel);
        if (nr != null) nrSatz = `„${einheitAnzeigename(b.einheit)}“ hat Nr. ${nr} — die Nummer auf dem Zettel eintragen.`;
      }
    }
    if (nrSatz) setMeldung(nrSatz);
    beenden();
  }

  /**
   * „Vollständig erfassen": Namen, Funktionen, Fahrerlaubnisse und Sofortbedarf
   * gehören in den Erfassungsbogen, nicht in diese App (ADR-006). Er öffnet in
   * einem neuen Tab mit dem bisher Erfassten im Fragment (geht nicht an den
   * Server); der fertige Bogen kommt per QR-Code oder Link zurück. Die
   * Erfassung hier bleibt als Entwurf liegen, bis er da ist.
   */
  async function imErfassungsbogen() {
    const ja = await frageJaNein({
      titel: "Im Erfassungsbogen vollständig erfassen?",
      text:
        "Der Erfassungsbogen öffnet sich in einem neuen Tab mit dem, was hier schon steht. Dort Personal, Fahrzeuge und Bedarf ergänzen " +
        "und den fertigen Bogen als QR-Code oder Link zurückgeben; hier mit „Bogen scannen…“ einlesen. Diese Erfassung bleibt bis dahin als Entwurf stehen.",
      ok: "Erfassungsbogen öffnen",
    });
    if (!ja) return;
    window.open(EEB_URL_PREFIX + base64UrlKodieren(encodePayload(bogen, browserKompressor)), "_blank", "noopener");
  }

  async function verwerfen() {
    const ja = await frageJaNein({
      titel: "Erfassung verwerfen?",
      text: `„${einheitAnzeigename(bogen.einheit) || "(noch ohne Namen)"}" wird nicht übernommen; die Eingaben gehen verloren.`,
      ok: "Verwerfen",
      gefahr: true,
      fokus: "abbruch",
    });
    if (ja) beenden();
  }

  const zuege = [...new Set(einsatz.eintraege.map((e) => e.zugEtikett).filter((z): z is string => !!z))].sort();

  return (
    <>
      <SeitenKopf variante="assistent-kopf">
        <div className="kopf-oberzeile">
          {/* Der Rückweg führt in den Einsatz (F2); die Erfassung bleibt als Entwurf liegen. */}
          <button type="button" className="zur-start" onClick={zurueckInDenEinsatz}>
            ‹ Einsatz „{einsatz.name}“
          </button>
          <AnzeigeSchalter klappbar />
        </div>
        <div className="titelzeile">
          <h1>Einheit erfassen</h1>
          <span className="modus-marke" title={`Diese Erfassung wird als Meldung in die Sammlung „${einsatz.name}" gelegt.`}>
            Aufnahme für: {einsatz.name}
          </span>
        </div>
      </SeitenKopf>
      <main id="inhalt" tabIndex={-1} className="schnellerfassung mit-uebernehmen">
        <p className="hinweis">
          Es reichen der Name der Einheit und die Stärke; Fahrzeuge und Führungskraft können offen bleiben.
          {!gespeichert && !fenster.konflikt && <strong> Nicht gespeichert — der Gerätespeicher nimmt nichts an. Bitte zügig übernehmen.</strong>}
        </p>
        {/* Die Uhrzeit vom Meldeblock gleich oben mitnehmen, statt sie danach je Karte über „ändern" (R2-A5). */}
        <EintreffzeitFeld wert={zeit} onAendern={setZeit} nummer={nummer} onNummer={setNummer} zug={zug} onZug={setZug} zuege={zuege} />
        <AbschnittEinheit bogen={bogen} aendern={aendern} kompakt />
        <div ref={staerkeAbschnitt} id="abschnitt-staerke">
          <AbschnittStaerke bogen={bogen} aendern={aendern} />
        </div>
        <AbschnittFahrzeuge bogen={bogen} aendern={aendern} />
        <p className="knopfreihe">
          <button type="button" onClick={() => void imErfassungsbogen()}>
            Im Erfassungsbogen vollständig erfassen…
          </button>
          <button type="button" className="gefahr" onClick={() => void verwerfen()}>
            Erfassung verwerfen…
          </button>
        </p>
      </main>
      {fenster.konflikt && <FensterKonflikt abgleich={fenster} />}
      {/* Der Abschluss in der festen Leiste, in eigener Zeile (R3-G3). */}
      <footer className="nav assistent-nav mit-uebernehmen">
        <button type="button" className="uebernehmen" onClick={() => void uebernehmen()}>
          In Einsatz übernehmen
        </button>
      </footer>
    </>
  );
}
