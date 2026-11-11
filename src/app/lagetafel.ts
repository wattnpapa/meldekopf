/**
 * Lagetafel: Inhalt und Satz der Tafel-Ansicht des Lagemonitors.
 *
 * Neu im Meldekopf. Die Zahlen kommen unverändert aus `lagemonitor.ts`
 * (`lagebild`), damit Tafel, Zeilenansicht, Einsatzansicht und Lageblatt
 * dieselben Summen zeigen. Hier entsteht nur, was die Tafel zusätzlich braucht:
 *
 *  - **Feste Plätze.** Die Einheiten stehen nach Zug (ohne Züge: nach
 *    Organisation) und darin nach Eintreffzeit. Eine neue Einheit kommt ans
 *    Ende ihrer Gruppe, eine Folgemeldung ändert die Zahl an Ort und Stelle;
 *    niemand rückt nach oben, weil er zuletzt gemeldet hat. Wer „seine"
 *    Einheit sucht, findet sie dort, wo sie vor fünf Minuten stand.
 *  - **Markierung am Platz.** Was sich in den letzten Minuten bewegt hat
 *    (`Lagebild.bewegungen`), hängt als Marke an der Einheit.
 *  - **Abgerückte Einheiten** führt die Randspalte, die letzten mit Uhrzeit.
 *    Auf der Tafel stehen sie nur, wenn niemand mehr anwesend ist: Ein Block,
 *    der je nach Füllstand kommt und geht, wäre kein festes Lagebild.
 *  - **Übungsmeldungen in einer echten Lage** stehen als eigene, letzte Gruppe
 *    da, gekennzeichnet und ohne zu zählen (`zaehltInLage`): Wer anwesend ist,
 *    soll auf der Tafel zu finden sein, und eine versehentlich als Übung
 *    gemeldete Einheit fällt so auf. In die Stärke im Kopf, in Bedarf und
 *    Bewegungen gehen sie nicht ein, wie überall sonst in der App.
 *  - **Der Satz.** `tafelSatz` rechnet aus Zahl der Einheiten und Größe der
 *    Fläche die größte Schrift, bei der alles ins Bild passt, und blättert
 *    erst, wenn die Mindestgröße unterschritten würde. Reine Rechnung ohne
 *    Browser, damit sie sich prüfen lässt (jsdom rechnet kein Layout).
 *
 * Wie der Monitor überhaupt: Einheitsnamen und Zahlen, keine Personen.
 */

import { staerke as staerkeAusBogen, type Einheit, type OrganisationsTyp, type Staerke } from "@bos/eeb-format/model";
import { MeldeStatus, type Einsatzsammlung, type MeldeEintrag } from "@bos/meldekopf/einsaetze";
import { angabenZeit } from "./angaben-alter";
import { aktuelleMeldungen, uebungenAusserhalbDerLage } from "./auswertung";
import { bedarfMarken } from "./einheiten-tabelle";
import { eintreffzeit } from "./eintrag-zeiten";
import { geltendeJeEinheit } from "./fassung-vorrang";
import { einheitAnzeigename, funkrufText, nurSollstaerke, orgLabel, vokabText, vokabularFuer } from "./hilfen";
import { auftragKurz, lagebild, uhrzeitText, type Bewegung, type EinheitZeile, type Lagebild } from "./lagemonitor";

// ------------------------------------------------------------------ Inhalt

/** Was an einer Einheit gerade neu ist; steht als Marke an ihrem Platz. */
export interface TafelMarke {
  art: "neu" | "folge" | "wieder";
  /** „neu", „nachgetragen", „Stärke −2", „wieder da". */
  text: string;
}

/** Eine Einheit auf der Tafel. */
export interface TafelEinheit {
  /** Kennung der geltenden Meldung; stabil, solange die Einheit gleich bleibt. */
  id: string;
  /** Für das taktische Zeichen. */
  einheit: Einheit;
  /** Organisation und Standort: „THW Oldenburg (NI)", „FF Elsfleth". */
  herkunft: string;
  /** Der Standort am Ende der Herkunft („Oldenburg (NI)"); leer, wenn die Herkunft nur aus einem Teil besteht. */
  ort: string;
  /**
   * Einheitentyp ausgeschrieben: „Bergungsgruppe", „FGr Notversorgung und Notinstandsetzung" (siehe {@link nameTeile});
   * leer, wenn die Herkunft ihn schon nennt.
   */
  typ: string;
  /** Einheitentyp in der Kurzform des Vokabulars: „B", „FGr N"; ohne Vokabular wie {@link typ}. */
  typKurz: string;
  /** Funkrufname des ersten Fahrzeugs, das einen trägt; sonst leer. */
  funkruf: string;
  /** Auftrag oder Notiz des Meldekopfs, eine Zeile. */
  auftrag: string;
  staerke: Staerke;
  /** Niemand hat gezählt: Die Zahlen sind die Sollstärke der Vorbelegung. */
  soll: boolean;
  /**
   * Stand der Angaben (ms): Stand im Bogen, höchstens der Eingang (`angabenZeit`, R14-K1). Er steht an jeder Karte als
   * Uhrzeit, ohne Warnfarbe: Nach einer Stunde trüge sonst fast jede Karte das Zeichen des Bedarfs. Wie viele Stände
   * alt sind, sagt die Randspalte einmal gesammelt.
   */
  stand: number;
  eingetroffen: number;
  /** Was zu entscheiden ist: „Ruhezeit", „Unterbringung", „Verpflegung 20". Leer bei einer Übungsmeldung, die nicht zählt. */
  bedarf: string[];
  marke?: TafelMarke;
  /**
   * Übungsmeldung in einer echten Lage: anwesend, aber nicht gezählt (`zaehltInLage`). Die Karte trägt das Wort
   * {@link UEBUNG_WORT}; ihre Stärke steckt weder in der Gesamtstärke noch in einer Zwischensumme.
   */
  uebung: boolean;
}

/** Eine Gruppe der Tafel: ein Zug, „ohne Zug", eine Organisation oder die Übungsmeldungen, die nicht zählen. */
export interface TafelGruppe {
  schluessel: string;
  titel: string;
  /** Ohne Kopf steht die einzige Organisation: Ihre Summe ist die Gesamtstärke im Kopf der Tafel. */
  kopf: boolean;
  /** Summe der Einheiten der Gruppe. Bei {@link uebung} zählt sie nicht in die Lage und steht nirgends als Zahl da. */
  staerke: Staerke;
  einheiten: TafelEinheit[];
  /** Die Gruppe der Übungsmeldungen einer echten Lage: immer die letzte, immer mit Kopf. Die Summen aller übrigen Gruppen ergeben die Gesamtstärke. */
  uebung: boolean;
}

