/**
 * Herkunft: neu in der Meldekopf-App (Rollenaudit Runde 2, Meldekopf P1-1).
 *
 * „Angaben berichtigen…" an der Karte einer von Hand erfassten Einheit. Nach „In Einsatz
 * übernehmen" ließen sich nur Stärke, Ort, Zeiten und Auftrag ändern. Ein falscher
 * Einheitstyp, ein vergessenes Fahrzeug oder eine falsche Führungskraft blieben stehen, und
 * wer die Einheit deshalb noch einmal erfasste, bekam ohne Rückfrage eine zweite Einheit:
 * 136 Helfer wurden 145.
 *
 * Die Seite zeigt dieselben Abschnitte wie die Schnellerfassung (Einheit, Stärke mit
 * Führungskraft, Fahrzeuge), gefüllt mit den Angaben der Einheit. „Berichtigung übernehmen"
 * legt wie „Stärke ändern…" und „Ort der Einheit ändern…" eine neue Fassung derselben Einheit
 * ab: Nummer, Eintreffzeit, Auftrag und Historie bleiben, die bisherige Fassung steht in der
 * Historie und lässt sich dort über „Diese Fassung gilt…" zurückholen.
 *
 * Bewusst ohne Entwurf: Der eine Entwurfsplatz des Geräts gehört der angefangenen Erfassung
 * einer neuen Einheit. Geht eine Berichtigung durch ein Neuladen verloren, steht die Einheit
 * unverändert in der Lage.
 */
import { useState } from "react";
import { staerke, type Erfassungsbogen } from "@bos/eeb-format/model";
import { einheitSchluessel, type Einsatzsammlung, type MeldeEintrag } from "@bos/meldekopf/einsaetze";
import { meldungAufnehmen } from "../eintrag-zeiten";
import { einheitOrt } from "@bos/meldekopf/darstellung";
import { frageJaNein, zeigeHinweis } from "@bos/oberflaeche/dialoge";
import { SeitenKopf } from "@bos/oberflaeche/seiten-kopf";
import { AnzeigeSchalter } from "@bos/oberflaeche/anzeige-schalter";
import { einheitAnzeigename, staerkePlausibilitaet } from "../hilfen";
import { stempelZeitpunkt } from "../datenschutz-uhr";
import { einsaetzeLaden } from "../einsaetze-lesen";
import { angabenVermerken, fassungObenauf } from "../fassung-vorrang";
import { standAbsenderVermerken } from "../stand-absender";
import { meldungsNummern } from "../einheiten-tabelle";
import { fehlerText } from "../nachladen";
import { AbschnittEinheit } from "./einheit";
import { AbschnittStaerke } from "./staerke";
import { AbschnittFahrzeuge } from "./fahrzeuge";

/** Der Inhalt eines Bogens ohne den Stand: Hat sich an den Angaben etwas geändert? */
function inhalt(b: Erfassungsbogen): string {
  return JSON.stringify({ ...b, stand: 0 });
}

/**
 * Führt die Sammlung unter den berichtigten Angaben schon eine ANDERE Einheit? Dann wären es nach dem Übernehmen zwei
 * Karten mit demselben Namen. Verglichen wird der Schlüssel der Einheit (Organisation, Ort, Einheitstyp), wie ihn die
 * Aufnahme bildet; die berichtigte Einheit selbst zählt nicht.
 */
export function berichtigungTrifftAndere(sammlung: Einsatzsammlung | undefined, eintrag: MeldeEintrag, neu: Erfassungsbogen): MeldeEintrag | undefined {
  const schl = einheitSchluessel(neu.einheit, neu.personal);
  if (schl === eintrag.einheitSchluessel) return undefined;
  return sammlung?.eintraege.find((e) => e.einheitSchluessel === schl && e.einheitSchluessel !== eintrag.einheitSchluessel);
}

