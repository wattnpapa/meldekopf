/**
 * Fenster „Stärke ändern" mit den Zählern der Schnellerfassung (Audit
 * Meldekopf Runde 1, Feldtauglichkeit und Handschuh-Bedienung, P2).
 *
 * Neu im Meldekopf. Vorher fragte `frageFelder` (@bos/oberflaeche/dialoge)
 * drei Textfelder ab: Am Telefon kam die Tastatur und verdeckte den Dialog,
 * mit Handschuhen traf man die Ziffern schlecht, und die Bedienung war eine
 * andere als in der Erfassung. Die Zähler (`Stepper`) sind dieselben wie
 * dort; direktes Tippen bleibt möglich.
 *
 * Eigenes Fenster statt der Dialogschicht des Kerns, weil deren Abfrage nur
 * Text- und Auswahlfelder kennt. Es hängt sich für die Dauer der Frage in
 * eine eigene Wurzel und räumt sich danach wieder ab.
 */

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { Stepper } from "@bos/oberflaeche/bausteine";

export interface StaerkeWerte {
  fuehrer: number;
  unterfuehrer: number;
  mannschaft: number;
}

/** Obergrenze je Feld wie bisher bei der Texteingabe (drei Ziffern). */
const HOECHSTENS = 999;

function StaerkeFenster(props: {
  titel: string;
  hinweis: ReactNode;
  vorgabe: StaerkeWerte;
  ok: string;
  fertig: (w: StaerkeWerte | null) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [w, setW] = useState<StaerkeWerte>(props.vorgabe);
  const werte = useRef(w);
  werte.current = w;
  const fertig = useRef(props.fertig);
  fertig.current = props.fertig;

  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
    // Der Fokus liegt auf „erhöhen" der Mannschaft, nicht in einem Zahlenfeld: Sonst käme am Telefon gleich die Tastatur.
    d?.querySelector<HTMLButtonElement>('button[aria-label="Mannschaft: erhöhen"]')?.focus({ preventScroll: true });
  }, []);

  const setze = (teil: keyof StaerkeWerte) => (n: number) => setW((alt) => ({ ...alt, [teil]: Math.min(HOECHSTENS, n) }));

  function absenden(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const knopf = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    dialog.current?.close(knopf?.value ?? "");
  }

  function beiSchluss() {
    fertig.current(dialog.current?.returnValue === "ok" ? werte.current : null);
  }

  const gesamt = w.fuehrer + w.unterfuehrer + w.mannschaft;
  return (
    <dialog ref={dialog} className="abfrage staerke-fenster" aria-label={props.titel} onClose={beiSchluss}>
      <form onSubmit={absenden}>
        <div className="abfrage-rumpf">
          <h2>{props.titel}</h2>
          <div className="hinweis">{props.hinweis}</div>
          <div className="stepper-zeile">
            <Stepper titel="Führer" wert={w.fuehrer} setzen={setze("fuehrer")} />
            <Stepper titel="Unterführer" wert={w.unterfuehrer} setzen={setze("unterfuehrer")} />
            <Stepper titel="Mannschaft" wert={w.mannschaft} setzen={setze("mannschaft")} />
          </div>
          <p className="staerke-neu" role="status">
            Neu: {w.fuehrer} / {w.unterfuehrer} / {w.mannschaft} // <strong>{gesamt}</strong>
          </p>
        </div>
        <div className="abfrage-aktionen">
          <button type="submit" value="ok" className="primaer">
            {props.ok}
          </button>
          <button type="button" onClick={() => dialog.current?.close("")}>
            Abbrechen
          </button>
        </div>
      </form>
    </dialog>
  );
}

/**
 * Stärke mit Zählern erfragen. `null` bei Abbruch (Knopf, Escape, Zurück).
 * Die Plausibilität prüft der Aufrufer; hier ist jeder Wert eine ganze Zahl
 * von 0 bis 999.
 */
export function frageStaerke(a: { titel: string; hinweis: ReactNode; vorgabe: StaerkeWerte; ok: string }): Promise<StaerkeWerte | null> {
  return new Promise((loesen) => {
    const halter = document.createElement("div");
    document.body.append(halter);
    const wurzel = createRoot(halter);
    const fertig = (w: StaerkeWerte | null) => {
      // Gleich aus dem Dokument: Ein Fehlerhinweis danach trägt oft denselben Titel.
      halter.remove();
      loesen(w);
      // Den Baum erst danach abbauen, nicht mitten im Schließ-Ereignis des eigenen Baums.
      setTimeout(() => wurzel.unmount(), 0);
    };
    wurzel.render(<StaerkeFenster {...a} fertig={fertig} />);
  });
}
