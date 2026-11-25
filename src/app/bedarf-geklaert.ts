/**
 * Herkunft: neu in der Meldekopf-App.
 *
 * „Geklärt" am Sofortbedarf und „Gesehen" an den Prüfhinweisen einer Einheit.
 *
 * Die Liste zeigte je Einheit dauerhaft „Ruhezeit", „Unterbr." und „⚠ 3 Hinweise" — auch dann noch, wenn die Unterkunft
 * längst zugewiesen und der Kraftstoff bestellt war. Wer die Marke dreimal gesehen hat, liest sie beim vierten Mal nicht
 * mehr, und die eine Einheit, deren Bedarf wirklich noch offen ist, geht darin unter. Die Führungsstelle hakt jetzt je
 * Einheit ab, was geklärt ist; die Marke tritt zurück und trägt die Uhrzeit.
 *
 * Beides gilt für das, was gesehen wurde: „Diesel 400 l" geklärt heißt nicht „Diesel 600 l" geklärt. Meldet die Einheit in
 * einer Folgemeldung einen anderen Wert oder kommt ein neuer Hinweis dazu, ist der Punkt wieder offen. Die Angaben des
 * Bogens bleiben unverändert: Summen, Lageblatt und Exporte rechnen weiter mit dem gemeldeten Bedarf. Wie `ortGebilligt`
 * optionale Felder am Eintrag (kein Schemawechsel, keine QR-Bytes); jede Entscheidung steht als Vermerk im Verlauf.
 */
import {
  einsaetzeLaden as kernEinsaetzeLaden,
  einsaetzePapierkorb as kernEinsaetzePapierkorb,
  type MeldeEintrag,
} from "@bos/meldekopf/einsaetze";
import { sammlungenSchreiben } from "./eintrag-zeiten";

/** Die Arten des Sofortbedarfs, je eine Marke an der Karte. */
export type BedarfArt = "ruhezeit" | "unterbringung" | "verpflegung" | "diesel" | "benzin" | "gemisch";

/** Was von einer Bedarfsmarke gebraucht wird: ihre Art und der Text, für den „geklärt" gilt. */
export interface BedarfPunkt {
  art: BedarfArt;
  lang: string;
}

declare module "@bos/meldekopf/einsaetze" {
  interface MeldeEintrag {
    /** Vom Meldekopf als geklärt abgehakter Sofortbedarf: je Art der Text der Marke und der Zeitpunkt (ms). */
    bedarfGeklaert?: Partial<Record<BedarfArt, { wert: string; am: number }>>;
    /** Prüfhinweise, die der Meldekopf zur Kenntnis genommen hat (ihre Texte), und wann (ms). */
    hinweiseGesehen?: { texte: string[]; am: number };
  }
}

type Fassung = Pick<MeldeEintrag, "einheitSchluessel" | "empfangenAm" | "bedarfGeklaert" | "hinweiseGesehen">;

/** Die Fassungen der Einheit, jüngste zuerst. */
function fassungen<T extends Fassung>(e: Pick<MeldeEintrag, "einheitSchluessel">, alle: readonly T[]): T[] {
  return alle.filter((x) => x.einheitSchluessel === e.einheitSchluessel).sort((a, b) => b.empfangenAm - a.empfangenAm);
}

/**
 * Wann dieser Bedarf als geklärt abgehakt wurde — `null`, solange er offen ist. Es zählt der jüngste Haken der Einheit
 * für diese Art, und nur, wenn er für denselben Text gesetzt wurde.
 */
export function bedarfGeklaertAm(e: Pick<MeldeEintrag, "einheitSchluessel">, punkt: BedarfPunkt, alle: readonly Fassung[]): number | null {
  const haken = fassungen(e, alle).find((x) => x.bedarfGeklaert?.[punkt.art])?.bedarfGeklaert?.[punkt.art];
  return haken && haken.wert === punkt.lang ? haken.am : null;
}