/** Das Wort an Gruppe und Karte einer Übungsmeldung, die in der Lage nicht zählt. */
export const UEBUNG_WORT = "Übung";

/** Eine abgerückte Einheit: Name und, wenn bekannt, wann. */
export interface TafelAbgang {
  id: string;
  name: string;
  zeit: number | null;
}

export interface Tafelbild {
  /** Das Lagebild der Zeilenansicht: Summen, Bedarf, Bewegungen, Datenstand. */
  bild: Lagebild;
  /** Wonach die Gruppen gebildet sind: nach Zug, sobald eine Einheit einen trägt, sonst nach Organisation. */
  gliederung: "zug" | "organisation";
  /** Die Gruppen in Lesefolge; als letzte, wenn es sie gibt, die Übungsmeldungen, die nicht zählen ({@link TafelGruppe.uebung}). */
  gruppen: TafelGruppe[];
  /** Abgerückte Einheiten, zuletzt abgerückte zuerst. */
  abgerueckt: TafelAbgang[];
  /** Kurzer Name je Meldung (Herkunft und Typ in Kurzform), für die Bewegungen in der Randspalte. */
  namen: Map<string, string>;
  /** Breite, die die breiteste Karte je Fassung braucht, damit nichts gekürzt wird, in Schriftgrößen ({@link kartenBedarf}); 0 ohne Einheiten. */
  bedarf: Record<KartenFassung, number>;
}

/**
 * Herkunft und Typ einer Einheit getrennt. Der Anzeigename („THW Oldenburg (NI)
 * Bergungsgruppe") ist für die Tafel zu lang für eine Zeile und zu wichtig zum
 * Abschneiden: Im eigenen Zug unterscheidet nur der Typ, im Bereitstellungsraum
 * nur die Herkunft. Beide bekommen deshalb ihre eigene Zeile. Die Regel gegen
 * doppelte Teile bleibt die von `einheitAnzeigename` (R5-N6).
 *
 * Der ausgeschriebene Typ beginnt bei den Fachgruppen mit „FGr" statt „Fachgruppe": Das Unterscheidende steht am Ende
 * („… Notversorgung und Notinstandsetzung", „… Wasserschaden/Pumpen (A)") und fiele sonst als Erstes der Kürzung zum
 * Opfer. „FGr" ist die Abkürzung des Vokabulars selbst.
 */
export function nameTeile(e: Einheit): { herkunft: string; ort: string; typ: string; typKurz: string } {
  const tabelle = vokabularFuer(e.organisation, "einheitstyp");
  const lang = vokabText(e.einheitsTyp, tabelle, "name").trim();
  const kurz = vokabText(e.einheitsTyp, tabelle, "kurz").trim();
  const herkunft = einheitAnzeigename({ ...e, einheitsTyp: {} });
  // Der Standort ist, was nach der Organisation kommt. Die Karte kürzt bei Platzmangel den längeren der beiden Teile:
  // bei „Johanniter-Unfall-Hilfe … Oldenburg" die Organisation, damit der Ort bleibt, der gleichnamige Karten unterscheidet.
  const organisation = e.organisationName?.trim() || orgLabel(e.organisation);
  const ort = herkunft.startsWith(organisation + " ") ? herkunft.slice(organisation.length + 1) : "";
  // Nennt Organisation oder Standort den Typ schon („Bundeswehr Panzerpionierzug"), steht er nicht noch einmal da.
  const schonGenannt = lang !== "" && einheitAnzeigename(e) === herkunft;
  return { herkunft, ort, typ: schonGenannt ? "" : lang.replace(/^Fachgruppe(?=\s)/, "FGr"), typKurz: schonGenannt ? "" : kurz || lang };
}

/**
 * Herkunft und Typ einer Meldung. Ein abgeteilter Teil der Einheit („Fachberater", „Rest") trägt sein Etikett hinter
 * dem Typ, in Klammern wie in der Einsatzansicht: Sonst stünden zwei gleichnamige Karten nebeneinander.
 */
export function meldungTeile(m: Pick<MeldeEintrag, "bogen" | "teilEtikett">): { herkunft: string; ort: string; typ: string; typKurz: string } {
  const n = nameTeile(m.bogen.einheit);
  const teil = (m.teilEtikett ?? "").trim();
  if (!teil) return n;
  const mit = (typ: string) => [typ, `(${teil})`].filter(Boolean).join(" ");
  return { ...n, typ: mit(n.typ), typKurz: mit(n.typKurz) };
}

/** Kurzer Bedarf je Einheit: nur, was zu entscheiden ist (`bedarfMarken`, dringend), ohne Füllwörter. */
export function bedarfKurz(e: MeldeEintrag): string[] {
  return bedarfMarken(e.bogen)
    .filter((m) => m.dringend)
    .map((m) => m.lang.replace(/ angefordert$/, "").replace(/ \(Stärke \d+\)$/, ""));
}

function marke(b: Bewegung | undefined): TafelMarke | undefined {
  if (!b) return undefined;
  if (b.art === "Eingetroffen") return { art: "neu", text: b.nachgetragen != null ? "nachgetragen" : "neu" };
  // An der Karte steht die neue Stärke groß. Die Marke nennt, um wie viel sie sich geändert hat, mit Vorzeichen:
  // Ein Verlust soll nicht wie ein Zugang aussehen. Von wo nach wo, steht in der Randspalte („Stärke 8 → 6 (−2)").
  if (b.art === "Folgemeldung") {
    const betrag = / \(([+−]\d+)\)$/.exec(b.detail ?? "")?.[1];
    return { art: "folge", text: betrag ? `Stärke ${betrag}` : "Folgemeldung" };
  }
  if (b.art === "Wieder da") return { art: "wieder", text: "wieder da" };
  return undefined;
}

const NULL_STAERKE = (): Staerke => ({ fuehrer: 0, unterfuehrer: 0, mannschaft: 0, gesamt: 0 });

function summe(einheiten: readonly TafelEinheit[]): Staerke {
  const s = NULL_STAERKE();
  for (const e of einheiten) {
    s.fuehrer += e.staerke.fuehrer;
    s.unterfuehrer += e.staerke.unterfuehrer;
    s.mannschaft += e.staerke.mannschaft;
    s.gesamt += e.staerke.gesamt;
  }
  return s;
}

