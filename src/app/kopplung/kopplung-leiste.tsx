/**
 * Anzeige der Kopplung (neu im Meldekopf, ADR-009): die Leiste über jeder
 * Ansicht der Zentrale und die Sammler-Ansicht des zweiten Geräts.
 *
 * Wer mit zwei Geräten arbeitet, muss ohne Nachdenken sehen, ob die
 * Verbindung steht. Vorn steht darum immer dieselbe Lampe mit einem Wort:
 * gefüllter Punkt „Verbindung aktiv", offener Ring „Verbindung unterbrochen",
 * Quadrat „Verbindung getrennt". Form und Wort tragen die Aussage, die Farbe
 * kommt dazu (Nacht-Modus, Sonne, Farbfehlsichtigkeit). Dahinter steht, was
 * daraus folgt: wann zuletzt etwas ankam, dass hier weiter gespeichert wird,
 * was zu tun ist. Die Leiste klebt oben im Bild.
 *
 * Reißt die Verbindung, weil ein Gerät einschläft, verbinden sich beide von
 * selbst wieder (kopplung.ts); die Anzeige sagt dann „unterbrochen" und nach
 * einer Dreiviertelminute „getrennt", ohne dass das Wiederverbinden aufhört.
 *
 * Lädt mit der ersten Kopplung (kopplung-rahmen.tsx); Verbindung und Dialog folgen bei Bedarf.
 */

import { lazy, Suspense, useSyncExternalStore } from "react";
import "./kopplung.css";
import { einsaetzeLaden } from "../einsaetze-lesen";
import { GETRENNT_SATZ, WARTET_SATZ } from "./texte";
import { MAX_SAMMLER, kopplungBeginnen, kopplungsZustand, kopplungsZustandAbonnieren, type KopplungsGeraet, type KopplungsPhase, type KopplungsZustand } from "./zustand";

export { GETRENNT_SATZ, WARTET_SATZ };

const KopplungDialog = lazy(() => import("./kopplung-dialog"));
const SammlerAnsicht = lazy(() => import("./sammler-ansicht"));

export function useKopplung(): KopplungsZustand {
  return useSyncExternalStore(kopplungsZustandAbonnieren, kopplungsZustand, kopplungsZustand);
}

export function uhr(ms: number | null | undefined, sekunden = false): string {
  if (ms == null) return "";
  return new Date(ms).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", ...(sekunden ? { second: "2-digit" } : {}) });
}

export function trennen(): void {
  void import("./kopplung").then((m) => m.kopplungBeenden());
}

export const LAMPE_WORT: Partial<Record<KopplungsPhase, string>> = {
  verbunden: "Verbindung aktiv",
  unterbrochen: "Verbindung unterbrochen",
  getrennt: "Verbindung getrennt",
};

/** Die Lampe mit ihrem Wort: auf beiden Geräten dieselbe, immer an derselben Stelle. */
export function Lampe({ phase }: { phase: KopplungsPhase }) {
  return (
    <strong className="kopplung-lampe-wort">
      <span className="kopplung-lampe" data-phase={phase} aria-hidden="true" />
      {LAMPE_WORT[phase] ?? ""}
    </strong>
  );
}

/** Was die App dem Sammler bereitstellt (app.tsx): die Wege der Aufnahme und die Rückmeldung der letzten. */
export interface SammlerWege {
  /** Scanner öffnen; mit Kennung nimmt er in diese Sammlung auf. */
  onScannen: (einsatzId: string | null) => void;
  /** Einheit von Hand erfassen (Schnellerfassung) in dieser Sammlung. */
  onManuell: (einsatzId: string) => void;
  /** Rückmeldung der letzten Aufnahme. */
  meldung?: string;
  fehler?: string;
}

function geraetTrennen(kennung: string): void {
  void import("./kopplung").then((m) => m.kopplungGeraetTrennen(kennung));
}

const GERAET_STAND: Partial<Record<KopplungsPhase, string>> = { verbunden: "verbunden", unterbrochen: "unterbrochen", getrennt: "getrennt" };

