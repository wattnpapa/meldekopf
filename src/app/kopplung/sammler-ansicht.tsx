/**
 * Sammler-Ansicht (neu im Meldekopf, ADR-009): was das zweite Gerät zeigt,
 * solange es gekoppelt ist.
 *
 * Im gekoppelten Betrieb nimmt das Telefon Einheiten auf und schickt sie an die
 * Zentrale; deren Stand ist maßgeblich und kommt laufend zurück (seit
 * 2026-11-25, abgleich.ts). Geführt wird die Lage allein an der Zentrale
 * (Abrücken, Aufträge, Korrekturen, Weitergabe, Lagemonitor). Die Ansicht hat
 * darum drei Aufgaben: sagen, ob die Verbindung steht; aufnehmen; zeigen, was
 * die Zentrale führt und was von hier noch auf seine Übertragung wartet.
 *
 * Ein modaler Dialog über der App: Die Einsatzansicht darunter ist damit
 * weder antippbar noch per Tastatur erreichbar. Scanner und Rückfragen öffnen
 * sich darüber, die Schnellerfassung löst die Ansicht ab, solange sie offen ist.
 */

import { useRef, useState } from "react";
import { frageText } from "@bos/oberflaeche/dialoge";
import { staerke } from "@bos/eeb-format/model";
import { MeldeStatus } from "@bos/meldekopf/einsaetze";
import { useModalesOverlay } from "@bos/oberflaeche/modal-overlay";
import { einsaetzeLaden } from "../einsaetze-lesen";
import { geltendeJeEinheit } from "../fassung-vorrang";
import { einheitAnzeigename } from "../hilfen";
import { geraetename, geraetenameEigen, geraetenameSetzen } from "./geraetename";
import { kopplungNameGeaendert, kopplungUebertragen } from "./kopplung";
import { Lampe, trennen, uhr, useKopplung, type SammlerWege } from "./kopplung-leiste";
import { WARTET_SATZ } from "./texte";

export const SAMMLER_ROLLE_SATZ = "Dieses Gerät sammelt und zeigt den Stand der Zentrale. Was hier aufgenommen wird, erscheint dort; ändern lässt sich die Lage nur an der Zentrale.";
export const SAMMLER_GETRENNT_SATZ =
  "Was hier aufgenommen wird, bleibt auf diesem Gerät gespeichert. Zum Übertragen am ersten Gerät „Zweites Gerät koppeln…“ tippen und hier dessen Code scannen.";

