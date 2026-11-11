/**
 * Herkunft: Erfassungsbogen `src/app/einsatz-abgleich.ts` (Commit 441811c).
 *
 * Abgleich einer importierten Einsatz-Sammlung mit dem Stand dieses Geräts.
 *
 * Der geteilte Kern (`einsatzImportieren`, Submodul) führt nur über die
 * Eintrags-ID zusammen: Meldungen, die das Gerät noch nicht kennt, kommen
 * dazu, bekannte bleiben unberührt. Was die Führungsstelle des anderen Geräts
 * an bekannten Einheiten getan hat — Abrücken, Auftrag/Notiz,
 * Eintreffzeit —, ging beim Rückimport still verloren. Die Quittung sagte
 * „0 neue Meldung(en) ergänzt", und beide Geräte führten danach verschiedene
 * Lagen (Audit Runde 3, R3-W1).
 *
 * Diese Schicht legt sich um den Kern, ohne ihn zu ändern: Sie merkt sich den
 * Stand vor dem Import, lässt den Kern die neuen Meldungen anhängen und
 * gleicht danach je Einheit die Zusätze der Führungsstelle ab.
 *
 * Regel je Feld (Status samt Abrückzeit, Auftrag/Notiz, Eintreffzeit):
 *  1. Gleich → nichts zu tun.
 *  2. Den Verlauf der Führungsstelle (`vermerke`, mit Uhrzeit) tragen beide
 *     Stände mit. Hat nur eine Seite das Feld geändert, seit sich die Stände
 *     zuletzt kannten (Vermerk, den die andere Seite nicht hat), gilt diese.
 *  3. Haben beide Seiten es geändert, gilt der jüngere Vermerk — und der
 *     Abgleich nennt das als Widerspruch in der Quittung und im Verlauf der
 *     Einheit („Abgleich: …"), damit nichts still überschrieben wird.
 *  4. Ohne Vermerk (ältere Sammlungen): Ist der Wert
 *     hier leer, wird er übernommen. Für den Status zählt die Abrückzeit als
 *     Änderungszeitpunkt. Sonst bleibt der Wert dieses Geräts stehen, und der
 *     Unterschied wird als Widerspruch genannt.
 *
 * Kein Schemawechsel: die Felder sind die App-Zusätze aus eintrag-zeiten.ts,
 * die schon heute mit Sammel-PDF und Einsatz-Transport reisen.
 *
 * Neu im Meldekopf: die Art der Sammlung. Sie lässt sich nachträglich ändern
 * (`einsatzArtSetzen`) und entscheidet, ob Übungsbögen zählen; zwei Geräte
 * mit verschiedener Art zählen dieselbe Lage verschieden. Es gilt die zuletzt
 * umgestellte (`artSeit`); hat nur ein Gerät umgestellt, dessen Art. Haben
 * beide umgestellt oder lässt es sich nicht entscheiden, nennt die Quittung
 * es als Widerspruch.
 */

import {
  MeldeStatus,
  einsaetzeLaden,
  einsaetzePapierkorb,
  einsatzImportieren,
  type EinsatzArt,
  type Einsatzsammlung,
  type MeldeEintrag,
} from "@bos/meldekopf/einsaetze";
import { ART_LABEL } from "../einsaetze-konstanten";
import { staerke } from "@bos/eeb-format/model";
import { geltendeJeEinheit, istPlatzhalterFassung } from "../fassung-vorrang";
import { einheitAnzeigename, zeitpunktDeutsch } from "../hilfen";
import { sammlungenSchreiben, zeitKurz, type FuehrungsVermerk } from "../eintrag-zeiten";

export type Feld = "status" | "notiz" | "eintreffzeit";

const FELD_NAME: Record<Feld, string> = {
  status: "Status",
  notiz: "Auftrag/Notiz",
  eintreffzeit: "Eintreffzeit",
};