/**
 * Wann eine abgerückte Einheit abgerückt ist: die gesetzte Abrückzeit, sonst der jüngste Vermerk „Abgerückt". Verglichen
 * wird genau, wie in der Zeilenansicht (`bewegungenSeit`): „Abgerückt (Zeit vom Papier nicht bestätigt)" aus dem
 * Papier-Abgleich trägt die Uhrzeit des Abgleichs, nicht die des Abrückens; die bleibt dann offen (R6-A6).
 */
function abrueckzeit(e: MeldeEintrag): number | null {
  if (e.abgerueckAm != null) return e.abgerueckAm;
  const vermerke = (e.vermerke ?? []).filter((v) => v.text === "Abgerückt");
  return vermerke.length > 0 ? Math.max(...vermerke.map((v) => v.zeit)) : null;
}

export function tafelbild(einsatz: Einsatzsammlung, jetzt: number = Date.now()): Tafelbild {
  const bild = lagebild(einsatz, jetzt);
  const zeilen = new Map<string, EinheitZeile>(bild.einheiten.map((z) => [z.id, z]));
  // Die Bewegungen stehen jüngste zuerst: Je Einheit gilt die erste.
  const bewegt = new Map<string, Bewegung>();
  for (const b of bild.bewegungen) if (!bewegt.has(b.eintrag)) bewegt.set(b.eintrag, b);

  const anwesend = aktuelleMeldungen(einsatz.eintraege, einsatz.art);
  // Anwesend, aber als Übung nicht in dieser Lage; in einer Übung selbst ist die Liste leer, dort zählt jede Meldung.
  const daneben = uebungenAusserhalbDerLage(einsatz.eintraege, einsatz.art);
  const mitZug = anwesend.some((m) => (m.zugEtikett ?? "").trim() !== "");
  // Stelle der ersten Meldung jeder Einheit in der Sammlung: entscheidet bei gleicher Eintreffzeit (ein Stapel Bögen,
  // in einem Zug eingelesen) und bleibt, auch wenn Folgemeldungen dazukommen.
  const ersteStelle = new Map<string, number>();
  einsatz.eintraege.forEach((e, i) => {
    if (!ersteStelle.has(e.einheitSchluessel)) ersteStelle.set(e.einheitSchluessel, i);
  });
  const stelle = new Map<string, number>([...anwesend, ...daneben].map((m) => [m.id, ersteStelle.get(m.einheitSchluessel) ?? 0]));
  // Nach Eintreffzeit, bei gleicher Zeit in der Folge der Aufnahme: Die Folge hängt nicht daran, wer zuletzt gemeldet hat.
  const nachEintreffen = (a: TafelEinheit, b: TafelEinheit) => a.eingetroffen - b.eingetroffen || stelle.get(a.id)! - stelle.get(b.id)!;
  const nach = new Map<string, { titel: string; rang: number; org: OrganisationsTyp; einheiten: TafelEinheit[] }>();
  for (const m of anwesend) {
    const z = zeilen.get(m.id);
    if (!z) continue;
    const zug = (m.zugEtikett ?? "").trim();
    const org = m.bogen.einheit.organisation;
    const schluessel = mitZug ? `zug:${zug}` : `org:${org}`;
    let gruppe = nach.get(schluessel);
    if (!gruppe) {
      gruppe = { titel: mitZug ? zug || "ohne Zug" : orgLabel(org), rang: mitZug && zug === "" ? 1 : 0, org, einheiten: [] };
      nach.set(schluessel, gruppe);
    }
    const neuAmPlatz = marke(bewegt.get(m.id));
    gruppe.einheiten.push({
      id: m.id,
      einheit: m.bogen.einheit,
      ...meldungTeile(m),
      funkruf: z.funkruf,
      auftrag: z.auftrag ?? "",
      staerke: { fuehrer: z.fuehrer, unterfuehrer: z.unterfuehrer, mannschaft: z.mannschaft, gesamt: z.gesamt },
      soll: z.soll,
      stand: angabenZeit(m),
      eingetroffen: z.eingetroffen,
      bedarf: bedarfKurz(m),
      ...(neuAmPlatz ? { marke: neuAmPlatz } : {}),
      uebung: false,
    });
  }

  const gruppen = [...nach.entries()]
    // Züge in Zählfolge („2. Zug" vor „10. Zug"), „ohne Zug" zuletzt; Organisationen in der festen Folge des Formats.
    .sort(([, a], [, b]) => a.rang - b.rang || (mitZug ? a.titel.localeCompare(b.titel, "de", { numeric: true }) : a.org - b.org))
    .map(([schluessel, g]): TafelGruppe => {
      const einheiten = g.einheiten.sort(nachEintreffen);
      return { schluessel, titel: g.titel, kopf: true, staerke: summe(einheiten), einheiten, uebung: false };
    });
  if (!mitZug && gruppen.length === 1) gruppen[0]!.kopf = false;

  // Übungsmeldungen einer echten Lage: eine eigene Gruppe am Ende, über alle Züge hinweg. Stünden sie in ihrem Zug,
  // ergäben dessen Karten nicht mehr dessen Summe. Die Angaben entstehen wie in `lagebild` für die zählenden Einheiten.
  if (daneben.length > 0) {
    const einheiten = daneben
      .map((m): TafelEinheit => {
        const e = m.bogen.einheit;
        const st = staerkeAusBogen(m.bogen);
        return {
          id: m.id,
          einheit: e,
          ...meldungTeile(m),
          funkruf: m.bogen.fahrzeuge.map((f) => funkrufText(f, e)).find((t) => t !== "") ?? "",
          auftrag: m.notiz?.trim() ? auftragKurz(m.notiz) : "",
          staerke: { fuehrer: st.fuehrer, unterfuehrer: st.unterfuehrer, mannschaft: st.mannschaft, gesamt: st.gesamt },
          soll: nurSollstaerke(m.bogen),
          stand: angabenZeit(m),
          eingetroffen: eintreffzeit(m),
          // Ihr Bedarf gehört nicht in diese Lage: Die Randspalte zählt ihn nicht, also steht er auch nicht als Warnung an der Karte.
          bedarf: [],
          uebung: true,
        };
      })
      .sort(nachEintreffen);
    gruppen.push({ schluessel: "uebung", titel: UEBUNG_WORT, kopf: true, staerke: summe(einheiten), einheiten, uebung: true });
  }

  const abgerueckt = geltendeJeEinheit(einsatz.eintraege)
    .filter((e) => e.status === MeldeStatus.ABGERUECKT)
    .map((e): TafelAbgang => {
      const n = meldungTeile(e);
      return { id: e.id, name: [n.herkunft, n.typKurz].filter(Boolean).join(" "), zeit: abrueckzeit(e) };
    })
    .sort((a, b) => (b.zeit ?? 0) - (a.zeit ?? 0) || a.id.localeCompare(b.id));

  const namen = new Map<string, string>(abgerueckt.map((a) => [a.id, a.name]));
  for (const g of gruppen) for (const e of g.einheiten) namen.set(e.id, [e.herkunft, e.typKurz].filter(Boolean).join(" "));
  const bedarf: Record<KartenFassung, number> = { breit: 0, drei: 0, zwei: 0 };
  for (const g of gruppen) {
    for (const e of g.einheiten) {
      const b = kartenBedarf(e);
      for (const f of FASSUNGEN) bedarf[f] = Math.max(bedarf[f], b[f]);
    }
  }
  return { bild, gliederung: mitZug ? "zug" : "organisation", gruppen, abgerueckt, namen, bedarf };
}

