/**
 * Herkunft: neu in der Meldekopf-App.
 *
 * Fahrzeuge am Tor des Bereitstellungsraums: Welches Fahrzeug einer anwesenden Einheit ist gerade unterwegs, seit wann,
 * und welches ist wieder da?
 *
 * Im Bereitstellungsraum fahren Fahrzeuge über den Tag weg und kommen wieder (Tanken, Verpflegung holen, Erkundung),
 * ohne dass die Einheit abrückt. „Abgerückt" ist dafür das falsche Wort und nähme die Einheit aus der Stärke. Hier wird
 * nur das einzelne Fahrzeug vermerkt; Status und Stärke der Einheit bleiben, wie sie sind: Am Tor zählt niemand, wie
 * viele im Fahrzeug sitzen.
 *
 * Wie `bedarfGeklaert` ein optionales Feld am Eintrag (kein Schemawechsel im Kern, keine QR-Bytes): je Fahrzeug die
 * letzte Bewegung mit Uhrzeit. Gelesen wird über alle Fassungen der Einheit, die jüngste Bewegung je Fahrzeug gilt;
 * eine Folgemeldung muss darum nichts erben. Jede Bewegung steht als Vermerk im Verlauf der Einheit.
 *
 * Ein Fahrzeug ist an seinem Kennzeichen zu erkennen ({@link kennzeichenSchluessel}); ohne Kennzeichen an seinem Platz
 * im Bogen („#2"). Wechselt eine Folgemeldung das Kennzeichen, ist es ein anderes Fahrzeug.
 */
import {
  MeldeStatus,
  einsaetzeLaden as kernEinsaetzeLaden,
  einsaetzePapierkorb as kernEinsaetzePapierkorb,
  type Einsatzsammlung,
  type MeldeEintrag,
} from "@bos/meldekopf/einsaetze";
import type { Erfassungsbogen } from "@bos/eeb-format/model";
import { sammlungenSchreiben } from "../eintrag-zeiten";
import { geltendeJeEinheit } from "../fassung-vorrang";
import { einheitAnzeigename, funkrufText, kennzeichenText, vokabText, vokabularFuer } from "../hilfen";

/** Letzte Bewegung eines Fahrzeugs am Tor. */
export interface FahrzeugBewegung {
  /** `true`: hat den Bereitstellungsraum verlassen; `false`: ist zurück. */
  unterwegs: boolean;
  /** Zeitpunkt der Bewegung (Geräteuhr, ms). */
  am: number;
}

declare module "@bos/meldekopf/einsaetze" {
  interface MeldeEintrag {
    /** Letzte Bewegung je Fahrzeug am Tor, Schlüssel siehe {@link fahrzeugSchluessel}. Fehlt = nie am Tor vermerkt. */
    fahrzeugStand?: Record<string, FahrzeugBewegung>;
  }
}

/**
 * Kennzeichen auf das, was sich vergleichen lässt: Großbuchstaben und Ziffern, Umlaute auf den Grundbuchstaben
 * („GÖ-AB 123" → „GOAB123"). Die Texterkennung kennt keine Umlaute, und wer tippt, lässt Strich und Leerzeichen weg.
 */
export function kennzeichenSchluessel(text: string): string {
  return text
    .toUpperCase()
    .replace(/Ä/g, "A")
    .replace(/Ö/g, "O")
    .replace(/Ü/g, "U")
    .replace(/[^A-Z0-9]/g, "");
}

/** Woran ein Fahrzeug der Einheit über die Fassungen hinweg erkannt wird. */
export function fahrzeugSchluessel(kennzeichen: string, index: number): string {
  return kennzeichenSchluessel(kennzeichen) || `#${index + 1}`;
}

type Fassung = Pick<MeldeEintrag, "einheitSchluessel" | "fahrzeugStand">;

/** Die jüngste Bewegung je Fahrzeug über alle Fassungen der Einheit. */
export function fahrzeugStandVon(e: Pick<MeldeEintrag, "einheitSchluessel">, alle: readonly Fassung[]): Map<string, FahrzeugBewegung> {
  const stand = new Map<string, FahrzeugBewegung>();
  for (const x of alle) {
    if (x.einheitSchluessel !== e.einheitSchluessel || !x.fahrzeugStand) continue;
    for (const [schl, b] of Object.entries(x.fahrzeugStand)) {
      if (!b || typeof b.am !== "number") continue;
      const bisher = stand.get(schl);
      if (!bisher || b.am > bisher.am) stand.set(schl, { unterwegs: !!b.unterwegs, am: b.am });
    }
  }
  return stand;
}