/**
 * Zu welchem Feld gehört ein Vermerk? Die Texte schreibt eintrag-zeiten.ts
 * (`statusMitZeitSetzen`, `abrueckzeitSetzen`, `notizSetzen`,
 * `eintreffzeitSetzen`); „Abgleich: …" gehört zu keinem Feld.
 */
export function vermerkFeld(text: string): Feld | null {
  if (/^(Abgerückt|Wieder als anwesend geführt|Status geändert|Abrückzeit korrigiert)/.test(text)) return "status";
  if (/^Auftrag\/Notiz/.test(text)) return "notiz";
  if (/^Eintreffzeit korrigiert/.test(text)) return "eintreffzeit";
  return null;
}

/** Kennung eines Vermerks für den Vergleich zweier Stände. */
export function vermerkKennung(einheitSchl: string, v: FuehrungsVermerk): string {
  return `${einheitSchl}|${v.zeit}|${v.text}`;
}

/** Alle Vermerke einer Sammlung als Kennungen (je Einheit, über alle Fassungen). */
export function vermerkKennungen(eintraege: MeldeEintrag[]): Set<string> {
  const k = new Set<string>();
  for (const e of eintraege) for (const v of e.vermerke ?? []) k.add(vermerkKennung(e.einheitSchluessel, v));
  return k;
}

interface Seite {
  kopf: MeldeEintrag;
  vermerke: FuehrungsVermerk[];
  kennungen: Set<string>;
}

function seite(eintraege: MeldeEintrag[], schl: string): Seite | null {
  const eigene = eintraege.filter((e) => e.einheitSchluessel === schl);
  const kopf = geltendeJeEinheit(eigene)[0];
  if (!kopf) return null;
  const vermerke = vereinigeVermerke(eigene.map((e) => e.vermerke ?? []));
  return { kopf, vermerke, kennungen: new Set(vermerke.map((v) => vermerkKennung(schl, v))) };
}

function vereinigeVermerke(listen: FuehrungsVermerk[][]): FuehrungsVermerk[] {
  const gesehen = new Set<string>();
  const alle: FuehrungsVermerk[] = [];
  for (const l of listen) {
    for (const v of l) {
      const k = `${v.zeit}|${v.text}`;
      if (gesehen.has(k)) continue;
      gesehen.add(k);
      alle.push({ zeit: v.zeit, text: v.text });
    }
  }
  return alle.sort((a, b) => a.zeit - b.zeit);
}

/** Wert eines Felds als Vergleichs- und Anzeigegröße. */
interface Wert {
  gleichheit: string;
  text: string;
  leer: boolean;
}

/**
 * Vergleichswert eines Felds der Einheit (Status samt Abrückzeit, Auftrag,
 * Eintreffzeit) — Grundlage der Stände „was hat sich seit dem Export
 * geändert?" (export-stand.ts, R4-K1): Es zählt der Zustand, nicht die Zahl der
 * Vermerke, damit „Abrücken" und sein „Rückgängig" nichts Neues ergeben.
 */
export function feldGleichheit(feld: Feld, e: MeldeEintrag): string {
  return wert(feld, e).gleichheit;
}

/**
 * Felder der Stände „was hat sich seit dem Export geändert?": die vier Felder
 * des Abgleichs und dazu die geltende Fassung selbst (R5-W1). Der Wechsel der
 * geltenden Fassung („Diese Fassung gilt", Vorrang vom anderen Gerät) ist eine
 * Änderung der Lage, auch wenn kein neuer Eintrag entstand — der Stab plant
 * sonst weiter mit der Schnellerfassung, während der Meldekopf den Bogen führt.
 * Der Abgleich selbst gleicht „fassung" nicht nach den Regeln der übrigen Felder
 * ab: Den Vorrang trägt `ersetztDurch`.
 */
export type StandFeld = Feld | "fassung";

export function standGleichheit(feld: StandFeld, e: MeldeEintrag): string {
  return feld === "fassung" ? e.id : feldGleichheit(feld, e);
}

