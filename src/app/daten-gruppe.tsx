/**
 * Die Gruppe „Daten" der Fußzeile: Datensicherung erstellen und einspielen,
 * Geräteschlüssel neu erzeugen, alle Daten löschen — samt ihrer Dialoge.
 *
 * Herkunft: Erfassungsbogen `src/app/fusszeile.tsx` (Commit 441811c), die
 * Gruppe „Daten" mit ihren Zuständen, Wegen und Dialogen (R2-D3, R2-O6,
 * R4-D2, R4-D5, R5-D4, R7-D6, R7-D7, R9-D2) sowie `BestandListe` und
 * `SpeicherStand`. Hier als eigener Baustein, weil die Fußzeile des Meldekopfs
 * sonst kaum etwas mit der des Erfassungsbogens teilt (keine Beispielbögen,
 * keine Organisationsseiten). Die Sicherung trägt dasselbe Format und dieselben
 * Schlüssel wie im Erfassungsbogen (ADR-007): Eine Sicherung von dort spielt
 * hier ein und zeigt die Sammlungen; Vorlagen und Entwurf darin bleiben
 * erhalten, auch wenn diese App sie nicht anzeigt.
 */

import { useRef, useState, type ChangeEvent, type ReactNode, type RefObject } from "react";
import { frageWahl, zeigeHinweis } from "@bos/oberflaeche/dialoge";
import { istNativ, textTeilen } from "./nativ";
import { blobAlsDownload } from "./hilfen";
import {
  alleDatenLoeschen,
  datenUmfang,
  bestandBetroffen,
  bestandUmfang,
  folgenVorhanden,
  geraetBestand,
  letzteSicherung,
  sicherungErstellen,
  sicherungFaellig,
  sicherungErstelltAm,
  sicherungEinspielen,
  sicherungParsen,
  type BestandUmfang,
  type DatenUmfang,
} from "./sicherung";
import { dateiFehlerMeldung } from "./eingang/datei-fehler";
import { geraeteKurzform, geraeteSchluesselLoeschen, geraeteSchluesselPrivat, geraeteSchluesselSicherstellen, kurzformAusPrivatHex } from "./geraete-schluessel";
import { speicherBelegung, speicherText } from "./eintrag-zeiten";
import { groessteText, istVoll } from "./speicher-warnung";
import { dauerhaftenSpeicherAnfragen, speicherDauerhaft } from "./speicher-browser";
import { folgenText } from "./uhr-folgen";

/** Der Dialograhmen der Fußzeile (fusszeile.tsx), hier hineingereicht. */
export type DialogRahmen = (p: {
  titel: string;
  dialogRef: RefObject<HTMLDialogElement | null>;
  klasse?: string;
  onSchliessen?: () => void;
  children: ReactNode;
}) => ReactNode;

