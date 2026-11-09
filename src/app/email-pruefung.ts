/**
 * Herkunft: Erfassungsbogen `src/app/email-pruefung.ts` (Commit 1d7ed5f).
 */
/**
 * Eine Prüfung für E-Mail-Adressen an allen Eingabestellen (R12-E2): Zugehörigkeit (Schritt 1), Erreichbarkeit
 * (Schritt 3) und Absenderkarte. Bewusst nachsichtig — es blockiert nichts, es fragt nur nach.
 */

export type EmailProblem = "ohne-at" | "mehrere" | "unvollstaendig";

/** `undefined`, wenn die Adresse leer ist oder plausibel aussieht. */
export function emailProblem(adresse: string | undefined): EmailProblem | undefined {
  const t = adresse?.trim() ?? "";
  if (!t) return undefined;
  if (!t.includes("@")) return "ohne-at";
  // Zwei Adressen in einem Feld: durch Komma, Semikolon oder Leerzeichen getrennte Teile mit „@".
  const mitAt = t.split(/[\s,;]+/u).filter((teil) => teil.includes("@"));
  if (mitAt.length > 1) return "mehrere";
  return /^[^\s@,;]+@[^\s@,;]+\.[^\s@.,;]{2,}$/u.test(t) ? undefined : "unvollstaendig";
}

/** Satz für „stimmt das?"-Hinweise (ohne das abschließende „— stimmt das?"); leer, wenn nichts auffällt. */
export function emailSatz(adresse: string | undefined): string {
  const t = adresse?.trim() ?? "";
  switch (emailProblem(adresse)) {
    case "ohne-at":
      return `E-Mail „${t}" ohne „@"`;
    case "mehrere":
      return `E-Mail „${t}" enthält mehr als eine Adresse`;
    case "unvollstaendig":
      return `E-Mail „${t}" sieht unvollständig aus (Endung wie „.de" fehlt, Leerzeichen oder doppeltes „@")`;
    default:
      return "";
  }
}