function wert(feld: Feld, e: MeldeEintrag): Wert {
  switch (feld) {
    case "status": {
      const s = e.status;
      if (s === MeldeStatus.ABGERUECKT) {
        return {
          gleichheit: `1|${e.abgerueckAm ?? ""}`,
          text: e.abgerueckAm != null ? `abgerückt ${zeitKurz(e.abgerueckAm)}` : "abgerückt",
          leer: false,
        };
      }
      if (s === MeldeStatus.AUFGEGANGEN) return { gleichheit: "2", text: "zusammengeführt", leer: false };
      return { gleichheit: "0", text: "anwesend", leer: true };
    }
    case "notiz":
      return e.notiz
        ? { gleichheit: e.notiz, text: `Auftrag „${e.notiz}“`, leer: false }
        : { gleichheit: "", text: "ohne Auftrag", leer: true };
    case "eintreffzeit": {
      const t = e.eingetroffenAm ?? e.empfangenAm;
      return { gleichheit: String(t), text: `eingetroffen ${zeitKurz(t)}`, leer: false };
    }
  }
}

/** Änderungszeitpunkt des Status ohne Vermerk: Abrücken bzw. Zusammenführen. */
function statusZeit(e: MeldeEintrag): number | undefined {
  if (e.status === MeldeStatus.ABGERUECKT) return e.abgerueckAm;
  if (e.status === MeldeStatus.AUFGEGANGEN) return e.aufgegangenIn?.zusammengefuehrtAm;
  return undefined;
}

interface Entscheidung {
  von: "hier" | "datei";
  widerspruch: boolean;
}

function entscheide(feld: Feld, hier: Seite, datei: Seite): Entscheidung | null {
  if (wert(feld, hier.kopf).gleichheit === wert(feld, datei.kopf).gleichheit) return null;
  const neuSeit = (a: Seite, b: Seite) =>
    a.vermerke
      .filter((v) => vermerkFeld(v.text) === feld && !b.kennungen.has(vermerkKennung(b.kopf.einheitSchluessel, v)))
      .reduce<number | undefined>((m, v) => (m == null || v.zeit > m ? v.zeit : m), undefined);
  const hierT = neuSeit(hier, datei);
  const dateiT = neuSeit(datei, hier);
  if (dateiT != null && hierT == null) return { von: "datei", widerspruch: false };
  if (hierT != null && dateiT == null) return { von: "hier", widerspruch: false };
  if (hierT != null && dateiT != null) return { von: dateiT > hierT ? "datei" : "hier", widerspruch: true };
  // Ohne Vermerk auf beiden Seiten.
  if (feld === "status") {
    const h = statusZeit(hier.kopf);
    const d = statusZeit(datei.kopf);
    if (d != null && h == null) return { von: "datei", widerspruch: false };
    if (h != null && d == null) return { von: "hier", widerspruch: false };
    if (h != null && d != null) return { von: d > h ? "datei" : "hier", widerspruch: true };
    return { von: "hier", widerspruch: true };
  }
  const hierLeer = wert(feld, hier.kopf).leer;
  const dateiLeer = wert(feld, datei.kopf).leer;
  if (hierLeer && !dateiLeer) return { von: "datei", widerspruch: false };
  if (!hierLeer && dateiLeer) return { von: "hier", widerspruch: false };
  return { von: "hier", widerspruch: true };
}

/** Wert eines Felds von `quelle` auf `ziel` übertragen. */
function uebertrage(feld: Feld, quelle: MeldeEintrag, ziel: MeldeEintrag): void {
  switch (feld) {
    case "status":
      ziel.status = quelle.status;
      if (quelle.abgerueckAm != null) ziel.abgerueckAm = quelle.abgerueckAm;
      else delete ziel.abgerueckAm;
      if (quelle.aufgegangenIn) ziel.aufgegangenIn = { ...quelle.aufgegangenIn };
      else delete ziel.aufgegangenIn;
      break;
    case "notiz":
      if (quelle.notiz) ziel.notiz = quelle.notiz;
      else delete ziel.notiz;
      break;
    case "eintreffzeit":
      ziel.eingetroffenAm = quelle.eingetroffenAm ?? quelle.empfangenAm;
      break;
  }
}

