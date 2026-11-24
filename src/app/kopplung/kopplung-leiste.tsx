/**
 * Statusleiste der Kopplung (neu im Meldekopf, ADR-009): steht über jeder
 * Ansicht, solange zwei Geräte gekoppelt sind oder die Kopplung gerissen ist.
 *
 * Wer mit zwei Geräten arbeitet, muss ohne Nachdenken sehen, ob das andere
 * Gerät den eigenen Stand hat. Die Leiste sagt darum nie nur „verbunden",
 * sondern wann zuletzt abgeglichen wurde, und im Fall der Trennung, dass hier
 * weiter gespeichert wird und was zu tun ist. Reißt die Verbindung, weil ein
 * Gerät einschläft, verbinden sich beide von selbst wieder (kopplung.ts); die
 * Leiste sagt dann „unterbrochen" und nach einer Dreiviertelminute
 * „getrennt", ohne dass das Wiederverbinden aufhört.
 *
 * Lädt mit der ersten Kopplung (kopplung-rahmen.tsx); Verbindung und Dialog folgen bei Bedarf.
 */

import { lazy, Suspense, useSyncExternalStore } from "react";
import "./kopplung.css";
import { einsaetzeLaden } from "../einsaetze-lesen";
import { GETRENNT_SATZ, WARTET_SATZ } from "./texte";
import { kopplungBeginnen, kopplungsZustand, kopplungsZustandAbonnieren, type KopplungsZustand } from "./zustand";

const KopplungDialog = lazy(() => import("./kopplung-dialog"));

export function useKopplung(): KopplungsZustand {
  return useSyncExternalStore(kopplungsZustandAbonnieren, kopplungsZustand, kopplungsZustand);
}

function uhr(ms: number | null, sekunden = false): string {
  if (ms == null) return "";
  return new Date(ms).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", ...(sekunden ? { second: "2-digit" } : {}) });
}

function trennen(): void {
  void import("./kopplung").then((m) => m.kopplungBeenden());
}

export { GETRENNT_SATZ, WARTET_SATZ };

/** Leiste und, solange Codes getauscht werden, der Dialog. */
export function Kopplung() {
  const z = useKopplung();
  const name = z.einsatzId ? einsaetzeLaden().find((s) => s.id === z.einsatzId)?.name : undefined;
  const sammlung = name ? ` · „${name}“` : "";
  let leiste = null;
  if (z.phase === "verbunden") {
    leiste = (
      <div className="kopplung-leiste" role="status" data-phase="verbunden">
        <p>
          <strong>⇄ Gekoppelt mit zweitem Gerät</strong>
          {sammlung}
          {z.abgleichAm != null ? ` · abgeglichen ${uhr(z.abgleichAm, true)}` : " · Abgleich läuft …"}
          {z.hinweis && <span className="kopplung-hinweis"> {z.hinweis}</span>}
        </p>
        <button type="button" className="link" onClick={trennen}>Trennen</button>
      </div>
    );
  } else if (z.phase === "unterbrochen") {
    leiste = (
      <div className="kopplung-leiste warnung" role="status" data-phase="unterbrochen">
        <p>
          <strong>⚠ Verbindung zum zweiten Gerät stockt</strong>
          {z.seit != null ? ` seit ${uhr(z.seit)}` : ""}.{" "}
          {z.wartet
            ? "Sie wird von selbst wiederhergestellt, sobald das andere Gerät erreichbar ist. Dieses Gerät speichert weiter."
            : "Dieses Gerät speichert weiter; der Abgleich folgt, sobald die Verbindung wieder steht."}
        </p>
        <button type="button" className="link" onClick={trennen}>Trennen</button>
      </div>
    );
  } else if (z.phase === "getrennt") {
    leiste = (
      <div className="kopplung-leiste warnung" role="alert" data-phase="getrennt">
        <p>
          <strong>⚠ Kopplung getrennt</strong>
          {z.seit != null ? ` seit ${uhr(z.seit)}` : ""}
          {z.abgleichAm != null ? `, zuletzt abgeglichen ${uhr(z.abgleichAm)}` : ""}. {z.hinweis || (z.wartet ? WARTET_SATZ : GETRENNT_SATZ)}
        </p>
        <div className="kopplung-knoepfe">
          {z.einsatzId && name && (
            <button type="button" onClick={() => kopplungBeginnen(z.einsatzId!)}>Neu koppeln…</button>
          )}
          <button type="button" className="link" onClick={trennen}>Schließen</button>
        </div>
      </div>
    );
  }
  return (
    <>
      {leiste}
      {z.dialog && (
        <Suspense fallback={null}>
          <KopplungDialog />
        </Suspense>
      )}
    </>
  );
}
