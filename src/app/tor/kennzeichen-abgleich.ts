/**
 * Herkunft: neu in der Meldekopf-App.
 *
 * Abgleich am Tor: Was die Kamera gelesen oder der Helfer getippt hat, gegen die Kennzeichen der Fahrzeuge, die in
 * dieser Sammlung stehen.
 *
 * Die Texterkennung liest Kennzeichen nicht fehlerfrei: Sie verwechselt 0 und O, 8 und B, 1 und I, liest die Plaketten
 * zwischen Ortskürzel und Buchstaben als Zeichen mit und das „D" des Europabands davor. Frei gelesen wäre das zu
 * unsicher. Hier muss aber nichts frei gelesen werden: Gesucht ist nur, welches der wenigen bekannten Kennzeichen im
 * gelesenen Text steckt. Dafür reicht ein unscharfer Vergleich, der die typischen Lesefehler billig durchgehen lässt.
 *
 * Gebucht wird nie von selbst: Ein Treffer wird gezeigt, „fährt raus" oder „kommt zurück" tippt der Mensch.
 */
import { kennzeichenSchluessel, type TorFahrzeug } from "./fahrzeug-stand";

/** Zeichen, die die Texterkennung in der Kennzeichenschrift verwechselt. Je Gruppe untereinander fast ohne Kosten. */
const VERWECHSLUNG = ["0ODQ", "1IL", "8B", "5S", "2Z", "6G"];
const GRUPPE = new Map<string, number>();
VERWECHSLUNG.forEach((g, i) => [...g].forEach((z) => GRUPPE.set(z, i)));

const KOSTEN_VERWECHSELT = 0.3;

function ersatzKosten(a: string, b: string): number {
  if (a === b) return 0;
  const ga = GRUPPE.get(a);
  return ga != null && ga === GRUPPE.get(b) ? KOSTEN_VERWECHSELT : 1;
}

/**
 * Wie weit ist `muster` von der ähnlichsten Stelle in `text` entfernt? 0 = steht wörtlich darin. Ein fehlendes, ein
 * überzähliges oder ein falsches Zeichen kostet 1, ein verwechseltes ({@link VERWECHSLUNG}) 0,3. Was vor und hinter
 * der Stelle im Text steht, kostet nichts (Europaband, Aufschrift daneben). Beide Seiten als Schlüssel
 * ({@link kennzeichenSchluessel}).
 */
export function abstandImText(muster: string, text: string): number {
  const m = muster.length;
  if (m === 0) return 0;
  let zeile = new Array<number>(text.length + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    const neu = new Array<number>(text.length + 1);
    neu[0] = i;
    for (let j = 1; j <= text.length; j++) {
      neu[j] = Math.min(zeile[j - 1]! + ersatzKosten(muster[i - 1]!, text[j - 1]!), zeile[j]! + 1, neu[j - 1]! + 1);
    }
    zeile = neu;
  }
  return Math.min(...zeile);
}

/** Wie viel Abweichung ein Kennzeichen dieser Länge verträgt, bevor es kein Treffer mehr ist. */
export function erlaubterAbstand(laenge: number): number {
  if (laenge <= 4) return 0.6;
  if (laenge <= 6) return 1;
  return 2;
}

/**
 * THW-Kennzeichen unterscheiden sich nur in den Ziffern, und gerade die drei Buchstaben davor liest die Texterkennung am
 * echten Schild oft falsch („THN84588", „THH84588": Feldversuch 2026-11-26). Stehen die Ziffern im Text, zählt das fast
 * wie das ganze Kennzeichen.
 */
const THW_MUSTER = /^THW(\d{4,5})$/;
const THW_NUR_ZIFFERN = 0.5;

function abstandKennzeichen(k: string, text: string): number {
  const ganz = abstandImText(k, text);
  const ziffern = THW_MUSTER.exec(k)?.[1];
  if (!ziffern) return ganz;
  // Nur wenn die Ziffern selbst sauber dastehen (höchstens eine Verwechslung): Sonst passte jede Zahlenfolge im Bild.
  const nurZiffern = abstandImText(ziffern, text);
  return nurZiffern <= KOSTEN_VERWECHSELT ? Math.min(ganz, nurZiffern + THW_NUR_ZIFFERN) : ganz;
}

/** Kürzer wird nicht erkannt: Drei Zeichen stehen in jedem Kamerabild irgendwo. */
const MIN_LAENGE = 4;
/** So viel besser als das nächste muss ein Treffer sein, um als eindeutig zu gelten. */
const VORSPRUNG = 0.7;