/**
 * Mittlere Breite eines Zeichens der Tafelschrift (Archivo) in Schriftgrößen, gemessen an typischen Namen, Aufträgen
 * und Funkrufnamen: fett 0,46 bis 0,59, normal 0,44 bis 0,55. Gerechnet wird mit Werten am oberen Rand der Mitte.
 */
const ZEICHENBREITE = { fett: 0.56, normal: 0.5 } as const;

/**
 * Breite, die eine Karte je Fassung braucht, damit nichts gekürzt wird, in Schriftgrößen der Herkunftszeile. Geschätzt
 * aus Zeichenzahlen, weil der Satz ohne Browser rechnet; die Schriftgrade sind die der Stilvorlage (Typ, Funkrufname
 * und Auftrag 0,74, in der breiten Fassung der Auftrag 0,86, Marken 0,7, Stand 0,62). Für einen Typ mit Kurzform zählt
 * die Kurzform: Sie springt ein, wo der ausgeschriebene nicht passt.
 *
 * {@link tafelSatz} wählt damit, wenn es die Schrift kaum kostet, einen Satz, in dem alles ganz dasteht: etwa die
 * dreizeilige Fassung, wo in der breiten Name und Auftrag nicht nebeneinander passen.
 */
export function kartenBedarf(e: TafelEinheit): Record<KartenFassung, number> {
  const fett = (text: string) => text.length * ZEICHENBREITE.fett;
  const normal = (text: string) => text.length * ZEICHENBREITE.normal;
  // Zeichen, Polster und Balken der Karte (0,36 + 0,5 + 0,2).
  const rand = SATZ.zeichen + 1.06;
  const s = e.staerke;
  const staerke = 0.66 * 0.42 * `${s.fuehrer}/${s.unterfuehrer}/${s.mannschaft}//`.length + 1.16 * 0.63 * String(s.gesamt).length + 0.74 + (e.soll ? 1.1 : 0);
  // „Stand 03:21" samt Abstand; mit Datum („Stand 10.11. 22:58") braucht er mehr, das bleibt der Kürzung überlassen.
  const stand = 3.75;
  // Eine Übungsmeldung, die nicht zählt, trägt ihr Wort als Marke; eine Bewegung oder Bedarf hat sie nicht.
  const marken = [e.uebung ? UEBUNG_WORT : e.marke?.text, e.bedarf.length > 0 ? e.bedarf.join(", ") : undefined].filter((t): t is string => t != null).map((t) => 0.7 * (fett(t) + 0.64));
  const markenBreite = marken.length > 0 ? marken.reduce((summe, b) => summe + b, 0) + (e.bedarf.length > 0 ? 0.88 : 0) + 0.3 * (marken.length - 1) + 0.4 : 0;
  const kopf = fett(e.herkunft) + staerke;
  const typKurz = e.typKurz ? 0.74 * fett(e.typKurz) + 0.33 : 0;
  const ohneKurzform = e.typ !== "" && e.typKurz === e.typ;
  const funk = e.funkruf ? 0.74 * normal(e.funkruf) + 0.33 : 0;
  const auftrag = e.auftrag ? 0.74 * (normal(e.auftrag) + 0.8) : 0;
  return {
    // Zwei Zeilen: Name und Stärke; darunter Typ in Kurzform, Auftrag, Marken und Stand (ohne Funkrufname).
    zwei: rand + Math.max(kopf, typKurz + auftrag + markenBreite + stand),
    // Drei Zeilen: Name und Stärke; Typ und Stand; Funkrufname, Auftrag und Marken.
    drei: rand + Math.max(kopf, typKurz + stand, funk + auftrag + markenBreite),
    // Breit: links Name (und ein Typ ohne Kurzform), rechts Auftrag oder Funkrufname mit Marken, dahinter Stärke und Stand.
    breit: rand + Math.max(fett(e.herkunft), ohneKurzform ? typKurz : 0) + 0.8 + Math.max(e.auftrag ? 0.86 * normal(e.auftrag) : 0, funk + markenBreite) + Math.max(staerke, stand),
  };
}

// ------------------------------------------------------------------ Zeichen

/**
 * Das Band des Quadrats, in dem das Zeichen (Kasten y = 64 bis 192) und in aller Regel sein Größenzeichen (Punkte von
 * y = 38 bis 58) stehen, mit etwas Rand. Das Feld der Tafel hat dieses Seitenverhältnis.
 */
export const ZEICHEN_BAND = { oben: 30, hoehe: 172 } as const;
/** Rand über einem Größenzeichen, das über das Band hinausragt. */
const ZEICHEN_RAND = 8;

const zahlAus = (tag: string, name: string): number | null => {
  const m = new RegExp(`\\s${name}="(-?[\\d.]+)"`).exec(tag);
  return m ? Number(m[1]) : null;
};

/**
 * Oberkante der Größenzeichen: Die Sammlung zeichnet sie als Punkte (Ellipsen) und, beim Verband, als Strich (Linie)
 * über den Kasten. „Staffel" trägt zwei Punkte übereinander und beginnt bei y = 14, der Verband bei 23, alles andere
 * frühestens bei 38.
 */