/** Was sich an einer Einheit durch den Abgleich geändert hat. */
export interface AbgleichAenderung {
  einheitSchluessel: string;
  /** Kurzname der Einheit („Ulm", sonst Anzeigename). */
  einheit: string;
  /** Übernommene Werte, z. B. „abgerückt 20:47". */
  was: string[];
}

/** Beide Geräte haben dasselbe Feld geändert — der jüngere Stand gilt. */
export interface AbgleichWiderspruch {
  einheitSchluessel: string;
  einheit: string;
  feld: string;
  hier: string;
  datei: string;
  /** Welcher Wert jetzt gilt. */
  gilt: "hier" | "datei";
}

/** Die Art der Sammlung war auf beiden Geräten verschieden (neu im Meldekopf). */
export interface ArtAbgleich {
  hier: EinsatzArt;
  datei: EinsatzArt;
  /** Welche jetzt gilt: die zuletzt umgestellte. */
  gilt: "hier" | "datei";
  /** Beide Geräte haben umgestellt, oder keines trägt eine Zeit: Die Quittung nennt es, damit nichts still kippt. */
  widerspruch: boolean;
}

export interface AbgleichErgebnis {
  neuerEinsatz: boolean;
  /** Neu angehängte Meldungen (Kern). */
  hinzugefuegt: number;
  aktualisiert: AbgleichAenderung[];
  widersprueche: AbgleichWiderspruch[];
  /** Eintrags-IDs, die durch den Import hierher kamen. */
  neueIds: string[];
  /** Vermerk-Kennungen, die durch den Import hierher kamen oder dabei entstanden. */
  neueVermerke: string[];
  /**
   * Je Einheit die Felder, deren Wert jetzt dem der Datei entspricht — das
   * andere Gerät kennt sie (R4-W7). Wo hier ein anderer Wert gilt (Widerspruch,
   * hier behalten), fehlt das Feld: das hat das andere Gerät noch nicht.
   */
  bekannt: Record<string, Partial<Record<StandFeld, string>>>;
  /** Nur wenn die Art auf beiden Geräten verschieden war. */
  art?: ArtAbgleich;
}

/**
 * Hat das Einspielen einer Datei etwas verändert? Neue Meldungen oder aktualisierte Werte ja; eine ältere Datei,
 * deren Inhalt hier schon steht (oder überholt ist), nicht (R13-A4). Eine von dort übernommene Art zählt mit.
 */
export function importUebernahm(r: Pick<AbgleichErgebnis, "neuerEinsatz" | "hinzugefuegt" | "aktualisiert"> & Partial<Pick<AbgleichErgebnis, "art">>): boolean {
  return r.neuerEinsatz || r.hinzugefuegt > 0 || r.aktualisiert.length > 0 || r.art?.gilt === "datei";
}

/**
 * Welche Art gilt, wenn sie auf beiden Geräten verschieden ist: die zuletzt umgestellte (`artSeit`). Hat nur eine Seite
 * umgestellt, gilt deren Art ohne Widerspruch; die andere kennt die Umstellung nur noch nicht.
 */
export function artEntscheiden(hier: Pick<Einsatzsammlung, "art" | "artSeit">, datei: Pick<Einsatzsammlung, "art" | "artSeit">): ArtAbgleich | null {
  if (hier.art === datei.art) return null;
  const h = hier.artSeit;
  const d = datei.artSeit;
  if (d != null && (h == null || d > h)) return { hier: hier.art, datei: datei.art, gilt: "datei", widerspruch: h != null };
  return { hier: hier.art, datei: datei.art, gilt: "hier", widerspruch: h == null || d != null };
}

