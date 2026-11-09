/**
 * Herkunft: Erfassungsbogen `src/app/neuere-eingabe.tsx` (Commit 1d7ed5f).
 */
/**
 * Marke an der Karte: eine später eingegangene Meldung der Einheit mit anderem Inhalt, aber älterem Stand gilt nicht
 * (R15-E2). Typisch ist eine Absenderuhr, die zu weit vorgeht — jede spätere richtige Meldung liegt dann nur in der
 * Historie. Die Marke bleibt, auch nach dem Neuladen; sie verschwindet, sobald die Fassung gilt oder verworfen ist.
 * Eigenes Modul, das die Karte per `lazy` nachlädt (Startbündel, ADR-003).
 */
import type { Erfassungsbogen } from "@bos/eeb-format/model";
import type { MeldeEintrag } from "@bos/meldekopf/einsaetze";

/** Die später eingegangene Fassung mit anderem Inhalt und älterem Stand (die jüngste davon), sonst `null`. */
export function neuereNichtUebernommen(kopf: MeldeEintrag, fassungen: readonly MeldeEintrag[]): MeldeEintrag | null {
  const inhalt = (e: MeldeEintrag) => JSON.stringify({ ...e.bogen, stand: 0 });
  return (
    fassungen
      .filter((r) => r.id !== kopf.id && r.quelle !== "manuell" && r.empfangenAm > kopf.empfangenAm && r.bogen.stand < kopf.bogen.stand && inhalt(r) !== inhalt(kopf))
      .sort((a, b) => b.empfangenAm - a.empfangenAm)[0] ?? null
  );
}

export default function NeuereEingabe(props: {
  kopf: MeldeEintrag;
  fassungen: readonly MeldeEintrag[];
  standText: (b: Erfassungsbogen) => string;
  nameId: string;
  /** Zugeklappte Karte am Telefon: nur die kurze Marke. */
  kompakt: boolean;
  onHistorie: () => void;
}) {
  const nicht = neuereNichtUebernommen(props.kopf, props.fassungen);
  if (!nicht) return null;
  if (props.kompakt) {
    return (
      <span className="kompakt-merkmal luecken-merkmal" title="Später eingegangen, aber älterer Stand — liegt in der Historie">
        ⚠ Neuere Eingabe nicht übernommen
      </span>
    );
  }
  return (
    <span className="muster-sub warnung-text neuere-nicht-uebernommen" role="note">
      ⚠ Neuere Eingabe nicht übernommen: später eingegangen, aber Stand {props.standText(nicht.bogen)} ist älter — Uhr des Absenders prüfen.{" "}
      <button type="button" className="link" aria-describedby={props.nameId} onClick={props.onHistorie}>
        Historie ansehen
      </button>
    </span>
  );
}