export default function SammlerAnsicht({ wege }: { wege: SammlerWege }) {
  const z = useKopplung();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [, neuZeichnen] = useState(0);
  async function nameAendern() {
    const name = await frageText({
      titel: "Name dieses Geräts",
      label: "Name",
      vorgabe: geraetenameEigen() ? geraetename() : "",
      platzhalter: geraetename(),
      hinweis: "So steht dieses Gerät an der Zentrale, zum Beispiel „Eingang Nord“. Leer nimmt wieder die Vorgabe.",
      ok: "Übernehmen",
      optional: true,
    });
    if (name == null) return;
    geraetenameSetzen(name);
    kopplungNameGeaendert();
    neuZeichnen((n) => n + 1);
  }
  // Esc schließt die Ansicht nicht: Sie endet mit „Kopplung trennen".
  useModalesOverlay(dialogRef, { onSchliessen: () => undefined });
  const einsatz = z.einsatzId ? einsaetzeLaden().find((s) => s.id === z.einsatzId) : undefined;
  const einheiten = einsatz ? [...geltendeJeEinheit(einsatz.eintraege)].sort((a, b) => b.empfangenAm - a.empfangenAm) : [];
  const offen = z.offen ?? 0;
  const verbunden = z.phase === "verbunden";
  let lage: string;
  if (verbunden) {
    lage = offen > 0 ? `${offen} ${offen === 1 ? "Meldung wird" : "Meldungen werden"} übertragen …` : z.abgleichAm != null ? `Auf dem Stand der Zentrale · ${uhr(z.abgleichAm, true)}` : "Der Stand der Zentrale wird übernommen …";
  } else {
    const wartend = offen > 0 ? `${offen} ${offen === 1 ? "Meldung wartet" : "Meldungen warten"} auf die Übertragung. ` : "";
    lage = z.phase === "unterbrochen" ? `${wartend}Die Verbindung wird von selbst wiederhergestellt. Weiter aufnehmen ist möglich.` : `${wartend}${z.hinweis || (z.wartet ? WARTET_SATZ : SAMMLER_GETRENNT_SATZ)}`;
  }
  return (
    <dialog ref={dialogRef} className="sammler" tabIndex={-1} aria-labelledby="sammler-titel" data-phase={z.phase}>
      <div className="sammler-stand" role={verbunden ? "status" : "alert"} data-phase={z.phase}>
        <p className="sammler-lampe">
          <Lampe phase={z.phase} />
          {!verbunden && z.seit != null ? <span> seit {uhr(z.seit)}</span> : null}
        </p>
        <p className="sammler-lage">{lage}</p>
      </div>
      <h1 id="sammler-titel">{einsatz ? einsatz.name : "Sammlung wird übernommen …"}</h1>
      <p className="hinweis">{SAMMLER_ROLLE_SATZ}</p>
      <p className="sammler-name-zeile">
        Dieses Gerät heißt an der Zentrale: <strong>{geraetename()}</strong>{" "}
        <button type="button" className="link" onClick={() => void nameAendern()}>Name ändern…</button>
      </p>
      <div className="aktionen">
        <button type="button" className="primaer mit-zusatz" onClick={() => wege.onScannen(einsatz?.id ?? null)}>
          Bogen scannen…
          <span className="knopf-zusatz" aria-hidden="true">mit der Kamera</span>
        </button>
        {einsatz && (
          <button type="button" className="mit-zusatz" onClick={() => wege.onManuell(einsatz.id)}>
            Einheit von Hand erfassen…
            <span className="knopf-zusatz" aria-hidden="true">ohne Bogen</span>
          </button>
        )}
      </div>
      {(wege.fehler || wege.meldung) && <p className={wege.fehler ? "fehler" : "meldung"} role="status">{wege.fehler || wege.meldung}</p>}
      <h2>
        Stand der Zentrale ({einheiten.length} {einheiten.length === 1 ? "Einheit" : "Einheiten"}
        {offen > 0 ? `, davon ${offen} noch nicht übertragen` : ""})
      </h2>
      {einheiten.length === 0 ? (
        <p className="hinweis">Noch keine Einheit. Den Bogen der ersten scannen.</p>
      ) : (
        <ul className="sammler-liste">
          {einheiten.map((e) => {
            const s = staerke(e.bogen);
            const da = kopplungUebertragen(e.id);
            return (
              <li key={e.id} data-uebertragen={da ? "ja" : "nein"}>
                <span className="sammler-name">{einheitAnzeigename(e.bogen.einheit)}</span>
                <span className="sammler-zahl">
                  {s.fuehrer}/{s.unterfuehrer}/{s.mannschaft}//{s.gesamt} · {uhr(e.empfangenAm)}
                  {e.status === MeldeStatus.ABGERUECKT ? " · abgerückt" : ""}
                </span>
                {/* „Wartet" heißt: hier aufgenommen, an der Zentrale noch nicht angekommen. Alles andere führt die Zentrale. */}
                <span className="sammler-marke">{da ? "✓ in der Lage" : "… wartet"}</span>
              </li>
            );
          })}
        </ul>
      )}
      <p className="hinweis">Korrekturen, Abrücken und Aufträge an der Zentrale; sie erscheinen danach hier.</p>
      <div className="aktionen sammler-ende">
        <button type="button" onClick={trennen}>Kopplung trennen</button>
      </div>
    </dialog>
  );
}