/** Der Satz der Quittung zur Art; leer, wenn nichts zu sagen ist (die Art dieses Geräts ist die jüngere). */
export function artText(a: ArtAbgleich | undefined): string {
  if (!a) return "";
  if (a.gilt === "datei") {
    return a.widerspruch
      ? `Widerspruch bei der Art der Sammlung: hier „${ART_LABEL[a.hier]}“, in der Datei „${ART_LABEL[a.datei]}“; die jüngere Umstellung aus der Datei gilt. Bitte prüfen.`
      : `Art der Sammlung vom anderen Gerät übernommen: jetzt „${ART_LABEL[a.datei]}“ (vorher „${ART_LABEL[a.hier]}“).`;
  }
  return a.widerspruch
    ? `Widerspruch bei der Art der Sammlung: hier „${ART_LABEL[a.hier]}“, in der Datei „${ART_LABEL[a.datei]}“; die Art dieses Geräts bleibt. Bitte prüfen.`
    : "";
}

/** Satz der Quittung, wenn die Datei nichts Neueres enthielt. */
export const NICHTS_UEBERNOMMEN_SATZ = "Datei war älter oder gleich: keine Änderung übernommen, dieser Stand bleibt.";

function kurzname(e: MeldeEintrag): string {
  const ort = e.bogen.einheit.hierarchie[0]?.name?.trim();
  const basis = ort || einheitAnzeigename(e.bogen.einheit);
  return e.teilEtikett ? `${basis} (${e.teilEtikett})` : basis;
}

function alleSammlungen(): Einsatzsammlung[] {
  return [...einsaetzeLaden(), ...einsaetzePapierkorb()];
}

export const FELDER: Feld[] = ["status", "notiz", "eintreffzeit"];

/** Alle Felder der Stände: {@link FELDER} und die geltende Fassung (R5-W1). */
export const STAND_FELDER: StandFeld[] = [...FELDER, "fassung"];

/** „Bogen der Einheit gilt (Stärke 10 → 12)" — der Wechsel der geltenden Fassung in Worten (R5-W4). */
export function fassungWechselText(alt: MeldeEintrag, neu: MeldeEintrag): string {
  const von = staerke(alt.bogen).gesamt;
  const nach = staerke(neu.bogen).gesamt;
  const kopf =
    istPlatzhalterFassung(alt) && !istPlatzhalterFassung(neu)
      ? "Bogen der Einheit gilt, ersetzt die Schnellerfassung"
      : `Fassung vom ${zeitpunktDeutsch(neu.bogen.stand)} gilt`;
  return von !== nach ? `${kopf} (Stärke ${von} → ${nach})` : kopf;
}

/**
 * Sammlung importieren und mit dem Stand dieses Geräts abgleichen. Ersetzt
 * überall dort, wo eine Sammlung von einem anderen Gerät kommt, den direkten
 * Aufruf von `einsatzImportieren`.
 */
