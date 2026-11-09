/**
 * Herkunft: Erfassungsbogen `src/app/signatur-warnung.ts` (Commit 1d7ed5f).
 */
/**
 * Worte für einen Bogen, dessen Signatur nicht zu den Daten passt (R15-E1) — am Scanner, bei der Rückfrage und auf dem
 * Papier. Die App lädt dieses Modul erst, wenn so ein Bogen tatsächlich eintrifft (Startbündel, ADR-003).
 */
import { frageJaNein } from "@bos/oberflaeche/dialoge";

/** Handscanner (Reihenscan): hält an, statt grün durchzugehen. Aufgenommen wird nichts. */
export function signaturUngueltigScan(name: string): string {
  return `⚠ „${name}" nicht aufgenommen — Signatur ungültig: Daten verändert oder beschädigt. Nochmal scannen oder beim Absender neu anfordern.`;
}

/** Link, Datei oder Kamera: Ablegen nur nach ausdrücklichem Ja. */
export function signaturUngueltigAufnehmen(name: string): Promise<boolean> {
  return frageJaNein({
    titel: "Signatur ungültig",
    text: `Die Signatur von „${name}" passt nicht zu den Daten: Der Bogen wurde unterwegs verändert oder ist beschädigt. Stärke, Rufnummer oder Ort können falsch sein. Besser nochmal scannen oder beim Absender neu anfordern.`,
    ok: "Trotzdem aufnehmen",
    abbruch: "Nicht aufnehmen",
    fokus: "abbruch",
  });
}
