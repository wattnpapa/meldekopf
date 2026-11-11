/**
 * Lagetafel: Inhalt und Satz der Tafel-Ansicht des Lagemonitors.
 *
 * Neu im Meldekopf. Die Zahlen kommen unverändert aus `lagemonitor.ts`
 * (`lagebild`), damit Tafel, Zeilenansicht, Einsatzansicht und Lageblatt
 * dieselben Summen zeigen. Hier entsteht nur, was die Tafel zusätzlich braucht:
 *
 *  - **Feste Plätze.** Die Einheiten stehen nach Organisation und darin
 *    nach Eintreffzeit. Eine neue Einheit kommt ans
 *    Ende ihrer Gruppe, eine Folgemeldung ändert die Zahl an Ort und Stelle;
 *    niemand rückt nach oben, weil er zuletzt gemeldet hat. Wer „seine"
 *    Einheit sucht, findet sie dort, wo sie vor fünf Minuten stand.
 *  - **Markierung am Platz.** Was sich in den letzten Minuten bewegt hat
 *    (`Lagebild.bewegungen`), hängt als Marke an der Einheit.
 *  - **Abgerückte Einheiten** führt die Randspalte, die letzten mit Uhrzeit.
 *    Auf der Tafel stehen sie nur, wenn niemand mehr anwesend ist: Ein Block,
 *    der je nach Füllstand kommt und geht, wäre kein festes Lagebild.
 *  - **Übungsmeldungen in einer echten Lage** stehen als eigene, letzte Gruppe
 *    da, ohne zu zählen (`zaehltInLage`): Wer anwesend ist, soll auf der Tafel
 *    zu finden sein, und eine versehentlich als Übung gemeldete Einheit fällt
 *    so auf. Sie stehen als knappe Zeilen wie die abgerückten, nicht als
 *    Karten: Was nicht zählt, soll der Lage weder Platz noch Schrift nehmen
 *    und kein Blättern auslösen. In die Stärke im Kopf, in Bedarf und
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
import { aktuelleMeldungen, uebungenAusserhalbDerLage, zaehltInLage } from "./auswertung";
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
  /** Die Herkunft in der üblichen Kurzform („FF Lenglern"); steht, wo der volle Name nicht passt ({@link herkunftKurzform}). */
  herkunftKurz: string;
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
   * Übungsmeldung in einer echten Lage: anwesend, aber nicht gezählt (`zaehltInLage`). Sie steht als knappe Zeile in
   * der Gruppe {@link UEBUNG_WORT}; ihre Stärke steckt weder in der Gesamtstärke noch in einer Zwischensumme.
   */
  uebung: boolean;
}

/** Eine Gruppe der Tafel: eine Organisation oder die Übungsmeldungen, die nicht zählen. */
export interface TafelGruppe {
  schluessel: string;
  titel: string;
  /** Ohne Kopf steht die einzige Organisation: Ihre Summe ist die Gesamtstärke im Kopf der Tafel. */
  kopf: boolean;
  /** Summe der Einheiten der Gruppe. Bei {@link uebung} zählt sie nicht in die Lage und steht nirgends als Zahl da. */
  staerke: Staerke;
  einheiten: TafelEinheit[];
  /**
   * Die Gruppe der Übungsmeldungen einer echten Lage: immer die letzte, immer mit Kopf, ihre Einheiten als knappe
   * Zeilen. Die Summen aller übrigen Gruppen ergeben die Gesamtstärke.
   */
  uebung: boolean;
}

/** Das Wort an der Gruppe der Übungsmeldungen, die in der Lage nicht zählen, und an einer abgerückten Übungsmeldung. */
export const UEBUNG_WORT = "Übung";

/** Eine abgerückte Einheit: Name und, wenn bekannt, wann. */
export interface TafelAbgang {
  id: string;
  name: string;
  zeit: number | null;
  /** Eine Übungsmeldung, die in dieser Lage nie gezählt hat: Ohne Kennzeichen läse sie sich wie eine Einheit, die der Lage jetzt fehlt. */
  uebung: boolean;
}