export function DatenGruppe({ Dialog }: { Dialog: DialogRahmen }) {
  const sicherung = useRef<HTMLDialogElement>(null);
  const [sicherungFehler, setSicherungFehler] = useState("");
  // Rückfrage vor dem Einspielen — wie „Alle Daten löschen" mit Zahlen,
  // Sicherungs-Ausweg und Haken, denn die Folge für den Bestand ist dieselbe
  // (Audit Runde 2, R2-D3). Der Stand wird beim Öffnen erhoben.
  const einspielen = useRef<HTMLDialogElement>(null);
  const [einspielStand, setEinspielStand] = useState<{
    text: string;
    name: string;
    erstellt: string | null;
    datei: BestandUmfang;
    geraet: BestandUmfang;
    /** Kurzform des Geräteschlüssels vorher (Gerät) und nachher (Datei), R4-D2. */
    kurzGeraet: string | null;
    kurzDatei: string | null;
  } | null>(null);
  const [einspielVerstanden, setEinspielVerstanden] = useState(false);
  // Zweiter Haken, wenn Beiseitegelegtes (nicht lesbare Daten) mit verschwindet (R9-D2).
  const [beiseiteVerstanden, setBeiseiteVerstanden] = useState(false);
  // Wann zuletzt gesichert, ob eine Erinnerung fällig ist und ob der Browser
  // den Speicher dauerhaft vorhält (Audit Runde 2, R2-O6). Der Speicherstatus
  // wird beim Öffnen der Datensicherung erhoben (asynchron).
  const [zuletztGesichert, setZuletztGesichert] = useState(() => letzteSicherung());
  const [erinnerung, setErinnerung] = useState(() => sicherungFaellig());
  const [dauerhaft, setDauerhaft] = useState<boolean | null>(null);
  const loeschen = useRef<HTMLDialogElement>(null);
  // Stand beim Öffnen des Löschen-Dialogs — die Rückfrage nennt Zahlen, damit
  // niemand „alles löschen" blind bestätigt.
  const [loeschUmfang, setLoeschUmfang] = useState<DatenUmfang | null>(null);
  // Zweite Bestätigung im Dialog selbst (statt window.confirm): der Haken steht
  // neben der Liste dessen, was verschwindet, und ist nach dem Schließen wieder
  // leer — ein zweiter Klick allein löscht also nie.
  const [loeschVerstanden, setLoeschVerstanden] = useState(false);
  const [loeschFehler, setLoeschFehler] = useState("");

  // Fehlschlag beim Neuerzeugen des Geräteschlüssels — steht in der Fußzeile
  // selbst, weil der Weg ohne eigenen Dialog auskommt (nur Rückfrage + Hinweis).
  const [schluesselFehler, setSchluesselFehler] = useState("");

  async function sicherungExportieren() {
    const inhalt = sicherungErstellen();
    setZuletztGesichert(letzteSicherung());
    setErinnerung(null);
    const name = `eeb-sicherung-${new Date().toISOString().slice(0, 10)}.json`;
    if (istNativ()) {
      await textTeilen(name, inhalt);
      return;
    }
    blobAlsDownload(name, new Blob([inhalt], { type: "application/json" }));
  }

  async function sicherungImportieren(e: ChangeEvent<HTMLInputElement>) {
    const datei = e.target.files?.[0];
    e.target.value = "";
    if (!datei) return;
    setSicherungFehler("");
    // Erst prüfen, dann fragen: Eine kaputte oder falsche Datei soll nicht
    // zuerst „alles ersetzen?" auslösen und danach Parser-Text zeigen
    // (Audit Runde 2, R2-E5).
    let text: string;
    try {
      text = await datei.text();
      sicherungParsen(text);
    } catch (err) {
      setSicherungFehler(await dateiFehlerMeldung(datei, err, "sicherung"));
      return;
    }
    const dateiBestand = bestandUmfang(sicherungParsen(text));
    const geraet = geraetBestand();
    setEinspielStand({
      text,
      name: datei.name,
      erstellt: sicherungErstelltAm(text),
      datei: dateiBestand,
      geraet,
      kurzGeraet: geraet.geraeteschluessel ? await kurzformAusPrivatHex(geraet.geraeteschluessel) : null,
      kurzDatei: dateiBestand.geraeteschluessel ? await kurzformAusPrivatHex(dateiBestand.geraeteschluessel) : null,
    });
    setEinspielVerstanden(false);
    setBeiseiteVerstanden(false);
    einspielen.current?.showModal();
  }

  /** Nach der Rückfrage: wirklich ersetzen und neu laden. */
  async function einspielenJetzt() {
    if (!einspielStand) return;
    const { text } = einspielStand;
    einspielen.current?.close(); // ein Fehler erscheint im Dialog „Datensicherung" dahinter
    try {
      const anzahl = sicherungEinspielen(text);
      await zeigeHinweis({
        titel: "Sicherung eingespielt",
        text: `${anzahl} Einträge übernommen. Die App lädt jetzt neu.`,
        ok: "Neu laden",
      });
      window.location.reload();
    } catch (err) {
      setSicherungFehler(err instanceof Error ? err.message : String(err));
    }
  }

  /** Datensicherung öffnen und den Speicherstatus des Browsers erheben. */
  function sicherungOeffnen() {
    setSicherungFehler("");
    sicherung.current?.showModal();
    void speicherDauerhaft().then(setDauerhaft);
  }

  async function dauerhaftAnfragen() {
    setDauerhaft(await dauerhaftenSpeicherAnfragen());
  }

  /** Löschen-Dialog öffnen: Stand frisch erheben, Bestätigung zurücksetzen. */
  function loeschenOeffnen() {
    setLoeschUmfang(datenUmfang());
    setLoeschVerstanden(false);
    setLoeschFehler("");
    loeschen.current?.showModal();
  }

  /**
   * Alles löschen und neu laden: der laufende Stand in React (offener Entwurf,
   * geladene Vorlagen) wüsste sonst nichts vom leeren Speicher und könnte ihn
   * beim nächsten Speichern wieder auffüllen.
   */
  async function alleDatenLoeschenJetzt() {
    try {
      const anzahl = alleDatenLoeschen();
      await zeigeHinweis({
        titel: "Alle lokalen Daten gelöscht",
        text: `${anzahl} Einträge entfernt. Die App startet jetzt neu.`,
        ok: "Neu starten",
      });
      window.location.reload();
    } catch (err) {
      setLoeschFehler(err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Geräteschlüssel verwerfen und sofort einen neuen erzeugen — der Weg für den
   * Verdacht, dass der private Schlüssel abgeflossen ist (M3 im
   * Informationssicherheitskonzept). Der neue Schlüssel wird gleich hier erzeugt
   * statt beim nächsten Signieren, damit die Kurzform in der Bestätigung steht:
   * ohne sie wüssten die Empfänger nicht, worauf sie künftig prüfen sollen.
   * Danach wird neu geladen, weil die Übersicht die alte Kurzform und den alten
   * QR-Code sonst weiter anzeigt.
   */
  async function geraeteSchluesselNeuErzeugen() {
    // Ohne vorhandenen Schlüssel wird nichts gelöscht — der Text sagt, was wirklich geschieht (R7-D6).
    const hatSchluessel = geraeteSchluesselPrivat() != null;
    let sicher = false;
    for (let runde = 0; runde < 5 && !sicher; runde++) {
      const wahl = await frageWahl({
        titel: "Geräteschlüssel neu erzeugen?",
        text: (
          <>
            <p>
              {hatSchluessel
                ? "Der bisherige Signaturschlüssel dieses Geräts wird gelöscht und durch ein neues Schlüsselpaar ersetzt."
                : "Auf diesem Gerät liegt noch kein Signaturschlüssel; es wird ein neues Schlüsselpaar erzeugt, gelöscht wird nichts."}{" "}
              Sinnvoll ist das bei Verdacht, dass der private Schlüssel in fremde Hände geraten ist —
              etwa nach Verlust oder Weitergabe des Geräts.
            </p>
            <p>
              <strong>Empfänger müssen die Kurzform danach neu abgleichen:</strong> Bögen von
              diesem Gerät tragen ab sofort eine andere Kurzform. Bereits verschickte Bögen
              bleiben gültig und prüfbar — aber nur gegen den alten öffentlichen Schlüssel,
              und der lässt sich danach nur aus einer früheren Sicherungsdatei wiederherstellen.
            </p>
          </>
        ),
        wege: [
          ...(hatSchluessel
            ? [
                {
                  wert: "sichern",
                  label: "Vorher Sicherung erstellen…",
                  hinweis: "Die Sicherungsdatei enthält den bisherigen Schlüssel. Danach fragt die App erneut.",
                },
              ]
            : []),
          { wert: "neu", label: "Neu erzeugen", gefahr: true },
        ],
      });
      if (wahl === "sichern") {
        await sicherungExportieren();
        continue;
      }
      sicher = wahl === "neu";
      if (!sicher) return;
    }
    if (!sicher) return;
    try {
      geraeteSchluesselLoeschen();
      await geraeteSchluesselSicherstellen();
      const kurz = await geraeteKurzform();
      await zeigeHinweis({
        titel: "Geräteschlüssel neu erzeugt",
        text: kurz
          ? `Die neue Kurzform lautet ${kurz}. Sie muss den Empfängern bekannt gemacht werden. Die App lädt jetzt neu.`
          : "Der neue Schlüssel steht. Die App lädt jetzt neu.",
        kopiertext: kurz ?? undefined,
        ok: "Neu laden",
      });
      window.location.reload();
    } catch (err) {
      setSchluesselFehler(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
        <nav className="fuss-gruppe" aria-label="Daten">
          <span className="fuss-titel">Daten</span>
          <button type="button" className="link" onClick={sicherungOeffnen}>Datensicherung</button>
          {/* Dezente Erinnerung, solange wertvolle Daten ungesichert altern
              (R2-O6) — kein Dialog, der die Arbeit unterbricht. */}
          {erinnerung && (
            <p className="hinweis sicherung-erinnerung">
              {erinnerung.seit
                ? `Letzte Sicherung vor ${Math.floor((Date.now() - erinnerung.seit) / 86_400_000)} Tagen.`
                : "Noch keine Datensicherung erstellt."}{" "}
              Alles liegt nur auf diesem Gerät.{" "}
              <button type="button" className="link" onClick={sicherungOeffnen}>Jetzt sichern…</button>
            </p>
          )}
          <button type="button" className="link" onClick={() => void geraeteSchluesselNeuErzeugen()}>Geräteschlüssel neu erzeugen</button>
          <button type="button" className="link gefahr" onClick={loeschenOeffnen}>Alle Daten löschen</button>
          {schluesselFehler && <p className="fehler">{schluesselFehler}</p>}
        </nav>

      <Dialog titel="Datensicherung" dialogRef={sicherung}>
        <p>
          Alle lokalen Daten dieser App — Vorlagen, Einsatz-Sammlungen, der aktuelle
          Entwurf, Einstellungen und der Signatur-Geräteschlüssel — lassen sich als
          eine Datei sichern und auf einem anderen Gerät (oder nach einer
          Neuinstallation) wieder einspielen.
        </p>
        <p className="warnung">
          Die Datei enthält den privaten Signaturschlüssel und ggf. Personendaten.
          Sicher aufbewahren und nur über vertrauenswürdige Wege übertragen.
        </p>
        <div className="aktionen">
          <button type="button" className="primaer" onClick={() => void sicherungExportieren()}>Sicherung erstellen…</button>
          <label className="datei-knopf">
            Sicherung einspielen…
            <input type="file" accept=".json,application/json" className="nur-sr" onChange={(e) => void sicherungImportieren(e)} />
          </label>
        </div>
        {sicherungFehler && <p className="fehler" role="alert">{sicherungFehler}</p>}
        <p className="hinweis">
          Einspielen ersetzt die vorhandenen App-Daten auf diesem Gerät vollständig.
        </p>
        {/* Wie sicher liegt es hier, und wann gab es zuletzt eine Kopie?
            (Audit Runde 2, R2-O6) */}
        <p className="hinweis" role="status">
          {zuletztGesichert
            ? `Letzte Sicherung auf diesem Gerät erstellt: ${new Date(zuletztGesichert).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })} Uhr.`
            : "Auf diesem Gerät wurde noch keine Sicherung erstellt."}
        </p>
        {dauerhaft === true && (
          <p className="hinweis">
            Der Browser hält den Speicher dieser App dauerhaft vor und räumt ihn nicht von sich aus.
          </p>
        )}
        {dauerhaft === false && (
          <p className="warnung">
            Der Speicher ist nicht dauerhaft: Der Browser darf ihn bei Platzmangel oder nach
            längerer Nichtnutzung räumen. Regelmäßig sichern; auf iPhone und iPad die App über
            „Zum Home-Bildschirm“ ablegen.{" "}
            <button type="button" className="link" onClick={() => void dauerhaftAnfragen()}>
              Dauerhaften Speicher anfragen
            </button>
          </p>
        )}
        {/* Der Speicherstand gehört dorthin, wo aufgeräumt wird: Ein voller
            Speicher trifft sonst ohne Vorwarnung (Audit „Offline und
            Speicher", O4). Die Grenze ist eine Schätzung — Browser nennen
            ihr Limit nicht, üblich sind rund 5 MB. */}
        <SpeicherStand />
      </Dialog>

      {/* Rückfrage vor dem Einspielen: nennt, was auf dem Gerät verschwindet
          und was die Datei bringt, bietet die Sicherung vorher an und
          verlangt einen Haken, sobald laufende Sammlungen betroffen sind
          (Audit Runde 2, R2-D3). */}
      <Dialog titel="Sicherung einspielen?" dialogRef={einspielen} onSchliessen={() => setEinspielStand(null)}>
        {einspielStand && (() => {
          const laufendBetroffen = einspielStand.geraet.sammlungen.some((x) => !x.papierkorb && x.meldungen > 0);
          // Der Haken gilt, sobald hier überhaupt etwas verloren geht — nicht
          // nur bei laufenden Sammlungen (R4-D2).
          const betroffen = bestandBetroffen(einspielStand.geraet);
          return (
            <>
              <p>
                Einspielen <strong>ersetzt</strong> alle App-Daten auf diesem Gerät — Vorlagen,
                Einsätze, Entwurf, Einstellungen und den Geräteschlüssel — durch den Inhalt der
                Datei. Anders als „Einsatz importieren…“ wird nichts ergänzt.
              </p>
              <p><strong>Auf diesem Gerät — geht dabei verloren:</strong></p>
              <BestandListe bestand={einspielStand.geraet} kurzform={einspielStand.kurzGeraet} geraet />
              <p>
                <strong>
                  In der Datei „{einspielStand.name}“
                  {einspielStand.erstellt
                    ? ` (erstellt ${new Date(einspielStand.erstellt).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })} Uhr)`
                    : ""}
                  :
                </strong>
              </p>
              <BestandListe bestand={einspielStand.datei} kurzform={einspielStand.kurzDatei} />
              {/* Eine alte Datei bringt, was nach den Fristen übrig bleibt (R5-D4). */}
              {folgenVorhanden(einspielStand.datei.faellig) && (
                <p className="warnung" role="status">
                  <strong>Davon fällt sofort wieder weg:</strong> {folgenText(einspielStand.datei.faellig)} — die
                  Datei ist älter als die Fristen (Sammlungen 90 Tage ohne Änderung, Papierkorb 30 Tage, Namen in
                  Bögen 90 Tage). Das Einspielen löst die Aufräumung beim Neuladen aus; was du noch brauchst, vorher
                  aus der Datei übernehmen oder exportieren.
                  {einspielStand.datei.faellig.namen.length > 0 && <> Betroffen: „{einspielStand.datei.faellig.namen.join("“, „")}“.</>}
                </p>
              )}
              {laufendBetroffen && (
                <p className="warnung">
                  Die laufenden Sammlungen dieses Geräts sind danach weg — ohne Papierkorb.
                  Vorher sichern oder übergeben.
                </p>
              )}
              <div className="aktionen">
                <button type="button" onClick={() => void sicherungExportieren()}>Vorher Sicherung erstellen…</button>
              </div>
              {betroffen && (
                <label className="inline">
                  <input
                    type="checkbox"
                    checked={einspielVerstanden}
                    onChange={(e) => setEinspielVerstanden(e.target.checked)}
                  />
                  Ja, die Daten dieses Geräts durch die Sicherung ersetzen
                </label>
              )}
              {/* Beiseitegelegtes ist die letzte Spur unlesbarer Daten: eigener Haken (R9-D2). */}
              {einspielStand.geraet.beiseite && (
                <label className="inline">
                  <input
                    type="checkbox"
                    checked={beiseiteVerstanden}
                    onChange={(e) => setBeiseiteVerstanden(e.target.checked)}
                  />
                  Beiseitegelegtes geht verloren — ich habe es gesichert („Vorher Sicherung erstellen…“) oder brauche es nicht
                </label>
              )}
              <div className="aktionen">
                <button
                  type="button"
                  className="gefahr"
                  disabled={(betroffen && !einspielVerstanden) || (!!einspielStand.geraet.beiseite && !beiseiteVerstanden)}
                  onClick={() => void einspielenJetzt()}
                >
                  Einspielen und ersetzen
                </button>
                <button type="button" onClick={() => einspielen.current?.close()}>Abbrechen</button>
              </div>
            </>
          );
        })()}
      </Dialog>

      {/* Restlos löschen — z. B. bevor ein geteiltes Tablet weitergegeben wird
          oder nach einer Übung. Bewusst mit Zahlen, Sicherungs-Ausweg und
          eigenem Haken: rückgängig gibt es hier nicht. */}
      <Dialog titel="Alle lokalen Daten löschen" dialogRef={loeschen}>
        <p>
          Entfernt <strong>alle</strong> Daten dieser App von diesem Gerät — auch die
          Einträge im Papierkorb. Es gibt keine Kopie in einer Cloud: was hier weg
          ist, ist weg.
        </p>
        {/* Die Sicherung steht vor der langen Aufzählung: Bei 200 % Schrift lag sie
            sieben Bildschirme tiefer, am Ende des Dialogs (R7-D7). */}
        <div className="aktionen">
          <button type="button" onClick={() => void sicherungExportieren()}>Vorher Sicherung erstellen…</button>
        </div>
        {loeschUmfang && (
          loeschUmfang.eintraege === 0 ? (
            <p>Auf diesem Gerät sind derzeit keine App-Daten gespeichert.</p>
          ) : (
            <>
              <p><strong>Betroffen sind:</strong></p>
              <ul>
                <li>
                  {loeschUmfang.vorlagen} {loeschUmfang.vorlagen === 1 ? "Vorlage" : "Vorlagen"}
                  {" (inkl. Papierkorb)"}
                </li>
                <li>
                  {loeschUmfang.einsaetze} {loeschUmfang.einsaetze === 1 ? "Einsatz-Sammlung" : "Einsatz-Sammlungen"}
                  {" mit "}{loeschUmfang.meldungen} {loeschUmfang.meldungen === 1 ? "gemeldeten Bogen" : "gemeldeten Bögen"}
                  {/* Wo es keine Kopie gibt, ist das hier die einzige (R4-D5). */}
                  {loeschUmfang.ohneExport.length > 0 && (
                    <strong className="warnung-text">
                      {" "}— noch kein Export, kein Lageblatt und keine Weitergabe von:{" "}
                      {loeschUmfang.ohneExport.map((n) => `„${n}"`).join(", ")}
                    </strong>
                  )}
                </li>
                <li>{loeschUmfang.entwurf ? "der aktuelle Bogen-Entwurf" : "kein offener Bogen-Entwurf"}</li>
                {loeschUmfang.rueckholplatz != null && (
                  <li>der zuletzt geschlossene Bogen „{loeschUmfang.rueckholplatz}" (Startseite, zum Zurückholen)</li>
                )}
                {loeschUmfang.beiseitegelegt && (
                  <li>ein beiseitegelegter, unlesbarer Bogen (Startseite, „Als Datei sichern“ vorher möglich)</li>
                )}
                {loeschUmfang.beiseiteDaten && (
                  <li>
                    <strong>beiseitegelegte, nicht lesbare Daten</strong> (Sammlungen oder Vorlagen): {loeschUmfang.beiseiteDaten.eintraege}{" "}
                    {loeschUmfang.beiseiteDaten.eintraege === 1 ? "Eintrag" : "Einträge"}, {loeschUmfang.beiseiteDaten.zeichen.toLocaleString("de-DE")} Zeichen
                    — nur „Vorher Sicherung erstellen…“ hebt sie auf
                  </li>
                )}
                <li>{loeschUmfang.absender ? "die hinterlegte Absenderkarte" : "keine Absenderkarte"}</li>
                <li>
                  {loeschUmfang.geraeteschluessel
                    ? "der Signatur-Geräteschlüssel — künftige Bögen werden mit einem neuen Schlüssel signiert"
                    : "kein Signatur-Geräteschlüssel"}
                </li>
                <li>alle Einstellungen (Darstellung, Vorbelegungen)</li>
              </ul>
            </>
          )
        )}
        <p className="warnung">
          Bereits erzeugte PDFs, QR-Codes und Sicherungsdateien bleiben unberührt —
          nur der Speicher dieser App wird geleert. Der Widerspruch zur
          Reichweitenmessung bleibt bestehen.
        </p>
        <label className="inline">
          <input
            type="checkbox"
            checked={loeschVerstanden}
            onChange={(e) => setLoeschVerstanden(e.target.checked)}
          />
          Ja, alle lokalen Daten dieser App endgültig löschen
        </label>
        <div className="aktionen">
          <button type="button" className="gefahr" disabled={!loeschVerstanden} onClick={alleDatenLoeschenJetzt}>
            Endgültig löschen
          </button>
          <button type="button" onClick={() => loeschen.current?.close()}>Abbrechen</button>
        </div>
        {loeschFehler && <p className="fehler">{loeschFehler}</p>}
      </Dialog>

    </>
  );
}

/**
 * Inhalt eines Bestands für die Einspiel-Rückfrage: Sammlungen beim Namen,
 * Vorlagen getrennt nach aktiv und Papierkorb, Rückholplatz, Absenderkarte
 * und Geräteschlüssel mit Kurzform — dieselben Posten wie „Alle Daten
 * löschen" (R4-D2).
 */
function BestandListe({ bestand, kurzform, geraet = false }: { bestand: BestandUmfang; kurzform: string | null; geraet?: boolean }) {
  const aktiv = bestand.sammlungen.filter((x) => !x.papierkorb);
  const papierkorb = bestand.sammlungen.length - aktiv.length;
  return (
    <ul>
      {aktiv.length === 0 && <li>keine laufende Einsatz-Sammlung</li>}
      {aktiv.map((x, i) => (
        <li key={i}>
          Sammlung „{x.name}“ mit {x.meldungen} {x.meldungen === 1 ? "Meldung" : "Meldungen"}
        </li>
      ))}
      {papierkorb > 0 && <li>{papierkorb} {papierkorb === 1 ? "Sammlung" : "Sammlungen"} im Papierkorb</li>}
      {/* Beschädigtes in der Datei: Wer sie einspielt, bringt es mit (R8-E1). */}
      {(bestand.beschaedigt ?? []).map((t) => (
        <li key={t}><strong>beschädigt:</strong> {t}</li>
      ))}
      {/* Beiseitegelegtes geht beim Einspielen mit verloren, auch wenn die Karte „nichts gelöscht“ sagt (R9-D2). */}
      {bestand.beiseite && bestand.beiseite.eintraege > 0 && (
        <li>
          <strong>beiseitegelegt:</strong> {bestand.beiseite.eintraege} {bestand.beiseite.eintraege === 1 ? "nicht lesbarer Eintrag" : "nicht lesbare Einträge"}{" "}
          (Sammlungen oder Vorlagen, {bestand.beiseite.zeichen.toLocaleString("de-DE")} Zeichen){geraet ? " — ohne Sicherung weg" : ""}
        </li>
      )}
      {bestand.beiseite?.entwurf && <li><strong>beiseitegelegt:</strong> ein beschädigter, nicht lesbarer Bogen (Entwurf){geraet ? " — ohne Sicherung weg" : ""}</li>}
      <li>
        {bestand.vorlagen} {bestand.vorlagen === 1 ? "Vorlage" : "Vorlagen"}
        {bestand.vorlagenPapierkorb > 0 ? `, dazu ${bestand.vorlagenPapierkorb} im Papierkorb` : ""}
      </li>
      <li>{bestand.entwurf ? "ein angefangener Bogen (Entwurf)" : "kein angefangener Bogen"}</li>
      {bestand.rueckholplatz != null && (
        <li>der zuletzt geschlossene Bogen „{bestand.rueckholplatz}“ (Startseite, zum Zurückholen)</li>
      )}
      <li>{bestand.absender ? "die hinterlegte Absenderkarte" : "keine Absenderkarte"}</li>
      <li>
        {bestand.geraeteschluessel
          ? `der Signatur-Geräteschlüssel${kurzform ? ` (Kurzform ${kurzform})` : ""}${
              geraet ? " — Empfänger, die ihn kennen, sehen danach einen anderen" : ""
            }`
          : "kein Signatur-Geräteschlüssel"}
      </li>
    </ul>
  );
}

/** Belegter Gerätespeicher als Zeile mit Aufräum-Hinweis ab 70 %. */
function SpeicherStand() {
  const b = speicherBelegung();
  if (!b) return null;
  const groesste = b.anteil >= 0.7 ? groessteText() : "";
  return (
    <p className={b.anteil >= 0.7 ? "warnung" : "hinweis"} role="status">
      Belegter Speicher: etwa {speicherText(b)}.
      {b.anteil >= 0.7
        ? `${istVoll(b) ? " Er ist voll — die App kann nichts mehr speichern." : " Wird er voll, kann die App nichts mehr speichern."}${groesste ? ` Am meisten belegen: ${groesste}.` : ""} Platz schafft nur Löschen — alte Einsätze sichern, den Papierkorb leeren oder einen gesicherten Einsatz dort endgültig löschen; die Sicherung selbst schafft keinen Platz, und bei vollem Speicher kostet schon das Ablegen in den Papierkorb Platz.`
        : ""}
    </p>
  );
}