/**
 * Der vereinte Stand als Feldwert, Schlüssel sortiert (zwei Geräte schreiben sonst dasselbe in anderer Reihenfolge);
 * `undefined`, wenn es keinen gibt. Für den Abgleich zweier Geräte (einsatz-abgleich.ts).
 */
export function fahrzeugStandVereint(e: Pick<MeldeEintrag, "einheitSchluessel">, alle: readonly Fassung[]): Record<string, FahrzeugBewegung> | undefined {
  const stand = fahrzeugStandVon(e, alle);
  if (stand.size === 0) return undefined;
  return Object.fromEntries([...stand.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

/** Ein Fahrzeug einer anwesenden Einheit, wie das Tor es zeigt und sucht. */
export interface TorFahrzeug {
  /** Die geltende Fassung der Einheit; an ihr wird die Bewegung vermerkt. */
  eintragId: string;
  einheitSchluessel: string;
  /** Anzeigename der Einheit samt Teil-Etikett. */
  einheit: string;
  schluessel: string;
  /** Kennzeichen, wie es im Bogen steht; leer, wenn keines erfasst ist. */
  kennzeichen: string;
  /** Kurzform des Typs („MTW", „LKW Kipper"); leer, wenn unbekannt. */
  typ: string;
  funkruf: string;
  /** Seit wann unterwegs (ms); `null` = im Bereitstellungsraum. */
  unterwegsSeit: number | null;
  /** Wann zuletzt zurückgekommen (ms); `null`, wenn nie am Tor vermerkt oder gerade unterwegs. */
  zurueckAm: number | null;
}

function fahrzeugeDesBogens(b: Erfassungsbogen): { schluessel: string; kennzeichen: string; typ: string; funkruf: string }[] {
  const tabelle = vokabularFuer(b.einheit.organisation, "fahrzeug");
  return b.fahrzeuge.map((f, i) => {
    const kennzeichen = kennzeichenText(f).trim();
    return {
      schluessel: fahrzeugSchluessel(kennzeichen, i),
      kennzeichen,
      typ: vokabText(f.typ, tabelle),
      funkruf: funkrufText(f, b.einheit).trim(),
    };
  });
}

/** Die Fahrzeuge einer Einheit mit ihrem Stand am Tor. `alle`: sämtliche Einträge der Sammlung. */
export function fahrzeugeDerEinheit(kopf: MeldeEintrag, alle: readonly MeldeEintrag[]): TorFahrzeug[] {
  const stand = fahrzeugStandVon(kopf, alle);
  const einheit = `${einheitAnzeigename(kopf.bogen.einheit)}${kopf.teilEtikett ? ` (${kopf.teilEtikett})` : ""}`;
  return fahrzeugeDesBogens(kopf.bogen).map((f) => {
    const b = stand.get(f.schluessel);
    return {
      eintragId: kopf.id,
      einheitSchluessel: kopf.einheitSchluessel,
      einheit,
      ...f,
      unterwegsSeit: b?.unterwegs ? b.am : null,
      zurueckAm: b && !b.unterwegs ? b.am : null,
    };
  });
}

/** Alle Fahrzeuge der anwesenden Einheiten einer Sammlung. Abgerückte Einheiten sind am Tor kein Thema mehr. */
export function torFahrzeuge(einsatz: Pick<Einsatzsammlung, "eintraege">): TorFahrzeug[] {
  return geltendeJeEinheit(einsatz.eintraege)
    .filter((e) => e.status === MeldeStatus.ANWESEND)
    .flatMap((e) => fahrzeugeDerEinheit(e, einsatz.eintraege));
}

/** „MTW THW-81234" — wie ein Fahrzeug in Vermerk, Quittung und Karte heißt. */
export function fahrzeugName(f: Pick<TorFahrzeug, "typ" | "kennzeichen" | "schluessel">): string {
  const teile = [f.typ, f.kennzeichen].filter(Boolean);
  return teile.length > 0 ? teile.join(" ") : `Fahrzeug ${f.schluessel.replace("#", "")}`;
}

/** Was vor einer Bewegung galt; damit nimmt {@link fahrzeugBewegungZurueck} sie zurück. */
export interface BewegungVorher {
  einsatzId: string;
  eintragId: string;
  schluessel: string;
  /** Der Wert des Felds an diesem Eintrag vor der Bewegung (`null` = keiner). */
  vorher: FahrzeugBewegung | null;
  vermerk: { zeit: number; text: string };
}

function sammlungMitEintrag(einsatzId: string, eintragId: string) {
  // Frisch aus dem Kern, nicht aus dem Lese-Zwischenspeicher: Die Sammlung wird an Ort und Stelle geändert.
  const liste = [...kernEinsaetzeLaden(), ...kernEinsaetzePapierkorb()];
  const s = liste.find((x) => x.id === einsatzId);
  const e = s?.eintraege.find((x) => x.id === eintragId);
  return s && e ? { liste, s, e } : null;
}

/**
 * Ein Fahrzeug fährt raus (`unterwegs` = true) oder kommt zurück. Vermerkt die Bewegung an der Fassung `eintragId` und
 * im Verlauf der Einheit. Rückgabe: was vorher galt, oder `null`, wenn es Eintrag oder Fahrzeug nicht (mehr) gibt.
 */
export function fahrzeugBewegen(einsatzId: string, eintragId: string, schluessel: string, unterwegs: boolean, jetzt = Date.now()): BewegungVorher | null {
  const ziel = sammlungMitEintrag(einsatzId, eintragId);
  if (!ziel) return null;
  const { liste, s, e } = ziel;
  const fahrzeug = fahrzeugeDesBogens(e.bogen).find((f) => f.schluessel === schluessel);
  if (!fahrzeug) return null;
  // Die Uhr darf nicht hinter die letzte Bewegung fallen (zwei Tipps in derselben Millisekunde, verstellte Uhr): Sonst gälte die alte weiter.
  const letzte = fahrzeugStandVon(e, s.eintraege).get(schluessel);
  const am = letzte && letzte.am >= jetzt ? letzte.am + 1 : jetzt;
  const vorher = e.fahrzeugStand?.[schluessel] ?? null;
  e.fahrzeugStand = { ...e.fahrzeugStand, [schluessel]: { unterwegs, am } };
  const vermerk = { zeit: am, text: `Fahrzeug ${fahrzeugName(fahrzeug)}: ${unterwegs ? "fährt raus" : "ist zurück"}` };
  (e.vermerke ??= []).push(vermerk);
  s.geaendert = jetzt;
  sammlungenSchreiben(liste);
  return { einsatzId, eintragId, schluessel, vorher, vermerk };
}

/** Eine eben vermerkte Bewegung zurücknehmen (falsches Fahrzeug angetippt): Stand und Vermerk wie zuvor. */
export function fahrzeugBewegungZurueck(v: BewegungVorher): boolean {
  const ziel = sammlungMitEintrag(v.einsatzId, v.eintragId);
  if (!ziel) return false;
  const { liste, s, e } = ziel;
  if (e.fahrzeugStand) {
    if (v.vorher) e.fahrzeugStand[v.schluessel] = v.vorher;
    else delete e.fahrzeugStand[v.schluessel];
    if (Object.keys(e.fahrzeugStand).length === 0) delete e.fahrzeugStand;
  }
  const i = (e.vermerke ?? []).findIndex((x) => x.zeit === v.vermerk.zeit && x.text === v.vermerk.text);
  if (i >= 0) e.vermerke!.splice(i, 1);
  if (e.vermerke?.length === 0) delete e.vermerke;
  s.geaendert = Date.now();
  sammlungenSchreiben(liste);
  return true;
}

/**
 * Die Zeile an der Karte der Einheit: „2 von 4 Fahrzeugen unterwegs: MTW THW-81234 seit 14:10, …". Leer, solange
 * alle Fahrzeuge da sind.
 */
export function unterwegsText(fahrzeuge: readonly TorFahrzeug[], zeit: (ms: number) => string): string {
  const weg = fahrzeuge.filter((f) => f.unterwegsSeit != null);
  if (weg.length === 0) return "";
  const wer = weg.map((f) => `${fahrzeugName(f)} seit ${zeit(f.unterwegsSeit!)}`).join(", ");
  const zahl = fahrzeuge.length === 1 ? "Fahrzeug unterwegs" : weg.length === fahrzeuge.length ? `Alle ${weg.length} Fahrzeuge unterwegs` : `${weg.length} von ${fahrzeuge.length} Fahrzeugen unterwegs`;
  return `${zahl}: ${wer}`;
}