export interface Tafelbild {
  /** Das Lagebild der Zeilenansicht: Summen, Bedarf, Bewegungen, Datenstand. */
  bild: Lagebild;
  /** Die Gruppen in Lesefolge; als letzte, wenn es sie gibt, die Übungsmeldungen, die nicht zählen ({@link TafelGruppe.uebung}). */
  gruppen: TafelGruppe[];
  /** Abgerückte Einheiten, zuletzt abgerückte zuerst. */
  abgerueckt: TafelAbgang[];
  /** Kurzer Name je Meldung (Herkunft und Typ in Kurzform), für die Bewegungen in der Randspalte. */
  namen: Map<string, string>;
  /**
   * Breite, die die breiteste Karte je Fassung braucht, damit nichts gekürzt wird, in Schriftgrößen ({@link kartenBedarf});
   * 0 ohne Karten. Die Zeilen der Übungsmeldungen zählen nicht mit: Sie werden gekürzt, nicht die Karten verbreitert.
   */
  bedarf: Record<KartenFassung, number>;
  /** Dasselbe nur für die Namen ({@link namenBedarf}): Passt nicht alles, sollen wenigstens sie ganz dastehen. */
  bedarfNamen: Record<KartenFassung, number>;
}

/**
 * Herkunft und Typ einer Einheit getrennt. Der Anzeigename („THW Oldenburg (NI)
 * Bergungsgruppe") ist für die Tafel zu lang für eine Zeile und zu wichtig zum
 * Abschneiden: Im eigenen Ortsverband unterscheidet nur der Typ, im Bereitstellungsraum
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
  // Ein Freitext-Typ hat keine Kurzform im Vokabular (beide Formen sind sein Text); die übliche Kürzung („SEG" für
  // „Schnelleinsatzgruppe") springt dann ein.
  const typKurz = e.einheitsTyp?.code == null ? kurzName(lang) : kurz;
  return { herkunft, ort, typ: schonGenannt ? "" : lang.replace(/^Fachgruppe(?=\s)/, "FGr"), typKurz: schonGenannt ? "" : typKurz };
}

/**
 * Übliche Kurzformen der Organisationen und ihrer Gliederungen, wie sie auch auf der Lagekarte stehen. Die Tafel zeigt
 * sie nur, wo der volle Name nicht in die Zeile passt (lagetafel-ui.tsx): „Freiwillige Feuerwehr Lenglern" wird
 * „FF Lenglern", „DRK-Kreisverband Buchenrode e. V." wird „DRK-KV Buchenrode". So bleibt erkennbar, was sonst mit
 * Auslassung endete, oft gerade vor dem Teil, der zwei Einheiten unterscheidet. Ohne Rückwärtsblick in den Mustern:
 * Ältere Browser kennen ihn nicht und lehnten das ganze Skript ab.
 */
const KURZFORMEN: readonly [RegExp, string][] = [
  // „e. V." trägt nichts zur Unterscheidung bei, am Ende wie mitten im Namen („Johanniter-Unfall-Hilfe e.V. Regionalverband …").
  [/\s*,?\s*\be\.\s?V\.?(?=$|[\s,;)])/gu, ""],
  [/(^|[\s-])Deutsches Rotes Kreuz(?=$|[\s,.-])/gu, "$1DRK"],
  [/(^|[\s-])Johanniter-Unfall-Hilfe(?=$|[\s,.-])/gu, "$1JUH"],
  [/(^|[\s-])Malteser Hilfsdienst(?=$|[\s,.-])/gu, "$1MHD"],
  [/(^|[\s-])Arbeiter-Samariter-Bund(?=$|[\s,.-])/gu, "$1ASB"],
  [/(^|[\s-])Deutsche Lebens-Rettungs-Gesellschaft(?=$|[\s,.-])/gu, "$1DLRG"],
  [/(^|[\s-])Technisches Hilfswerk(?=$|[\s,.-])/gu, "$1THW"],
  [/(^|[\s-])Freiwillige Feuerwehr(?=$|[\s,.-])/gu, "$1FF"],
  [/(^|[\s-])Berufsfeuerwehr(?=$|[\s,.-])/gu, "$1BF"],
  [/(^|[\s-])Werkfeuerwehr(?=$|[\s,.-])/gu, "$1WF"],
  [/(^|[\s-])Bundeswehr(?=$|[\s,.-])/gu, "$1Bw"],
  [/(^|[\s-])Landesverband(?=$|[\s,.-])/gu, "$1LV"],
  [/(^|[\s-])Bezirksverband(?=$|[\s,.-])/gu, "$1BV"],
  [/(^|[\s-])Regionalverband(?=$|[\s,.-])/gu, "$1RV"],
  [/(^|[\s-])Kreisverband(?=$|[\s,.-])/gu, "$1KV"],
  [/(^|[\s-])Ortsverband(?=$|[\s,.-])/gu, "$1OV"],
  [/(^|[\s-])Ortsverein(?=$|[\s,.-])/gu, "$1OV"],
  [/(^|[\s-])Ortsgruppe(?=$|[\s,.-])/gu, "$1OG"],
  // Für Einheitentypen im Freitext, die keine Kurzform im Vokabular haben.
  [/(^|[\s-])Schnelleinsatzgruppe(?=$|[\s,.-])/gu, "$1SEG"],
  [/(^|[\s-])Technische Einsatzleitung(?=$|[\s,.-])/gu, "$1TEL"],
];