/**
 * Legt die berichtigten Angaben als neue Fassung derselben Einheit ab. Rückgabe: der neue Eintrag, `null`, wenn nichts
 * abzulegen war. Wirft bei vollem Speicher (der Aufrufer sagt es dem Helfer).
 */
export function berichtigungAblegen(einsatzId: string, eintrag: MeldeEintrag, bogen: Erfassungsbogen, jetzt = stempelZeitpunkt()): MeldeEintrag | null {
  // Der Stand liegt nie vor dem der bisherigen Fassung, sonst gälte die alte weiter (fassung-vorrang.ts).
  const neu: Erfassungsbogen = { ...bogen, stand: Math.max(jetzt, eintrag.bogen.stand) };
  const quelle = eintrag.quelle === "aufteilung" || eintrag.quelle === "zusammenfuehrung" ? "manuell" : eintrag.quelle;
  const r = meldungAufnehmen(einsatzId, neu, { quelle, einheitSchluesselOverride: eintrag.einheitSchluessel });
  if (!r?.neu) return null;
  fassungObenauf(einsatzId, r.eintrag.id);
  // Das Alter der Angaben bleibt das der Meldung; der Vermerk nennt die Berichtigung, keine Folgemeldung.
  angabenVermerken(einsatzId, r.eintrag.id, eintrag, "berichtigt");
  standAbsenderVermerken(einsatzId, r.eintrag.id, eintrag);
  return r.eintrag;
}