function zeichenOberkante(svg: string): number {
  let oben = Infinity;
  for (const [tag] of svg.matchAll(/<ellipse\b[^>]*>/g)) {
    const cy = zahlAus(tag, "cy");
    const ry = zahlAus(tag, "ry");
    if (cy != null && ry != null) oben = Math.min(oben, cy - ry);
  }
  for (const [tag] of svg.matchAll(/<line\b[^>]*>/g)) {
    const y1 = zahlAus(tag, "y1");
    const y2 = zahlAus(tag, "y2");
    if (y1 != null && y2 != null) oben = Math.min(oben, Math.min(y1, y2) - (zahlAus(tag, "stroke-width") ?? 0) / 2);
  }
  return oben;
}

/**
 * Taktisches Zeichen für die Tafel zurichten. Die Sammlung zeichnet auf ein Quadrat (256 × 256), das Zeichen samt
 * Größenzeichen füllt davon nur das mittlere Band; auf der Tafel wäre es halb so groß wie sein Platz. Hier wird das
 * Bild auf dieses Band beschnitten. Ragt das Größenzeichen darüber hinaus (die zwei Punkte der Staffel, der Strich des
 * Verbands), beginnt der Ausschnitt entsprechend höher: Das Zeichen steht dann etwas kleiner im selben Feld, statt
 * einen Punkt zu verlieren und als „Trupp" dazustehen. Dazu bekommt die Schrift im Zeichen einen Ausweich: Als Bild
 * eingebettet lädt ein SVG keine Schrift nach, und ohne installierte Roboto stünde das Kurzzeichen in der
 * Serifenschrift des Browsers da.
 *
 * Erkennt die Funktion den Kopf des SVG nicht (anderer Stand der Sammlung), bleibt das Bild unbeschnitten.
 */
export function zeichenFuerTafel(svg: string): string {
  const oben = Math.max(0, Math.min(ZEICHEN_BAND.oben, Math.floor(zeichenOberkante(svg) - ZEICHEN_RAND)));
  const hoehe = ZEICHEN_BAND.oben + ZEICHEN_BAND.hoehe - oben;
  return svg
    .replace(/^(<svg\b[^>]*?)\swidth="256"\sheight="256"\sviewBox="0 0 256 256"/, `$1 width="256" height="${hoehe}" viewBox="0 ${oben} 256 ${hoehe}"`)
    .replaceAll("font-family: 'Roboto';", "font-family: Roboto, Arial, 'Liberation Sans', sans-serif;");
}

// -------------------------------------------------------------- Kleine Texte

/** Dauer knapp für die Randspalte: „9 Min", „4 Std 5 Min", „1 Tag 2 Std"; `null` vor dem Beginn. */
export function dauerKurz(beginn: number, jetzt: number): string | null {
  if (jetzt < beginn) return null;
  const minuten = Math.floor((jetzt - beginn) / 60_000);
  const tage = Math.floor(minuten / 1440);
  const stunden = Math.floor((minuten % 1440) / 60);
  if (tage > 0) return `${tage} ${tage === 1 ? "Tag" : "Tage"} ${stunden} Std`;
  return stunden > 0 ? `${stunden} Std ${minuten % 60} Min` : `${minuten} Min`;
}

/**
 * Die Dauerzeile der Tafel, mit denselben Fällen wie die Zeilenansicht (R6-K4, R7-K3, R7-K8): gesetzter Beginn,
 * sonst die erste Meldung als Vorschlag; ein Beginn in der Zukunft und unplausible Zeiten werden genannt. Die Uhrzeit
 * steht dabei: Wer den Beginn in eine Meldung schreibt, soll ihn nicht aus Uhr und Dauer zurückrechnen müssen.
 */
export function dauerZeile(beginn: number | null, bild: Pick<Lagebild, "ersteMeldung" | "zeitenPruefen">, jetzt: number): string | null {
  if (beginn != null) {
    const d = dauerKurz(beginn, jetzt);
    return d != null ? `Beginn ${uhrzeitText(beginn, jetzt)} · seit ${d}` : `Beginn ${uhrzeitText(beginn, jetzt)} · Einsatz beginnt noch`;
  }
  const d = bild.ersteMeldung != null ? dauerKurz(bild.ersteMeldung, jetzt) : null;
  if (d != null) return `erste Meldung ${uhrzeitText(bild.ersteMeldung!, jetzt)} · seit ${d}`;
  return bild.zeitenPruefen ? "Dauer unklar – Zeiten prüfen (Geräteuhr?)" : null;
}

const WOCHENTAGE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

/** „Dienstag" – der Wochentag gehört bei Lagen über mehrere Tage neben das Datum. */
export function wochentag(d: Date): string {
  return WOCHENTAGE[d.getDay()]!;
}

// -------------------------------------------------------------------- Satz

/**
 * Drei Fassungen einer Einheitenkarte. Der Inhalt ist derselbe, die Anordnung folgt dem Platz:
 *  - `breit`: zwei Zeilen, zwei Spalten (links wer, rechts was); für wenige Einheiten in einer breiten Spalte.
 *  - `drei`: drei Zeilen untereinander (Herkunft, Typ, Funkrufname und Auftrag).
 *  - `zwei`: zwei Zeilen, Typ in Kurzform; für viele Einheiten.
 */
export type KartenFassung = "breit" | "drei" | "zwei";
const FASSUNGEN = ["breit", "drei", "zwei"] as const satisfies readonly KartenFassung[];

/**
 * Maße des Satzes in Vielfachen der Schriftgröße der Herkunftszeile. Die Stilvorlage (`lagetafel.css`) bekommt
 * dieselben Zahlen als Eigenschaften hineingereicht (`lagetafel-ui.tsx`); gerechnet und gesetzt wird mit einer Quelle.
 */