export function einsatzAbgleichen(importiert: Einsatzsammlung, jetzt = Date.now()): AbgleichErgebnis {
  const vorherRoh = alleSammlungen().find((s) => s.id === importiert.id);
  // Tiefe Kopie: der Kern verändert die geladene Liste nicht, aber wir lesen
  // danach neu und wollen den Stand VOR dem Import sicher in der Hand haben.
  const vorher: Einsatzsammlung | undefined = vorherRoh ? JSON.parse(JSON.stringify(vorherRoh)) : undefined;
  const r = einsatzImportieren(importiert);
  const ergebnis: AbgleichErgebnis = {
    neuerEinsatz: r.neuerEinsatz,
    hinzugefuegt: r.hinzugefuegt,
    aktualisiert: [],
    widersprueche: [],
    neueIds: [],
    neueVermerke: [],
    bekannt: {},
  };
  const liste = alleSammlungen();
  const s = liste.find((x) => x.id === importiert.id);
  if (!s) return ergebnis;
  const vorherIds = new Set(vorher?.eintraege.map((e) => e.id) ?? []);
  ergebnis.neueIds = s.eintraege.filter((e) => !vorherIds.has(e.id)).map((e) => e.id);
  // Was die Datei an Zuständen trägt und hier jetzt genauso gilt (R4-W7).
  const bekanntBuchen = () => {
    for (const schl of new Set(importiert.eintraege.map((e) => e.einheitSchluessel))) {
      const datei = seite(importiert.eintraege, schl);
      const jetztKopf = seite(s.eintraege, schl);
      if (!datei || !jetztKopf) continue;
      const felder: Partial<Record<StandFeld, string>> = {};
      for (const feld of STAND_FELDER) {
        const g = standGleichheit(feld, jetztKopf.kopf);
        if (g === standGleichheit(feld, datei.kopf)) felder[feld] = g;
      }
      ergebnis.bekannt[schl] = felder;
    }
  };
  if (!vorher) {
    ergebnis.neueVermerke = [...vermerkKennungen(s.eintraege)];
    bekanntBuchen();
    return ergebnis;
  }
  const vorherVermerke = vermerkKennungen(vorher.eintraege);

  const einheiten = new Set(importiert.eintraege.map((e) => e.einheitSchluessel));
  let geschrieben = false;
  // Die Art der Sammlung (neu im Meldekopf): Es gilt die zuletzt umgestellte. Eine Sammlung, die für ein ANDERES Ziel
  // zugeschnitten wurde (`sammlungFuerZiel`), trägt schon Art und Zeit des Ziels und kommt hier nicht an.
  const art = artEntscheiden(vorher, importiert);
  if (art) {
    ergebnis.art = art;
    if (art.gilt === "datei") {
      s.art = importiert.art;
      if (importiert.artSeit != null) s.artSeit = importiert.artSeit;
      geschrieben = true;
    }
  }
  // Welche Fassung gilt, hat womöglich das andere Gerät entschieden (R4-W1):
  // ein dort bestätigter Vorrang kommt mit, solange hier keiner gesetzt ist.
  for (const e of importiert.eintraege) {
    if (e.ersetztDurch == null) continue;
    const lokal = s.eintraege.find((x) => x.id === e.id);
    if (!lokal || lokal.ersetztDurch != null) continue;
    lokal.ersetztDurch = e.ersetztDurch;
    if (e.ersetztAm != null) lokal.ersetztAm = e.ersetztAm;
    geschrieben = true;
  }
  for (const schl of einheiten) {
    const hier = seite(vorher.eintraege, schl);
    const datei = seite(importiert.eintraege, schl);
    if (!hier || !datei) continue; // nur hier oder nur in der Datei: nichts abzugleichen
    const fassungen = s.eintraege.filter((e) => e.einheitSchluessel === schl);
    const ziel = geltendeJeEinheit(fassungen)[0];
    if (!ziel) continue;
    const vorZiel = JSON.stringify(ziel);
    const was: string[] = [];
    const notizen: FuehrungsVermerk[] = [];
    // Hat das andere Gerät entschieden, welche vorhandene Fassung gilt (Vorrang),
    // wechselt hier der Kopf, ohne dass ein Eintrag dazukam: auch das nennt die
    // Quittung (R5-W4).
    if (ziel.id !== hier.kopf.id && vorherIds.has(ziel.id)) was.push(fassungWechselText(hier.kopf, ziel));
    for (const feld of FELDER) {
      const ent = entscheide(feld, hier, datei);
      if (!ent) continue; // beide Köpfe gleich — der neue Kopf ist einer davon
      // Gilt der Wert dieses Geräts, muss er trotzdem auf den neuen Kopf: kam
      // mit der Datei eine Folgemeldung, trägt sie den Stand des anderen Geräts.
      uebertrage(feld, ent.von === "hier" ? hier.kopf : datei.kopf, ziel);
      const hierWert = wert(feld, hier.kopf).text;
      const dateiWert = wert(feld, datei.kopf).text;
      if (ent.von === "datei") was.push(dateiWert);
      // Dieselbe Anzeige auf beiden Seiten (nur die Sekunden unterscheiden sich): kein Widerspruch, den jemand prüfen
      // könnte — „hier 08:39, dort 08:39" lehrte, die Hinweise zu übergehen (R14-W2).
      if (ent.widerspruch && hierWert !== dateiWert) {
        ergebnis.widersprueche.push({
          einheitSchluessel: schl,
          einheit: kurzname(ziel),
          feld: FELD_NAME[feld],
          hier: hierWert,
          datei: dateiWert,
          gilt: ent.von,
        });
        notizen.push({
          zeit: jetzt,
          text:
            `Abgleich mit anderem Gerät: ${FELD_NAME[feld]} dort ${dateiWert}, hier ${hierWert} — ` +
            (ent.von === "datei" ? "von dort übernommen (jünger)" : "hier behalten"),
        });
      }
    }
    const vermerke = vereinigeVermerke([hier.vermerke, datei.vermerke, ziel.vermerke ?? [], notizen]);
    if (vermerke.length > 0) ziel.vermerke = vermerke;
    if (was.length > 0) ergebnis.aktualisiert.push({ einheitSchluessel: schl, einheit: kurzname(ziel), was });
    if (JSON.stringify(ziel) !== vorZiel) geschrieben = true;
  }
  if (geschrieben) {
    s.geaendert = jetzt;
    sammlungenSchreiben(liste);
  }
  ergebnis.neueVermerke = [...vermerkKennungen(s.eintraege)].filter((k) => !vorherVermerke.has(k));
  bekanntBuchen();
  return ergebnis;
}