export function Berichtigung({
  einsatz,
  eintrag,
  setMeldung,
  onEnde,
}: {
  einsatz: Einsatzsammlung;
  /** Die geltende Fassung der Einheit, deren Angaben berichtigt werden. */
  eintrag: MeldeEintrag;
  setMeldung: (text: string) => void;
  /** Zurück in die Einsatzansicht, nach dem Übernehmen oder Abbrechen. */
  onEnde: () => void;
}) {
  const [bogen, setBogen] = useState<Erfassungsbogen>(() => structuredClone(eintrag.bogen));
  const aendern = (patch: Partial<Erfassungsbogen>) => setBogen((b) => ({ ...b, ...patch }));
  const vorherName = einheitAnzeigename(eintrag.bogen.einheit);
  const nr = meldungsNummern(einsatz.eintraege).get(eintrag.einheitSchluessel);
  const wer = `${nr != null ? `Nr. ${nr} ` : ""}„${vorherName}“`;
  const geaendert = inhalt(bogen) !== inhalt(eintrag.bogen);

  async function abbrechen() {
    if (geaendert) {
      const ja = await frageJaNein({
        titel: "Berichtigung verwerfen?",
        text: `${wer} bleibt, wie sie in der Lage steht; die Änderungen hier gehen verloren.`,
        ok: "Verwerfen",
        abbruch: "Weiter berichtigen",
        gefahr: true,
        fokus: "abbruch",
      });
      if (!ja) return;
    }
    onEnde();
  }

  async function uebernehmen() {
    if (!geaendert) {
      onEnde();
      return;
    }
    if (!einheitOrt(bogen.einheit) && bogen.einheit.standortRef == null) {
      await zeigeHinweis({
        titel: "Ort der Einheit fehlt",
        text: "Ohne Ort lässt sich die Meldung keiner Einheit zuordnen. Bitte „Ort der Einheit“ eintragen.",
        ok: "Zum Feld „Ort der Einheit“",
      });
      const feld = document.getElementById("feld-einheit-name");
      feld?.scrollIntoView?.({ block: "center" });
      feld?.focus({ preventScroll: true });
      return;
    }
    const sammlung = einsaetzeLaden().find((s) => s.id === einsatz.id);
    const andere = berichtigungTrifftAndere(sammlung, eintrag, bogen);
    if (andere) {
      const andereNr = sammlung ? meldungsNummern(sammlung.eintraege).get(andere.einheitSchluessel) : undefined;
      await zeigeHinweis({
        titel: "Diese Einheit ist schon gemeldet",
        text:
          `${andereNr != null ? `Nr. ${andereNr} ` : ""}„${einheitAnzeigename(andere.bogen.einheit)}“ steht schon in diesem Einsatz. ` +
          `Mit diesen Angaben stünde dieselbe Einheit zweimal in der Lage. Ist ${wer} dieselbe Einheit, hier abbrechen und sie an ihrer Karte entfernen.`,
      });
      return;
    }
    const st = staerke(bogen);
    const warnungen = [...(st.gesamt === 0 ? ["Stärke 0: Die Einheit zählte als Einheit ohne Leute."] : []), ...staerkePlausibilitaet(st)];
    // Nur fragen, wenn die Berichtigung die Stärke anfasst; eine alte Auffälligkeit ist schon entschieden.
    if (warnungen.length > 0 && st.gesamt !== staerke(eintrag.bogen).gesamt) {
      const ja = await frageJaNein({
        titel: "Stimmt die Stärke?",
        text: (
          <>
            <p>Stärke {st.fuehrer} / {st.unterfuehrer} / {st.mannschaft} // {st.gesamt}</p>
            <ul>
              {warnungen.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </>
        ),
        ok: "Ja, so übernehmen",
        abbruch: "Zahlen korrigieren",
        fokus: "abbruch",
      });
      if (!ja) return;
    }
    try {
      berichtigungAblegen(einsatz.id, eintrag, bogen);
    } catch (e) {
      await zeigeHinweis({
        titel: "Nicht übernommen",
        text: `${wer} ist NICHT berichtigt. ${fehlerText(e)} Die Eingaben bleiben stehen.`,
      });
      return;
    }
    const neuerName = einheitAnzeigename(bogen.einheit);
    const vorher = staerke(eintrag.bogen).gesamt;
    setMeldung(
      `${nr != null ? `Nr. ${nr} ` : ""}berichtigt: „${neuerName}“${neuerName !== vorherName ? ` (bisher „${vorherName}“)` : ""}` +
        `${st.gesamt !== vorher ? `, Stärke ${vorher} → ${st.gesamt}` : ""}. Nummer, Eintreffzeit und Auftrag bleiben; die bisherige Fassung steht in der Historie der Karte.`,
    );
    onEnde();
  }

  return (
    <>
      <SeitenKopf variante="assistent-kopf">
        <div className="kopf-oberzeile">
          <button type="button" className="zur-start" onClick={() => void abbrechen()}>
            ‹ Einsatz „{einsatz.name}“
          </button>
          <AnzeigeSchalter klappbar />
        </div>
        <div className="titelzeile">
          <h1>Angaben berichtigen</h1>
          <span className="modus-marke" title="Die Einheit behält Nummer, Eintreffzeit, Auftrag und Historie.">
            {wer}
          </span>
        </div>
      </SeitenKopf>
      <main id="inhalt" tabIndex={-1} className="schnellerfassung mit-uebernehmen berichtigung">
        <p className="hinweis">
          Hier steht, was für {wer} erfasst ist. Ändern, was falsch ist, dann „Berichtigung übernehmen“. Die Einheit bleibt dieselbe: Nummer,
          Eintreffzeit, Auftrag und Historie bleiben, die Summen rechnen mit den neuen Angaben. Nicht für eine weitere Einheit benutzen.
        </p>
        <AbschnittEinheit bogen={bogen} aendern={aendern} kompakt />
        <div id="abschnitt-staerke">
          <AbschnittStaerke bogen={bogen} aendern={aendern} />
        </div>
        <AbschnittFahrzeuge bogen={bogen} aendern={aendern} />
        <p className="knopfreihe">
          <button type="button" onClick={() => void abbrechen()}>
            Abbrechen, nichts ändern
          </button>
        </p>
      </main>
      <footer className="nav assistent-nav mit-uebernehmen">
        <button type="button" className="uebernehmen" onClick={() => void uebernehmen()}>
          Berichtigung übernehmen
        </button>
      </footer>
    </>
  );
}