export const SATZ = {
  /** Höhe und Mindestbreite einer Karte je Fassung. */
  karte: {
    breit: { hoehe: 2.75, breite: 37 },
    drei: { hoehe: 3.7, breite: 18.6 },
    zwei: { hoehe: 2.75, breite: 18.6 },
  } satisfies Record<KartenFassung, { hoehe: number; breite: number }>,
  /** Breite des taktischen Zeichens samt Abstand zum Text. */
  zeichen: 2.95,
  /**
   * Spalte „wer" (Herkunft und Typ) der breiten Fassung, als Anteil des Platzes neben dem Zeichen: Vorgabe ohne
   * Messung, kleinster und größter Anteil mit Messung ({@link werBreite}).
   */
  wer: { vorgabe: 0.42, min: 0.2, max: 0.62 },
  /** Kopfzeile einer Gruppe samt Linie. */
  kopf: 1.75,
  /** Abstand über einem Gruppenkopf, der nicht am Spaltenanfang steht. */
  absatz: 1,
  /** Abstand zwischen zwei Karten. */
  fuge: 0.22,
  /** Zeile einer abgerückten Einheit. */
  abgang: 1.45,
  /** Kleinste und größte Schrift der Herkunftszeile, in Hundertsteln der Bildhöhe (`--lt-e`). */
  schriftMin: 2.2,
  schriftMax: 4.6,
  /** Abstand zwischen zwei Spalten, in Hundertsteln der Bildhöhe. */
  spaltenAbstand: 2,
  /** Zeile „Seite 1 von 2" unter der Tafel, in Hundertsteln der Bildhöhe; nur beim Blättern. */
  seitenzeile: 3.4,
  /** Mehr Spalten gibt es nicht. */
  spaltenMax: 6,
  /** Eine reichere Fassung gewinnt, solange ihre Schrift höchstens so viel kleiner ist. */
  reichAb: 0.88,
  /**
   * Ab dieser Schrift (Hundertstel der Bildhöhe) zählt Inhalt mehr als noch größere Schrift: Die reichere Fassung
   * gewinnt dann immer. Sonst stünden sechs Einheiten in der knappen Fassung da, nur weil sie darin größer würden.
   */
  gutGenug: 3.1,
  /** Eine Spalte mehr lohnt erst, wenn die Schrift dadurch um diesen Anteil wächst; sonst lieber breitere Karten. */
  spalteLohnt: 1.03,
  /** So viele abgerückte Einheiten stehen höchstens einzeln auf der Tafel (wenn niemand mehr anwesend ist). */
  abgaengeMax: 6,
  /** Ein Satz, in dem nichts gekürzt wird, gewinnt, solange seine Schrift gut lesbar („gut genug") oder höchstens so viel kleiner ist. */
  ungekuerztAb: 0.9,
} as const;

/** Eine Zelle der Tafel in Lesefolge. `gruppe` und `index` zeigen in {@link Tafelbild.gruppen}. */
export type TafelZelle =
  | { art: "kopf"; gruppe: number; fortsetzung: boolean }
  | { art: "einheit"; gruppe: number; index: number }
  | { art: "abgang-kopf"; fortsetzung: boolean }
  | { art: "abgang"; index: number }
  | { art: "abgang-rest"; anzahl: number };

export interface TafelSatz {
  fassung: KartenFassung;
  /** Schriftgröße der Herkunftszeile in Pixeln. */
  schrift: number;
  /** Spalten je Seite. */
  spalten: number;
  /** Seiten, darin Spalten, darin Zellen. Mehr als eine Seite: Die Tafel blättert. */
  seiten: TafelZelle[][][];
  /** Wie viele abgerückte Einheiten einzeln dastehen (der Rest als „+ n weitere"). */
  abgaenge: number;
}

export interface TafelMasse {
  /** Breite und Höhe der Fläche für die Einheiten, in Pixeln. */
  breite: number;
  hoehe: number;
  /** Ein Hundertstel der Bildhöhe in Pixeln (`--lt-e`). */
  einheit: number;
}

interface Block {
  kopf: ((fortsetzung: boolean) => TafelZelle) | null;
  zeilen: TafelZelle[];
  zeilenHoehe: number;
}

const GENAU = 1e-6;

/**
 * Blöcke der Reihe nach in Spalten der Höhe `hoehe` (in Schriftgrößen) setzen. Ein Block bleibt zusammen, wenn er in
 * eine leere Spalte passt; ein längerer läuft in die nächste weiter und bekommt dort seinen Kopf noch einmal
 * („Fortsetzung"). Ein Kopf steht nie allein am Spaltenende.
 *
 * Mit `fuellen` (beim Blättern) geht der Platz vor: Ein Block beginnt, wo sein Kopf und eine Zeile hinpassen, und
 * läuft in der nächsten Spalte weiter. Blieben die Gruppen dort zusammen, stünde bei Zügen zu je fünf Einheiten jede
 * Spalte halb leer, und die Tafel bräuchte doppelt so viele Seiten.
 */
function setzen(bloecke: readonly Block[], hoehe: number, fuellen = false): TafelZelle[][] {
  const spalten: TafelZelle[][] = [[]];
  let belegt = 0;
  const neueSpalte = () => {
    spalten.push([]);
    belegt = 0;
  };
  for (const b of bloecke) {
    const rest = [...b.zeilen];
    /** Höhe des Kopfs und der ersten `n` Zeilen; `oben`: am Spaltenanfang, also ohne Abstand davor. */
    const bedarf = (n: number, oben: boolean) =>
      b.kopf
        ? (oben ? 0 : SATZ.absatz) + SATZ.kopf + n * (SATZ.fuge + b.zeilenHoehe)
        : n * b.zeilenHoehe + (oben ? Math.max(0, n - 1) : n) * SATZ.fuge;
    let erster = true;
    while (erster || rest.length > 0) {
      const oben = belegt === 0;
      if (!oben) {
        const frei = hoehe - belegt;
        const ganzHier = bedarf(rest.length, false) <= frei + GENAU;
        const ganzOben = bedarf(rest.length, true) <= hoehe + GENAU;
        const anfangHier = bedarf(Math.min(rest.length, 1), false) <= frei + GENAU;
        if ((!fuellen && !ganzHier && ganzOben) || !anfangHier) {
          neueSpalte();
          continue;
        }
      }
      const spalte = spalten[spalten.length - 1]!;
      if (b.kopf) {
        belegt += (oben ? 0 : SATZ.absatz) + SATZ.kopf;
        spalte.push(b.kopf(!erster));
      }
      let gesetzt = 0;
      while (rest.length > 0) {
        const fuge = spalte.length > 0 ? SATZ.fuge : 0;
        // Die erste Zeile einer leeren Spalte steht immer: Sonst käme der Satz bei zu kleiner Fläche nie voran.
        const muss = oben && gesetzt === 0;
        if (!muss && belegt + fuge + b.zeilenHoehe > hoehe + GENAU) break;
        belegt += fuge + b.zeilenHoehe;
        spalte.push(rest.shift()!);
        gesetzt++;
      }
      erster = false;
      if (rest.length > 0) neueSpalte();
    }
  }
  return spalten;
}