/** Die Hinweistexte, die der Meldekopf an dieser Einheit schon zur Kenntnis genommen hat, mit dem jüngsten Zeitpunkt. */
export function hinweiseGesehen(e: Pick<MeldeEintrag, "einheitSchluessel">, alle: readonly Fassung[]): { texte: Set<string>; am: number | null } {
  const texte = new Set<string>();
  let am: number | null = null;
  for (const x of fassungen(e, alle)) {
    if (!x.hinweiseGesehen) continue;
    for (const t of x.hinweiseGesehen.texte) texte.add(t);
    am = Math.max(am ?? 0, x.hinweiseGesehen.am);
  }
  return { texte, am };
}

/** Die Hinweise, die noch niemand zur Kenntnis genommen hat. */
export function offeneHinweise<T extends { text: string }>(punkte: readonly T[], e: Pick<MeldeEintrag, "einheitSchluessel">, alle: readonly Fassung[]): T[] {
  if (punkte.length === 0) return [];
  const { texte } = hinweiseGesehen(e, alle);
  return texte.size === 0 ? [...punkte] : punkte.filter((p) => !texte.has(p.text));
}

function sammlungMitEintrag(einsatzId: string, eintragId: string) {
  const liste = [...kernEinsaetzeLaden(), ...kernEinsaetzePapierkorb()];
  const s = liste.find((x) => x.id === einsatzId);
  const e = s?.eintraege.find((x) => x.id === eintragId);
  return s && e ? { liste, s, e } : null;
}

/**
 * Einen Bedarf als geklärt abhaken (`gilt` = true) oder den Haken zurücknehmen. Zurückgenommen wird an allen Fassungen
 * der Einheit, sonst gälte ein älterer Haken weiter. Rückgabe: ob der Eintrag gefunden wurde.
 */
export function bedarfKlaeren(einsatzId: string, eintragId: string, punkt: BedarfPunkt, gilt = true, jetzt = Date.now()): boolean {
  const ziel = sammlungMitEintrag(einsatzId, eintragId);
  if (!ziel) return false;
  const { liste, s, e } = ziel;
  if (gilt) {
    e.bedarfGeklaert = { ...e.bedarfGeklaert, [punkt.art]: { wert: punkt.lang, am: jetzt } };
  } else {
    for (const x of s.eintraege) {
      if (x.einheitSchluessel !== e.einheitSchluessel || !x.bedarfGeklaert?.[punkt.art]) continue;
      delete x.bedarfGeklaert[punkt.art];
      if (Object.keys(x.bedarfGeklaert).length === 0) delete x.bedarfGeklaert;
    }
  }
  (e.vermerke ??= []).push({ zeit: jetzt, text: gilt ? `Bedarf geklärt: ${punkt.lang}` : `Bedarf wieder offen: ${punkt.lang}` });
  s.geaendert = jetzt;
  sammlungenSchreiben(liste);
  return true;
}

/**
 * Die genannten Prüfhinweise zur Kenntnis nehmen (`gilt` = true) oder alle wieder zeigen. Rückgabe: ob der Eintrag
 * gefunden wurde.
 */
export function hinweiseQuittieren(einsatzId: string, eintragId: string, texte: readonly string[], gilt = true, jetzt = Date.now()): boolean {
  const ziel = sammlungMitEintrag(einsatzId, eintragId);
  if (!ziel) return false;
  const { liste, s, e } = ziel;
  if (gilt) {
    e.hinweiseGesehen = { texte: [...new Set([...(e.hinweiseGesehen?.texte ?? []), ...texte])], am: jetzt };
  } else {
    for (const x of s.eintraege) if (x.einheitSchluessel === e.einheitSchluessel) delete x.hinweiseGesehen;
  }
  (e.vermerke ??= []).push({ zeit: jetzt, text: gilt ? `Hinweise zur Kenntnis genommen (${texte.length})` : "Hinweise wieder offen" });
  s.geaendert = jetzt;
  sammlungenSchreiben(liste);
  return true;
}