/** Ein Name in seiner üblichen Kurzform ({@link KURZFORMEN}); unverändert, wenn keine passt. */
export function kurzName(name: string): string {
  let kurz = name.trim();
  for (const [muster, ersatz] of KURZFORMEN) kurz = kurz.replace(muster, ersatz);
  return kurz.replace(/\s+/g, " ").trim() || name.trim();
}

/** Kurzform der Herkunft aus ihren Teilen (Organisation und Standort, siehe {@link nameTeile}); Teile einzeln gekürzt. */
export function herkunftKurzform(herkunft: string, ort: string): string {
  const organisation = ort ? herkunft.slice(0, herkunft.length - ort.length).trim() : herkunft;
  return [kurzName(organisation), ort ? kurzName(ort) : ""].filter(Boolean).join(" ");
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

/** Die Teile des Namens samt Kurzform der Herkunft. */
function mitKurzform<T extends { herkunft: string; ort: string }>(n: T): T & { herkunftKurz: string } {
  return { ...n, herkunftKurz: herkunftKurzform(n.herkunft, n.ort) };
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
  // Stelle der ersten Meldung jeder Einheit in der Sammlung: entscheidet bei gleicher Eintreffzeit (ein Stapel Bögen,
  // auf einmal eingelesen) und bleibt, auch wenn Folgemeldungen dazukommen.
  const ersteStelle = new Map<string, number>();
  einsatz.eintraege.forEach((e, i) => {
    if (!ersteStelle.has(e.einheitSchluessel)) ersteStelle.set(e.einheitSchluessel, i);
  });
  const stelle = new Map<string, number>([...anwesend, ...daneben].map((m) => [m.id, ersteStelle.get(m.einheitSchluessel) ?? 0]));
  // Nach Eintreffzeit, bei gleicher Zeit in der Folge der Aufnahme: Die Folge hängt nicht daran, wer zuletzt gemeldet hat.
  const nachEintreffen = (a: TafelEinheit, b: TafelEinheit) => a.eingetroffen - b.eingetroffen || stelle.get(a.id)! - stelle.get(b.id)!;
  const nach = new Map<string, { titel: string; org: OrganisationsTyp; einheiten: TafelEinheit[] }>();
  for (const m of anwesend) {
    const z = zeilen.get(m.id);
    if (!z) continue;
    const org = m.bogen.einheit.organisation;
    const schluessel = `org:${org}`;
    let gruppe = nach.get(schluessel);
    if (!gruppe) {
      gruppe = { titel: orgLabel(org), org, einheiten: [] };
      nach.set(schluessel, gruppe);
    }
    const neuAmPlatz = marke(bewegt.get(m.id));
    gruppe.einheiten.push({
      id: m.id,
      einheit: m.bogen.einheit,
      ...mitKurzform(meldungTeile(m)),
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
    // Organisationen in der festen Folge des Formats.
    .sort(([, a], [, b]) => a.org - b.org)
    .map(([schluessel, g]): TafelGruppe => {
      const einheiten = g.einheiten.sort(nachEintreffen);
      return { schluessel, titel: g.titel, kopf: true, staerke: summe(einheiten), einheiten, uebung: false };
    });
  if (gruppen.length === 1) gruppen[0]!.kopf = false;

  // Übungsmeldungen einer echten Lage: eine eigene Gruppe am Ende, über alle Organisationen hinweg. Stünden sie bei ihrer
  // Organisation, ergäben deren Karten nicht mehr deren Summe. Die Angaben entstehen wie in `lagebild` für die zählenden Einheiten.
  if (daneben.length > 0) {
    const einheiten = daneben
      .map((m): TafelEinheit => {
        const e = m.bogen.einheit;
        const st = staerkeAusBogen(m.bogen);
        return {
          id: m.id,
          einheit: e,
          ...mitKurzform(meldungTeile(m)),
          funkruf: m.bogen.fahrzeuge.map((f) => funkrufText(f, e)).find((t) => t !== "") ?? "",
          auftrag: m.notiz?.trim() ? auftragKurz(m.notiz) : "",
          staerke: { fuehrer: st.fuehrer, unterfuehrer: st.unterfuehrer, mannschaft: st.mannschaft, gesamt: st.gesamt },
          soll: nurSollstaerke(m.bogen),
          stand: angabenZeit(m),
          eingetroffen: eintreffzeit(m),
          // Ihr Bedarf gehört nicht in diese Lage: Die Randspalte zählt ihn nicht, also steht er auch nicht als Warnung an der Zeile.
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
      // Eine Übungsmeldung, die in dieser Lage nie gezählt hat, trägt auch als abgerückte ihr Wort: Sonst läse sie sich
      // wie eine Einheit, die der Lage jetzt fehlt. Das Wort steht neben dem Namen, nicht in ihm: Gekürzt wird der Name.
      // In den Listen (Abgerückt, Randspalte) steht der Name kurz wie der Typ: Dort ist eine Zeile schmal und endet sonst mit
      // Auslassung, oft vor dem Standort, der zwei Einheiten unterscheidet.
      return { id: e.id, name: [herkunftKurzform(n.herkunft, n.ort), n.typKurz].filter(Boolean).join(" "), zeit: abrueckzeit(e), uebung: !zaehltInLage(einsatz.art, e.bogen) };
    })
    .sort((a, b) => (b.zeit ?? 0) - (a.zeit ?? 0) || a.id.localeCompare(b.id));

  const namen = new Map<string, string>(abgerueckt.map((a) => [a.id, a.name]));
  for (const g of gruppen) for (const e of g.einheiten) namen.set(e.id, [e.herkunftKurz, e.typKurz].filter(Boolean).join(" "));
  const bedarf: Record<KartenFassung, number> = { breit: 0, drei: 0, zwei: 0 };
  const bedarfNamen: Record<KartenFassung, number> = { breit: 0, drei: 0, zwei: 0 };
  for (const g of gruppen) {
    if (g.uebung) continue;
    for (const e of g.einheiten) {
      const b = kartenBedarf(e);
      const n = namenBedarf(e);
      for (const f of FASSUNGEN) {
        bedarf[f] = Math.max(bedarf[f], b[f]);
        bedarfNamen[f] = Math.max(bedarfNamen[f], n[f]);
      }
    }
  }
  return { bild, gruppen, abgerueckt, namen, bedarf, bedarfNamen };
}

/**
 * Breite der Zeichen der Tafelschrift (Archivo) in Schriftgrößen, fett gesetzt: im Browser gemessen (jedes Zeichen
 * zehnfach, ohne Unterschneidung) und zu Gruppen gerundet, im Zweifel nach oben. Ein Zeichen, das in keiner Gruppe
 * steht, zählt wie ein Kleinbuchstabe (0,52 bis 0,61). Ein fester Mittelwert reichte nicht: Die Namen auf der Tafel
 * liegen zwischen 0,52 („Freiwillige Feuerwehr …") und 0,62 („DLRG Baden") je Zeichen; mit 0,56 passte „THW
 * Gieboldehausen" nach der Rechnung, auf dem Fernseher fehlten ihm 8 px.
 */
const ZEICHENGRUPPEN: readonly (readonly [string, number])[] = [
  [" ", 0.2],
  ["iljI'!.,:;|", 0.31],
  ["ftr()/-", 0.38],
  ["FJLPSTZ", 0.66],
  ["ABCDEGHKNOQRUVXYÄÖÜ&+", 0.76],
  ["mwM", 0.89],
  ["W—", 1],
];
const ZEICHENBREITE = new Map<string, number>(ZEICHENGRUPPEN.flatMap(([zeichen, breite]) => Array.from(zeichen, (z): [string, number] => [z, breite])));
/** Normal gesetzt ist die Schrift etwas schmaler als fett (gemessen 0,93 bis 1,0). */
const NORMAL_ZU_FETT = 0.96;

/** Geschätzte Breite eines Textes in fetter Tafelschrift, in Schriftgrößen ({@link ZEICHENGRUPPEN}). */
export function textBreite(text: string): number {
  let summe = 0;
  for (const zeichen of text) summe += ZEICHENBREITE.get(zeichen) ?? 0.61;
  return summe;
}

/** Zeichen, Polster und Balken der Karte (0,36 + 0,5 + 0,2), in Schriftgrößen der Herkunftszeile. */
const kartenRand = () => SATZ.zeichen + 1.06;

/** „Stand 03:21" samt Abstand; mit Datum („Stand 10.11. 22:58") braucht er mehr, das bleibt der Kürzung überlassen. */
const STAND_BREITE = 3.75;

/** Die Stärke an der Karte („0/3/6// 9", mit Soll-Marke) samt Abstand zum Namen, in Schriftgrößen der Herkunftszeile. */
function staerkeBreite(e: TafelEinheit): number {
  const s = e.staerke;
  return 0.66 * 0.42 * `${s.fuehrer}/${s.unterfuehrer}/${s.mannschaft}//`.length + 1.16 * 0.63 * String(s.gesamt).length + 0.74 + (e.soll ? 1.1 : 0);
}

/**
 * Breite, die eine Karte je Fassung braucht, damit ihr Name ganz dasteht (in der Kurzform, {@link herkunftKurzform}),
 * in Schriftgrößen der Herkunftszeile. In „zwei" und „drei" teilt er sich die erste Zeile mit der Stärke; in „breit"
 * steht er in der Spalte „wer", die höchstens `SATZ.wer.max` des Platzes neben dem Zeichen bekommt.
 */
export function namenBedarf(e: TafelEinheit): Record<KartenFassung, number> {
  const rand = kartenRand();
  const name = textBreite(e.herkunftKurz);
  const staerke = staerkeBreite(e);
  return {
    zwei: rand + name + staerke,
    drei: rand + name + staerke,
    breit: rand + Math.max((name + 0.8) / SATZ.wer.max, name + 0.8 + Math.max(staerke, STAND_BREITE)),
  };
}

/**
 * Breite, die eine Karte je Fassung braucht, damit nichts gekürzt wird, in Schriftgrößen der Herkunftszeile. Geschätzt
 * aus den Breiten der Zeichen ({@link textBreite}), weil der Satz ohne Browser rechnet; die Schriftgrade sind die der Stilvorlage (Typ, Funkrufname
 * und Auftrag 0,74, in der breiten Fassung der Auftrag 0,86, Marken 0,7, Stand 0,62). Für Herkunft und Typ zählt die
 * Kurzform („FF Lenglern", „B"): Sie springt ein, wo die volle Form nicht passt, und muss selbst ganz dastehen.
 *
 * {@link tafelSatz} wählt damit, wenn es die Schrift kaum kostet, einen Satz, in dem alles ganz dasteht: etwa die
 * dreizeilige Fassung, wo in der breiten Name und Auftrag nicht nebeneinander passen.
 */
export function kartenBedarf(e: TafelEinheit): Record<KartenFassung, number> {
  const fett = textBreite;
  const normal = (text: string) => textBreite(text) * NORMAL_ZU_FETT;
  const rand = kartenRand();
  const staerke = staerkeBreite(e);
  const stand = STAND_BREITE;
  const marken = [e.marke?.text, e.bedarf.length > 0 ? e.bedarf.join(", ") : undefined].filter((t): t is string => t != null).map((t) => 0.7 * (fett(t) + 0.64));
  const markenBreite = marken.length > 0 ? marken.reduce((summe, b) => summe + b, 0) + (e.bedarf.length > 0 ? 0.88 : 0) + 0.3 * (marken.length - 1) + 0.4 : 0;
  // Wie beim Typ zählt die Kurzform: Sie springt ein, wo der volle Name nicht passt („FF Lenglern"), und bleibt ganz.
  const kopf = fett(e.herkunftKurz) + staerke;
  const typKurz = e.typKurz ? 0.74 * fett(e.typKurz) + 0.33 : 0;
  const funk = e.funkruf ? 0.74 * normal(e.funkruf) + 0.33 : 0;
  const auftrag = e.auftrag ? 0.74 * (normal(e.auftrag) + 0.8) : 0;
  return {
    // Zwei Zeilen: Name und Stärke; darunter Typ in Kurzform, Auftrag, Marken und Stand (ohne Funkrufname).
    zwei: rand + Math.max(kopf, typKurz + auftrag + markenBreite + stand),
    // Drei Zeilen: Name und Stärke; Typ und Stand; Funkrufname, Auftrag und Marken.
    drei: rand + Math.max(kopf, typKurz + stand, funk + auftrag + markenBreite),
    // Breit: links Name und Typ, rechts Auftrag oder Funkrufname mit Marken, dahinter Stärke und Stand. Ein Typ aus dem
    // Vokabular ist kurz („B"); ins Gewicht fällt hier der Freitext, auch in seiner Kurzform („SEG Betreuung …").
    breit: rand + Math.max(fett(e.herkunftKurz), typKurz) + 0.8 + Math.max(e.auftrag ? 0.86 * normal(e.auftrag) : 0, funk + markenBreite) + Math.max(staerke, stand),
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

/**
 * Eine Gruppe, wie der Satz sie sieht: ob sie einen Kopf hat, wie viele Einheiten sie führt und ob diese als knappe
 * Zeile stehen statt als Karte (die Übungsmeldungen, die nicht zählen).
 */
export interface SatzGruppe {
  kopf: boolean;
  anzahl: number;
  zeile?: boolean;
}

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
 * läuft in der nächsten Spalte weiter. Blieben die Gruppen dort zusammen, stünde bei Gruppen zu je fünf Einheiten jede
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

function bloecke(gruppen: readonly SatzGruppe[], fassung: KartenFassung, abgaengeGesamt: number, abgaenge: number): Block[] {
  const aus: Block[] = gruppen.map((g, gruppe) => ({
    kopf: g.kopf ? (fortsetzung) => ({ art: "kopf", gruppe, fortsetzung }) : null,
    zeilen: Array.from({ length: g.anzahl }, (_, index): TafelZelle => ({ art: "einheit", gruppe, index })),
    // Die Übungsmeldungen stehen als Zeile, so hoch wie die einer abgerückten Einheit, in jeder Fassung gleich.
    zeilenHoehe: g.zeile ? SATZ.abgang : SATZ.karte[fassung].hoehe,
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
  gruppen: readonly SatzGruppe[],
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
 *  3. Abgerückte Einheiten stehen nur da, wenn sonst nichts auf der Tafel steht (höchstens `SATZ.abgaengeMax`, der
 *     Rest als Zahl). Sonst führt sie die Randspalte: Ein Block, der mit dem Füllstand kommt und geht, wäre kein
 *     festes Lagebild. Übungsmeldungen, die nicht zählen, stehen als knappe Zeilen (`SatzGruppe.zeile`).
 *
 * `bedarf` ist die Breite, die der längste Inhalt je Fassung braucht ({@link kartenBedarf}, in Schriftgrößen). Gibt es
 * damit einen Satz, in dem nichts gekürzt wird, gewinnt er, solange seine Schrift gut lesbar bleibt oder höchstens ein
 * Zehntel kleiner ist als ohne diese Rücksicht. Sonst gilt dasselbe für `namen`, die Breite, die allein die Namen
 * brauchen ({@link namenBedarf}): Sie sagen, wer da ist; Typ, Auftrag und Marken dürfen eher gekürzt werden. Ein
 * einziger langer Auftrag soll nicht dazu führen, dass auch ein Name gekürzt wird, dem eine Drittel Schriftbreite fehlt.
 * Erst wenn auch das zu viel kostet, gelten die Mindestbreiten der Fassungen: Dann wird ein langer Name gekürzt, statt
 * allen die Schrift zu nehmen oder die Tafel blättern zu lassen.
 */
export function tafelSatz(
  gruppen: readonly SatzGruppe[],
  abgaengeGesamt: number,
  masse: TafelMasse,
  bedarf: Partial<Record<KartenFassung, number>> = {},
  namen: Partial<Record<KartenFassung, number>> = {},
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
  const mitBedarf = (b: Partial<Record<KartenFassung, number>>): Record<KartenFassung, number> => ({
    breit: Math.max(mindestens.breit, b.breit ?? 0),
    drei: Math.max(mindestens.drei, b.drei ?? 0),
    zwei: Math.max(mindestens.zwei, b.zwei ?? 0),
  });
  const waehle = (abgaenge: number): Kandidat | null => {
    const frei = besterSatz(gruppen, abgaengeGesamt, abgaenge, masse, mindestens);
    if (!frei) return null;
    // Wie bei den Fassungen: Ist die Schrift eines ungekürzten Satzes gut lesbar, gewinnt er immer; darunter nur, wenn er kaum
    // kleiner ist. Erst alles ganz, dann wenigstens die Namen.
    const schwelle = Math.min(frei.schrift * SATZ.ungekuerztAb, SATZ.gutGenug * masse.einheit);
    for (const stufe of [bedarf, namen]) {
      const ganz = besterSatz(gruppen, abgaengeGesamt, abgaenge, masse, mitBedarf(stufe));
      if (ganz && ganz.schrift >= schwelle - GENAU) return ganz;
    }
    return frei;
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
 * richtet sich deshalb nach den Namen der Tafel (gemessen in `lagetafel-ui.tsx`), für alle Karten gleich, damit die
 * Spalten fluchten:
 *
 * - `ganz`: was ganz dastehen muss, der längste Name oder Typ ohne Kurzform und die längste Kurzform;
 * - `lang`: was dastehen soll, soweit Platz ist, die längste volle Form, für die eine Kurzform einspringt
 *   („Freiwillige Feuerwehr Lenglern", „Bergungsgruppe");
 * - `frei`: was Auftrag und Funkrufname daneben übrig lassen.
 *
 * Dem Auftrag bleibt immer ein Rest: Mehr als `SATZ.wer.max` des Platzes neben dem Zeichen (`platz`) bekommt der Name nicht.
 */
export function werBreite(bedarf: { ganz: number; lang: number; frei: number }, platz: number): number {
  if (!(platz > 0)) return 0;
  // Was ganz dastehen muss, zuerst. Für eine volle Form wächst die Spalte nur so weit, wie dafür weder ein Auftrag noch
  // ein Funkrufname gekürzt wird (`frei`): Name und Typ haben eine Kurzform, die beiden nicht.
  const breite = Math.max(bedarf.ganz, Math.min(bedarf.lang, bedarf.frei));
  return Math.min(Math.max(breite, platz * SATZ.wer.min), platz * SATZ.wer.max);
}

/** Alle Zellen in einer Spalte, ohne Rechnung: für das Telefon und überall, wo die Fläche mitwächst. Abgerückte wie in {@link tafelSatz}. */
export function tafelFortlaufend(gruppen: readonly SatzGruppe[], abgaengeGesamt: number): TafelZelle[] {
  const aus: TafelZelle[] = [];
  const einheiten = gruppen.reduce((n, g) => n + g.anzahl, 0);
  for (const b of bloecke(gruppen, "drei", abgaengeGesamt, einheiten === 0 ? Math.min(abgaengeGesamt, SATZ.abgaengeMax) : 0)) {
    if (b.kopf) aus.push(b.kopf(false));
    aus.push(...b.zeilen);
  }
  return aus;
}
