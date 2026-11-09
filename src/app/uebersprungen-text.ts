/**
 * Herkunft: Erfassungsbogen `src/app/uebersprungen-text.ts` (Commit 1d7ed5f).
 */
/**
 * Quittungstext für einen Empfang, dessen Inhalt schon in der Sammlung liegt (R15-W1): Die Antwort „übersprungen" stand
 * 4 300 px unter dem Bild; sichtbar blieb, was eine neue Meldung zeigt. `geltend`: Stärke der Fassung, die jetzt gilt —
 * nur wenn sie NICHT der eingegangene Inhalt ist (korrigierte Stärke), sonst `null`.
 */
export const uebersprungenText = (name: string, eingang: number, geltend: number | null): string =>
  geltend == null
    ? `Schon da, nichts geändert: „${name}" (übersprungen).`
    : `Alte Fassung (Stärke ${eingang}) von „${name}" übersprungen, es gilt weiter Stärke ${geltend}.`;