/**
 * Quittungstext für den Abgleich: „3 Meldungen aktualisiert: Ulm abgerückt
 * 20:47; Biberach Auftrag „Deich Nord“." und — falls vorhanden — die Widersprüche.
 * Leer, wenn nichts abzugleichen war.
 */
export function abgleichText(r: Pick<AbgleichErgebnis, "aktualisiert" | "widersprueche"> & Partial<Pick<AbgleichErgebnis, "art">>): string {
  const teile: string[] = [];
  const artSatz = artText(r.art);
  if (artSatz) teile.push(artSatz);
  if (r.aktualisiert.length > 0) {
    const n = r.aktualisiert.length;
    teile.push(
      `${n === 1 ? "1 Meldung" : `${n} Meldungen`} aktualisiert: ` +
        r.aktualisiert.map((a) => `${a.einheit} ${a.was.join(", ")}`).join("; ") +
        ".",
    );
  }
  if (r.widersprueche.length > 0) {
    const n = r.widersprueche.length;
    teile.push(
      `${n === 1 ? "1 Widerspruch" : `${n} Widersprüche`} zwischen den Geräten: ` +
        r.widersprueche
          .map(
            (w) =>
              `${w.einheit} ${w.feld} — hier ${w.hier}, in der Datei ${w.datei}; ` +
              (w.gilt === "datei" ? "der jüngere Stand aus der Datei gilt" : "der Stand dieses Geräts bleibt"),
          )
          .join("; ") +
        ". Bitte prüfen (steht auch im Verlauf der Einheit).",
    );
  }
  return teile.join(" ");
}

/** Ein eingeklappter Abschnitt einer Quittung. */
export interface Einzelheit {
  titel: string;
  zeilen: string[];
}

/**
 * Die Quittung des Abgleichs gegliedert (Audit Runde 5, R5-K3): oben das, was
 * eine Entscheidung verlangt — aktualisierte Meldungen (Abrücken, Auftrag, Fassung)
 * und inhaltliche Widersprüche, jeweils die ersten drei —, dahinter eingeklappt
 * alles Übrige und die kleinen Abweichungen der Eintreffzeit, die zwei Geräte
 * beim Empfang je selbst vergeben. Vorher war es ein Absatz von 14 Widersprüchen,
 * in dem „Cottbus abgerückt" unterging.
 */
/** Eine Zeile zum Widerspruch; auch für die Merkliste an der Einsatzansicht (R11-O3). */
export function widerspruchZeile(w: AbgleichWiderspruch): string {
  return (
    `${w.einheit} ${w.feld} — hier ${w.hier}, in der Datei ${w.datei}; ` +
    (w.gilt === "datei" ? "der jüngere Stand aus der Datei gilt" : "der Stand dieses Geräts bleibt")
  );
}