function bloecke(gruppen: readonly { kopf: boolean; anzahl: number }[], fassung: KartenFassung, abgaengeGesamt: number, abgaenge: number): Block[] {
  const aus: Block[] = gruppen.map((g, gruppe) => ({
    kopf: g.kopf ? (fortsetzung) => ({ art: "kopf", gruppe, fortsetzung }) : null,
    zeilen: Array.from({ length: g.anzahl }, (_, index): TafelZelle => ({ art: "einheit", gruppe, index })),
    zeilenHoehe: SATZ.karte[fassung].hoehe,
  }));
  if (abgaenge > 0) {
    const zeilen: TafelZelle[] = Array.from({ length: abgaenge }, (_, index) => ({ art: "abgang", index }));
    if (abgaengeGesamt > abgaenge) zeilen.push({ art: "abgang-rest", anzahl: abgaengeGesamt - abgaenge });
    aus.push({ kopf: (fortsetzung) => ({ art: "abgang-kopf", fortsetzung }), zeilen, zeilenHoehe: SATZ.abgang });
  }
  return aus;
}

interface Kandidat {
  fassung: KartenFassung;
  spalten: number;
  schrift: number;
}

/** Größte Schrift, bei der die Blöcke in `spalten` Spalten passen; `null`, wenn es auch die kleinste nicht tut. */
function groessteSchrift(bl: readonly Block[], spalten: number, masse: TafelMasse, breiteJeSchrift: number): number | null {
  const spaltenBreite = (masse.breite - (spalten - 1) * SATZ.spaltenAbstand * masse.einheit) / spalten;
  const unten = SATZ.schriftMin * masse.einheit;
  const oben = Math.min(SATZ.schriftMax * masse.einheit, spaltenBreite / breiteJeSchrift);
  if (oben < unten) return null;
  const passt = (schrift: number) => setzen(bl, masse.hoehe / schrift).length <= spalten;
  if (!passt(unten)) return null;
  if (passt(oben)) return oben;
  let a = unten;
  let b = oben;
  for (let i = 0; i < 24; i++) {
    const m = (a + b) / 2;
    if (passt(m)) a = m;
    else b = m;
  }
  return a;
}

function besterSatz(
  gruppen: readonly { kopf: boolean; anzahl: number }[],
  abgaengeGesamt: number,
  abgaenge: number,
  masse: TafelMasse,
  breiten: Record<KartenFassung, number>,
): Kandidat | null {
  const beste: Partial<Record<KartenFassung, Kandidat>> = {};
  for (const fassung of FASSUNGEN) {
    const bl = bloecke(gruppen, fassung, abgaengeGesamt, abgaenge);
    for (let spalten = 1; spalten <= SATZ.spaltenMax; spalten++) {
      const schrift = groessteSchrift(bl, spalten, masse, breiten[fassung]);
      if (schrift != null && (beste[fassung] == null || schrift > beste[fassung].schrift * SATZ.spalteLohnt)) beste[fassung] = { fassung, spalten, schrift };
    }
  }
  // „breit" und „drei" zeigen dasselbe: Zwischen ihnen entscheidet die Schrift, bei Gleichstand die breite Fassung.
  const reich = beste.breit && beste.drei ? (beste.drei.schrift > beste.breit.schrift + GENAU ? beste.drei : beste.breit) : (beste.breit ?? beste.drei);
  const knapp = beste.zwei;
  if (!reich || !knapp) return reich ?? knapp ?? null;
  // Die knappe Fassung lässt den Funkrufnamen weg und kürzt den Typ. Sie gewinnt nur, wenn die reiche weder gut lesbar
  // ist noch nahe an sie herankommt.
  const schwelle = Math.min(knapp.schrift * SATZ.reichAb, SATZ.gutGenug * masse.einheit);
  return reich.schrift >= schwelle - GENAU ? reich : knapp;
}

/** Wie oft ein Block geteilt ist (Köpfe mit „Fortsetzung"). */
const teilungen = (spalten: readonly TafelZelle[][]) =>
  spalten.flat().filter((z) => (z.art === "kopf" || z.art === "abgang-kopf") && z.fortsetzung).length;

/**
 * Spalten angleichen: dieselben Blöcke in derselben Zahl von Spalten, aber so niedrig wie möglich gesetzt. Ohne das
 * stünden 28 Einheiten als 12 + 12 + 4 da; so werden es 10 + 10 + 8. Ein Block wird dafür nie zusätzlich geteilt.
 */
function ausgeglichen(bl: readonly Block[], hoehe: number): TafelZelle[][] {
  const voll = setzen(bl, hoehe);
  let beste = voll;
  for (let k = 1; k < 40; k++) {
    const versuch = setzen(bl, hoehe * (1 - k / 40));
    if (versuch.length > voll.length) break;
    if (teilungen(versuch) <= teilungen(voll)) beste = versuch;
  }
  return beste;
}

/** Zeilen auf Viertelpixel abrunden: kein Flattern durch Bruchteile beim Messen. */
const runden = (schrift: number) => Math.floor(schrift * 4) / 4;

/**
 * Der Satz der Tafel: Fassung, Schriftgröße, Spalten und Seiten.
 *
 * Rang der Entscheidungen:
 *  1. Alle anwesenden Einheiten stehen auf einer Seite, in der größten Schrift, die das erlaubt.
 *  2. Erst wenn die kleinste Schrift nicht reicht, blättert die Tafel; dann in der knappsten Fassung, und die Gruppen
 *     laufen über Spalten und Seiten weiter, statt Platz frei zu lassen.
 *  3. Abgerückte Einheiten stehen nur da, wenn sonst keine Karte auf der Tafel steht (höchstens `SATZ.abgaengeMax`, der
 *     Rest als Zahl). Sonst führt sie die Randspalte: Ein Block, der mit dem Füllstand kommt und geht, wäre kein
 *     festes Lagebild. Übungsmeldungen, die nicht zählen, sind Karten wie andere.
 *
 * `bedarf` ist die Breite, die der längste Inhalt je Fassung braucht ({@link kartenBedarf}, in Schriftgrößen). Gibt es
 * damit einen Satz, in dem nichts gekürzt wird, gewinnt er, solange seine Schrift gut lesbar bleibt oder höchstens ein
 * Zehntel kleiner ist als ohne diese Rücksicht. Sonst gelten die Mindestbreiten der Fassungen: Dann wird ein langer
 * Name gekürzt, statt allen die Schrift zu nehmen oder die Tafel blättern zu lassen.
 */