/** Die Sammler einer Zentrale, je mit eigener Lampe: wer verbunden ist, seit wann nicht, wann zuletzt etwas kam. */
function Geraete({ geraete }: { geraete: KopplungsGeraet[] }) {
  return (
    <ul className="kopplung-geraete">
      {geraete.map((g) => (
        <li key={g.kennung} data-phase={g.phase}>
          <span className="kopplung-lampe" data-phase={g.phase} aria-hidden="true" />
          <strong>{g.name}</strong>
          <span>
            {" "}
            {GERAET_STAND[g.phase] ?? ""}
            {g.phase !== "verbunden" && g.seit != null ? ` seit ${uhr(g.seit)}` : ""}
            {g.abgleichAm != null ? ` · letzter Eingang ${uhr(g.abgleichAm, true)}` : ""}
          </span>
          <button type="button" className="link" onClick={() => geraetTrennen(g.kennung)} aria-label={`${g.name} ${g.phase === "getrennt" && !g.wartet ? "aus der Liste nehmen" : "trennen"}`}>
            {g.phase === "getrennt" && !g.wartet ? "entfernen" : "trennen"}
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Leiste oder Sammler-Ansicht und, solange Codes getauscht werden, der Dialog. */
export function Kopplung({ sammler }: { sammler?: SammlerWege }) {
  const z = useKopplung();
  const name = z.einsatzId ? einsaetzeLaden().find((s) => s.id === z.einsatzId)?.name : undefined;
  const sammlung = name ? ` · „${name}“` : "";
  const sammlerBild = z.rolle === "sammler" && sammler && !z.dialog && z.phase !== "aus" && z.phase !== "verbindet";
  const geraete = z.geraete ?? [];
  const verbunden = geraete.filter((g) => g.phase === "verbunden").length;
  // Wer sammelt: ohne Namen „zweites Gerät", ein Sammler mit Namen, mehrere als Zahl (die Namen stehen darunter).
  const wer = geraete.length > 1 ? ` · ${verbunden} von ${geraete.length} Sammlern verbunden` : ` · ${geraete[0]?.name ?? "zweites Gerät"} sammelt`;
  const weiteres = z.rolle !== "sammler" && z.einsatzId && name && geraete.length < MAX_SAMMLER;
  const liste = geraete.length > 1 ? <Geraete geraete={geraete} /> : null;
  const alle = geraete.length > 1 ? "Alle trennen" : "Trennen";
  let leiste = null;
  if (z.phase === "verbunden") {
    leiste = (
      <div className="kopplung-leiste" role="status" data-phase="verbunden">
        <p>
          <Lampe phase="verbunden" />
          {z.rolle === "sammler" ? " · dieses Gerät sammelt" : wer}
          {sammlung}
          {z.rolle === "sammler"
            ? z.offen
              ? ` · ${z.offen} noch nicht übertragen`
              : " · alles übertragen"
            : z.abgleichAm != null
              ? ` · letzter Eingang ${uhr(z.abgleichAm, true)}`
              : " · noch kein Eingang"}
          {z.hinweis && <span className="kopplung-hinweis"> {z.hinweis}</span>}
        </p>
        {liste}
        <div className="kopplung-knoepfe">
          {weiteres && <button type="button" onClick={() => kopplungBeginnen(z.einsatzId!)}>Weiteres Gerät koppeln…</button>}
          <button type="button" className="link" onClick={trennen}>{alle}</button>
        </div>
      </div>
    );
  } else if (z.phase === "unterbrochen") {
    leiste = (
      <div className="kopplung-leiste warnung" role="status" data-phase="unterbrochen">
        <p>
          <Lampe phase="unterbrochen" />
          {geraete.length > 1 ? wer : ""}
          {z.seit != null ? ` seit ${uhr(z.seit)}` : ""}.{" "}
          {z.wartet
            ? "Sie wird von selbst wiederhergestellt, sobald das andere Gerät erreichbar ist. Dieses Gerät speichert weiter."
            : "Dieses Gerät speichert weiter; der Abgleich folgt, sobald die Verbindung wieder steht."}
          {z.hinweis && <span className="kopplung-hinweis"> {z.hinweis}</span>}
        </p>
        {liste}
        <div className="kopplung-knoepfe">
          {weiteres && <button type="button" onClick={() => kopplungBeginnen(z.einsatzId!)}>Weiteres Gerät koppeln…</button>}
          <button type="button" className="link" onClick={trennen}>{alle}</button>
        </div>
      </div>
    );
  } else if (z.phase === "getrennt") {
    leiste = (
      <div className="kopplung-leiste warnung" role="alert" data-phase="getrennt">
        <p>
          <Lampe phase="getrennt" />
          {z.seit != null ? ` seit ${uhr(z.seit)}` : ""}
          {z.abgleichAm != null ? `, letzter Eingang ${uhr(z.abgleichAm)}` : ""}. {z.hinweis || (z.wartet ? WARTET_SATZ : GETRENNT_SATZ)}
        </p>
        {liste}
        <div className="kopplung-knoepfe">
          {weiteres && <button type="button" onClick={() => kopplungBeginnen(z.einsatzId!)}>Neu koppeln…</button>}
          <button type="button" className="link" onClick={trennen}>Schließen</button>
        </div>
      </div>
    );
  }
  return (
    <>
      {sammlerBild ? (
        <Suspense fallback={null}>
          <SammlerAnsicht wege={sammler} />
        </Suspense>
      ) : (
        leiste
      )}
      {z.dialog && (
        <Suspense fallback={null}>
          <KopplungDialog />
        </Suspense>
      )}
    </>
  );
}