export interface Erkennung {
  /** Die Schlüssel der passenden Kennzeichen, bester zuerst. Leer = nichts erkannt. */
  treffer: string[];
  /** Abstand des besten Treffers; 0 = wörtlich gelesen. */
  abstand: number;
}

/**
 * Welche der bekannten Kennzeichen stecken im gelesenen Text? Genau ein Treffer heißt: eindeutig. Mehrere heißt: Die
 * Lesung passt auf mehrere etwa gleich gut (THW-81234 und THW-81284 bei verschmutzter 3), der Helfer wählt.
 */
export function erkennungAuswerten(gelesen: string, schluessel: readonly string[]): Erkennung {
  const text = kennzeichenSchluessel(gelesen);
  const leer: Erkennung = { treffer: [], abstand: Infinity };
  if (text.length < MIN_LAENGE) return leer;
  const bewertet = [...new Set(schluessel)]
    .filter((k) => !k.startsWith("#") && k.length >= MIN_LAENGE)
    .map((k) => ({ k, abstand: abstandKennzeichen(k, text) }))
    .filter((x) => x.abstand <= erlaubterAbstand(x.k.length))
    .sort((a, b) => a.abstand - b.abstand || b.k.length - a.k.length);
  if (bewertet.length === 0) return leer;
  const bester = bewertet[0]!.abstand;
  let nah = bewertet.filter((x) => x.abstand < bester + VORSPRUNG);
  // „OLA12" steckt in „OLA123": Liest die Kamera das längere, ist das kürzere nicht gemeint.
  nah = nah.filter((x) => !nah.some((y) => y.k !== x.k && y.k.includes(x.k) && y.abstand <= x.abstand));
  return { treffer: nah.map((x) => x.k), abstand: bester };
}

/**
 * Was im gelesenen Text nach einem Kennzeichen aussieht, auch wenn es zu keinem Fahrzeug der Sammlung passt: ein Wort
 * aus fünf bis neun Zeichen mit mindestens drei Ziffern, davor höchstens Buchstaben („THN84588"), oder ein kurzes
 * Buchstabenwort mit einer Zifferngruppe dahinter („THW 84588"). Leer, wenn nichts so aussieht. Damit sagt der Scanner
 * „gelesen, aber nicht in dieser Sammlung", statt zu schweigen (Feldversuch 2026-11-26).
 */
export function kennzeichenAehnlich(gelesen: string): string {
  const woerter = gelesen.toUpperCase().split(/\s+/).map(kennzeichenSchluessel).filter(Boolean);
  let bestes = "";
  woerter.forEach((w, i) => {
    let kandidat = "";
    if (/^\d{3,5}$/.test(w) && i > 0 && /^[A-Z]{2,5}$/.test(woerter[i - 1]!)) kandidat = `${woerter[i - 1]} ${w}`;
    else if (/^[A-Z]{0,5}\d{3,6}[A-Z]?$/.test(w) && w.length >= 5 && w.length <= 9) kandidat = w;
    if (kandidat.length > bestes.length) bestes = kandidat;
  });
  return bestes;
}

/** Für die Suche nach Wörtern: klein, ohne Umlaute und Sonderzeichen. */
function gefaltet(text: string): string {
  return kennzeichenSchluessel(text).toLowerCase();
}

/**
 * Die Tippsuche am Tor: Der Helfer tippt die letzten Zeichen des Kennzeichens („234"), oder einen Teil von Einheit,
 * Fahrzeugtyp oder Funkrufname, mehrere Wörter mit Leerzeichen. Kennzeichen, die auf die Eingabe enden, stehen oben.
 * Leere Eingabe: alle Fahrzeuge, die unterwegs sind, zuerst.
 */
export function torSuche(eingabe: string, fahrzeuge: readonly TorFahrzeug[]): TorFahrzeug[] {
  const ganz = kennzeichenSchluessel(eingabe);
  if (ganz === "") {
    return [...fahrzeuge].sort((a, b) => Number(b.unterwegsSeit != null) - Number(a.unterwegsSeit != null));
  }
  const woerter = eingabe.split(/\s+/).map(gefaltet).filter(Boolean);
  const rang = (f: TorFahrzeug): number => {
    const k = f.schluessel.startsWith("#") ? "" : f.schluessel;
    if (k && k.endsWith(ganz)) return 0;
    if (k && k.includes(ganz)) return 1;
    const feld = gefaltet(`${f.kennzeichen} ${f.einheit} ${f.typ} ${f.funkruf}`);
    return woerter.every((w) => feld.includes(w)) ? 2 : -1;
  };
  return fahrzeuge
    .map((f, i) => ({ f, r: rang(f), i }))
    .filter((x) => x.r >= 0)
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.f);
}