/** Die Widersprüche, die gemerkt werden: ohne die kleinen Eintreffzeit-Abweichungen. */
export function widerspruecheZumMerken(r: Pick<AbgleichErgebnis, "widersprueche"> & Partial<Pick<AbgleichErgebnis, "art">>): string[] {
  const zeilen = r.widersprueche.filter((w) => w.feld !== FELD_NAME.eintreffzeit).map(widerspruchZeile);
  // Ein Widerspruch bei der Art der Sammlung bleibt wie die der Einheiten an der Einsatzansicht stehen (neu im Meldekopf).
  return r.art?.widerspruch ? [artText(r.art), ...zeilen] : zeilen;
}

export function abgleichGliederung(r: Pick<AbgleichErgebnis, "aktualisiert" | "widersprueche"> & Partial<Pick<AbgleichErgebnis, "art">>): { kurz: string[]; einzelheiten: Einzelheit[] } {
  const kurz: string[] = [];
  const einzelheiten: Einzelheit[] = [];
  // Die Art zuerst: Sie ändert, was in der ganzen Lage zählt.
  const artSatz = artText(r.art);
  if (artSatz) kurz.push(artSatz);
  const BIS = 3;
  if (r.aktualisiert.length > 0) {
    const n = r.aktualisiert.length;
    const zeile = (a: AbgleichAenderung) => `${a.einheit} ${a.was.join(", ")}`;
    kurz.push(`${n === 1 ? "1 Meldung" : `${n} Meldungen`} aktualisiert: ${r.aktualisiert.slice(0, BIS).map(zeile).join("; ")}${n > BIS ? ` und ${n - BIS} weitere` : ""}.`);
    if (n > BIS) einzelheiten.push({ titel: `Alle ${n} aktualisierten Meldungen`, zeilen: r.aktualisiert.map(zeile) });
  }
  const wid = widerspruchZeile;
  const wichtig = r.widersprueche.filter((w) => w.feld !== FELD_NAME.eintreffzeit);
  const klein = r.widersprueche.filter((w) => w.feld === FELD_NAME.eintreffzeit);
  if (wichtig.length > 0) {
    const n = wichtig.length;
    kurz.push(`${n === 1 ? "1 Widerspruch" : `${n} Widersprüche`} zwischen den Geräten: ${wichtig.slice(0, BIS).map(wid).join("; ")}${n > BIS ? ` und ${n - BIS} weitere` : ""}.`);
    if (n > BIS) einzelheiten.push({ titel: `Alle ${n} Widersprüche`, zeilen: wichtig.map(wid) });
  }
  if (klein.length > 0) {
    kurz.push(`${klein.length === 1 ? "1 kleine Abweichung" : `${klein.length} kleine Abweichungen`} bei der Eintreffzeit (Minuten, weil beide Geräte sie beim Empfang selbst vergeben).`);
    // Der Titel wiederholt nicht die Zahl aus dem Satz darüber (R6-W3: stand doppelt, auch „1 Abweichungen").
    einzelheiten.push({ titel: "Einzelheiten zur Eintreffzeit", zeilen: klein.map(wid) });
  }
  return { kurz, einzelheiten };
}

/**
 * Sammlung eines anderen Geräts (z. B. die Sammel-PDF des Zugführers) für die
 * Übernahme in eine ANDERE, laufende Sammlung vorbereiten: dieselben
 * Meldungen mit Eintreffzeit, Status, Auftrag, Siegel und Verlauf, aber unter
 * der Kennung des Ziels — `einsatzAbgleichen` legt sie dann dort ab, statt
 * eine zweite Sammlung anzulegen (Audit Runde 3, R3-W3).
 */
export function sammlungFuerZiel(
  quelle: Einsatzsammlung,
  ziel: Einsatzsammlung,
): Einsatzsammlung {
  const eintraege: MeldeEintrag[] = JSON.parse(JSON.stringify(quelle.eintraege));
  return { ...ziel, eintraege };
}
