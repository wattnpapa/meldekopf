/**
 * Herkunft: Erfassungsbogen `src/app/import-hinweis.tsx` (Commit 1d7ed5f).
 */
/**
 * Hinweiszeile „Import unterbrochen" (R15-S1) in der Einsatzansicht. Eigenes Modul, das die Ansicht per `lazy` nachlädt:
 * Der Hinweis ist selten und gehört nicht ins Startbündel (ADR-003).
 */
import { useEffect, useState } from "react";
import { importEndet, unterbrochenerImport } from "./import-unterbrochen";

export default function ImportHinweis(props: { einsatzId: string; meldungen: number; geaendert: number }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => setText(unterbrochenerImport(props.einsatzId, props.meldungen)), [props.einsatzId, props.meldungen, props.geaendert]);
  if (!text) return null;
  return (
    <div className="meldung warnung-text import-unterbrochen" role="status">
      <p><strong>⚠ {text}</strong></p>
      <button
        type="button"
        className="link widerspruch-aktion"
        onClick={() => {
          importEndet();
          setText(null);
        }}
      >
        Verstanden
      </button>
    </div>
  );
}