export function tafelSatz(
  gruppen: readonly { kopf: boolean; anzahl: number }[],
  abgaengeGesamt: number,
  masse: TafelMasse,
  bedarf: Partial<Record<KartenFassung, number>> = {},
): TafelSatz {
  const leer: TafelSatz = { fassung: "drei", schrift: runden(SATZ.schriftMax * masse.einheit), spalten: 1, seiten: [[]], abgaenge: 0 };
  const einheiten = gruppen.reduce((n, g) => n + g.anzahl, 0);
  if (einheiten === 0 && abgaengeGesamt === 0) return leer;
  if (!(masse.breite > 0 && masse.hoehe > 0 && masse.einheit > 0)) return leer;

  const fertig = (k: Kandidat, abgaenge: number): TafelSatz => {
    const bl = bloecke(gruppen, k.fassung, abgaengeGesamt, abgaenge);
    // Abgerundet wird nur, wenn der Satz es trägt. Das Zusammenhalten der Gruppen macht ihn nicht stetig: In einer etwas
    // höheren Spalte kann eine Gruppe „gerade ganz" in die nächste rücken, statt geteilt zu werden, und eine Spalte mehr
    // brauchen. Die gerechnete Schrift passt in jedem Fall.
    const rund = runden(k.schrift);
    const schrift = setzen(bl, masse.hoehe / rund).length <= k.spalten ? rund : k.schrift;
    return { fassung: k.fassung, schrift, spalten: k.spalten, seiten: [ausgeglichen(bl, masse.hoehe / schrift)], abgaenge };
  };

  const mindestens: Record<KartenFassung, number> = { breit: SATZ.karte.breit.breite, drei: SATZ.karte.drei.breite, zwei: SATZ.karte.zwei.breite };
  const ungekuerzt: Record<KartenFassung, number> = {
    breit: Math.max(mindestens.breit, bedarf.breit ?? 0),
    drei: Math.max(mindestens.drei, bedarf.drei ?? 0),
    zwei: Math.max(mindestens.zwei, bedarf.zwei ?? 0),
  };
  const waehle = (abgaenge: number): Kandidat | null => {
    const frei = besterSatz(gruppen, abgaengeGesamt, abgaenge, masse, mindestens);
    if (!frei) return null;
    const ganz = besterSatz(gruppen, abgaengeGesamt, abgaenge, masse, ungekuerzt);
    // Wie bei den Fassungen: Ist die Schrift des ungekürzten Satzes gut lesbar, gewinnt er immer; darunter nur, wenn er kaum kleiner ist.
    const schwelle = Math.min(frei.schrift * SATZ.ungekuerztAb, SATZ.gutGenug * masse.einheit);
    return ganz && ganz.schrift >= schwelle - GENAU ? ganz : frei;
  };

  const abgaenge = einheiten === 0 ? Math.min(abgaengeGesamt, SATZ.abgaengeMax) : 0;
  const kandidat = waehle(abgaenge);
  if (kandidat) return fertig(kandidat, abgaenge);

  // Blättern: knappste Fassung in der kleinsten Schrift, so viele Spalten wie die Breite trägt.
  const fassung: KartenFassung = "zwei";
  const abstand = SATZ.spaltenAbstand * masse.einheit;
  const kleinste = SATZ.schriftMin * masse.einheit;
  const spalten = Math.max(1, Math.min(SATZ.spaltenMax, Math.floor((masse.breite + abstand) / (kleinste * SATZ.karte[fassung].breite + abstand))));
  const spaltenBreite = (masse.breite - (spalten - 1) * abstand) / spalten;
  const schrift = runden(Math.min(kleinste, spaltenBreite / SATZ.karte[fassung].breite));
  const hoehe = Math.max(masse.hoehe - SATZ.seitenzeile * masse.einheit, schrift * SATZ.karte[fassung].hoehe);
  const alle = setzen(bloecke(gruppen, fassung, abgaengeGesamt, abgaenge), hoehe / schrift, true);
  const seiten: TafelZelle[][][] = [];
  for (let i = 0; i < alle.length; i += spalten) seiten.push(alle.slice(i, i + spalten));
  return { fassung, schrift, spalten, seiten, abgaenge };
}

/**
 * Breite der Spalte „wer" in der breiten Fassung. Dort steht links, wer die Einheit ist (Herkunft, Typ), rechts, was
 * sie tut (Auftrag, Funkrufname). Ein fester Anteil passt selten: Bei „THW Brake" bliebe die halbe Zeile leer, während
 * der Auftrag daneben gekürzt würde; bei „Johanniter-Unfall-Hilfe Regionalverband …" würde der Name gekürzt. Die Spalte
 * ist deshalb so breit wie der längste Name der Tafel (`bedarf.herkunft`, gemessen in `lagetafel-ui.tsx`), für alle
 * Karten gleich, damit die Spalten fluchten. Dem Auftrag bleibt immer ein Rest: Mehr als `SATZ.wer.max` des Platzes
 * neben dem Zeichen (`platz`) bekommt der Name nicht.
 */
export function werBreite(bedarf: { herkunft: number; typ: number; frei: number }, platz: number): number {
  if (!(platz > 0)) return 0;
  // Der Name zuerst. Für einen ausgeschriebenen Typ wächst die Spalte nur so weit, wie dafür weder ein Auftrag noch
  // ein Funkrufname gekürzt wird (`frei`): Der Typ hat eine Kurzform, die beiden haben keine.
  const breite = Math.max(bedarf.herkunft, Math.min(bedarf.typ, bedarf.frei));
  return Math.min(Math.max(breite, platz * SATZ.wer.min), platz * SATZ.wer.max);
}

/** Alle Zellen in einer Spalte, ohne Rechnung: für das Telefon und überall, wo die Fläche mitwächst. Abgerückte wie in {@link tafelSatz}. */
export function tafelFortlaufend(gruppen: readonly { kopf: boolean; anzahl: number }[], abgaengeGesamt: number): TafelZelle[] {
  const aus: TafelZelle[] = [];
  const einheiten = gruppen.reduce((n, g) => n + g.anzahl, 0);
  for (const b of bloecke(gruppen, "drei", abgaengeGesamt, einheiten === 0 ? Math.min(abgaengeGesamt, SATZ.abgaengeMax) : 0)) {
    if (b.kopf) aus.push(b.kopf(false));
    aus.push(...b.zeilen);
  }
  return aus;
}
