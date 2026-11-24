/**
 * Abgleich einer Sammlung zwischen zwei gekoppelten Geräten (neu im Meldekopf,
 * ADR-009).
 *
 * Übernahme vor Neubau: Über die Verbindung reist dasselbe wie bei „Einsatz
 * importieren…" — der Umschlag der Einsatz-Datei (`einsatzDateiInhalt`) —, und
 * die Gegenseite gleicht ihn mit derselben Regel ab (`einsatzAbgleichen`, je
 * Feld, Widersprüche werden genannt). Die Kopplung ist nur ein schnellerer Weg
 * für die Datei; was sie nicht überträgt, überträgt die Datei auch nicht.
 *
 * Rollen (seit 2026-11-24): Das erste Gerät ist die Zentrale und führt die
 * Lage; das zweite ist ein reiner Sammler. Der Sammler schickt seinen ganzen
 * Stand, also alles, was er selbst aufgenommen hat. Die Zentrale schickt dem
 * Sammler nur den Kopf der Sammlung (Kennung, Name, Art, Ort), keine
 * Meldungen: Das Telefon draußen trägt so nie die Lage, nur seine eigenen
 * Scans. Jeden eingespielten Stand quittiert die Zentrale; der Sammler weiß
 * damit, was wirklich angekommen ist.
 *
 * Drei Dinge kommen dazu, weil hier niemand eine Rückfrage beantwortet:
 *
 * 1. Entfernte Meldungen. Der Datei-Import fragt („Hier entfernte Meldungen in
 *    der Datei"). Zwischen gekoppelten Geräten gilt das Entfernen für beide:
 *    Jede Seite nennt die Kennungen, die sie entfernt hat; die andere legt
 *    sie in ihren Papierkorb (7 Tage, wie von Hand entfernt). Holt eine Seite
 *    eine Meldung zurück, nennt sie auch das, und die andere vergisst das
 *    Entfernen.
 * 2. Der Kern schreibt bei jedem Import einen neuen Änderungszeitpunkt. Zwei
 *    Geräte, die einander jeden geänderten Stand schicken, liefen damit endlos
 *    im Kreis. Verglichen wird darum ein Abdruck ohne diesen Zeitpunkt und
 *    ohne die Reihenfolge der Einträge.
 * 3. Ein gleicher Stand wird gar nicht erst eingespielt.
 */

import {
  einsaetzeLaden as kernEinsaetzeLaden,
  einsaetzePapierkorb as kernEinsaetzePapierkorb,
  type Einsatzsammlung,
  type MeldeEintrag,
} from "@bos/meldekopf/einsaetze";
import { einsaetzeLaden, einsaetzePapierkorb } from "../einsaetze-lesen";
import { meldungsNummern, nummernWechsel, nummernWechselText } from "../einheiten-tabelle";
import { entfernteLaden, entfernteMerken, entfernteVergessen } from "../entfernte-meldungen";
import { sammlungenSchreiben } from "../eintrag-zeiten";
import { meldungAusPapierkorb, meldungInPapierkorb } from "../meldungs-papierkorb";
import { widerspruchMerken } from "../eingang/widerspruch-merker";
import { einsatzAbgleichen, widerspruecheZumMerken } from "../weitergabe/einsatz-abgleich";
import { einsatzAusDatei, einsatzDateiInhalt } from "../weitergabe/einsatz-transport";
import { exportStaendeLaden, exportStaendeUebernehmen } from "../weitergabe/export-stand";
import { lageAngabenLaden, lageAngabenUebernehmen } from "../weitergabe/lage-angaben";
import { nummernHinweisMerken } from "../weitergabe/nummern-hinweis";

/** Was ein Gerät dem anderen schickt, wenn sich sein Stand geändert hat. */
export interface StandNachricht {
  art: "stand";
  /** Abdruck des gesendeten Stands; die Quittung nennt ihn zurück. */
  kennung?: string;
  /** Der Umschlag der Einsatz-Datei als Text (Sammlung, Stände der Exporte, Lage-Angaben). */
  einsatz: string;
  /** Kennungen der Einträge, die auf dem sendenden Gerät aus dieser Sammlung entfernt wurden. */
  entfernt: string[];
  /** Kennungen, die das sendende Gerät in dieser Sitzung aus dem Papierkorb zurückgeholt hat. */
  zurueckgeholt: string[];
}

/** Die Zentrale bestätigt dem Sammler einen eingespielten Stand. */
export interface ErhaltenNachricht {
  art: "erhalten";
  kennung: string;
}

function bekannteIds(): string[] {
  return [...einsaetzeLaden(), ...einsaetzePapierkorb()].map((x) => x.id);
}

/** JSON mit sortierten Schlüsseln: Zwei Geräte tragen dieselben Felder oft in anderer Reihenfolge. */
function stabil(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(stabil).join(",")}]`;
  if (x && typeof x === "object") {
    const o = x as Record<string, unknown>;
    return `{${Object.keys(o).sort().filter((k) => o[k] !== undefined).map((k) => `${JSON.stringify(k)}:${stabil(o[k])}`).join(",")}}`;
  }
  return JSON.stringify(x) ?? "null";
}

/** Kurze Prüfsumme (FNV-1a, 32 Bit) plus Länge: Der Abdruck soll nicht die ganze Sammlung im Speicher halten. */
function pruefsumme(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${(h >>> 0).toString(36)}.${text.length.toString(36)}`;
}

function sammlungKanonisch(s: Einsatzsammlung): unknown {
  const { geaendert: _geaendert, geloeschtAm: _geloescht, eintraege, ...rest } = s;
  return { ...rest, eintraege: [...eintraege].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) };
}

/**
 * Abdruck des Stands dieses Geräts für die Sammlung: gleich, solange sich
 * nichts geändert hat, was das andere Gerät erfahren müsste. `null`, wenn es
 * die Sammlung hier nicht (mehr) gibt.
 */
export function standAbdruck(einsatzId: string, zurueckgeholt: readonly string[] = [], nurKopf = false): string | null {
  const s = einsaetzeLaden().find((x) => x.id === einsatzId);
  if (!s) return null;
  if (nurKopf) return pruefsumme(stabil(sammlungKanonisch({ ...s, eintraege: [] })));
  return pruefsumme(
    stabil({
      einsatz: sammlungKanonisch(s),
      staende: exportStaendeLaden(einsatzId),
      lage: lageAngabenLaden(einsatzId) ?? null,
      entfernt: [...(entfernteLaden()[einsatzId] ?? [])].sort(),
      zurueckgeholt: [...zurueckgeholt].sort(),
    }),
  );
}

/** Der Stand dieses Geräts als Nachricht; `null`, wenn es die Sammlung hier nicht (mehr) gibt. */
export function standNachricht(einsatzId: string, zurueckgeholt: readonly string[] = [], nurKopf = false): StandNachricht | null {
  const s = einsaetzeLaden().find((x) => x.id === einsatzId);
  if (!s) return null;
  // Nur der Kopf: die Sammlung ohne Meldungen, ohne Stände der Exporte, ohne Lage-Angaben (Zentrale an Sammler).
  if (nurKopf) return { art: "stand", einsatz: einsatzDateiInhalt({ ...s, eintraege: [] }), entfernt: [], zurueckgeholt: [] };
  return {
    art: "stand",
    einsatz: einsatzDateiInhalt(s, exportStaendeLaden(einsatzId), lageAngabenLaden(einsatzId)),
    entfernt: entfernteLaden()[einsatzId] ?? [],
    zurueckgeholt: [...zurueckgeholt],
  };
}

function kennungen(x: unknown): string[] {
  return Array.isArray(x) ? x.filter((id): id is string => typeof id === "string" && id.length <= 200).slice(0, 5000) : [];
}

/** Prüft die Form einer empfangenen Nachricht; wirft bei Unbrauchbarem. */
export function standNachrichtPruefen(x: unknown): StandNachricht {
  const o = x as Partial<StandNachricht> | null;
  if (!o || o.art !== "stand" || typeof o.einsatz !== "string") throw new Error("Unbekannte Nachricht vom anderen Gerät.");
  return {
    art: "stand",
    einsatz: o.einsatz,
    entfernt: kennungen(o.entfernt),
    zurueckgeholt: kennungen(o.zurueckgeholt),
    ...(typeof o.kennung === "string" && o.kennung.length <= 64 ? { kennung: o.kennung } : {}),
  };
}

export interface UebernahmeErgebnis {
  einsatzId: string;
  /** Der Stand dieses Geräts hat sich geändert. */
  geaendert: boolean;
  /** Die Sammlung gab es hier noch nicht. */
  neuerEinsatz: boolean;
  /** Neu angehängte Meldungen. */
  hinzugefuegt: number;
  /** Auf Wunsch des anderen Geräts hier in den Papierkorb gelegte Einträge. */
  entfernt: number;
  /** Widersprüche, die an der Einsatzansicht stehen bleiben. */
  widersprueche: number;
  /**
   * Die Sammlung liegt hier im Papierkorb oder gehört nicht zur Kopplung:
   * Nichts wurde übernommen, die Kopplung endet.
   */
  abgelehnt?: "geloescht" | "andere-sammlung";
  /** Eigene Rückholungen, die das andere Gerät jetzt kennt (es führt die Einträge wieder). */
  zurueckgeholtBestaetigt: string[];
}

/**
 * Einträge, die das andere Gerät entfernt hat, hier in den Papierkorb legen —
 * je Einheit ein Papierkorb-Eintrag, wie beim Entfernen von Hand.
 */
function entfernenWieDort(einsatzId: string, ids: ReadonlySet<string>): number {
  // Frisch aus dem Kern, nicht aus dem Lese-Zwischenspeicher: Die Sammlung wird an Ort und Stelle geändert.
  const liste = [...kernEinsaetzeLaden(), ...kernEinsaetzePapierkorb()];
  const s = liste.find((x) => x.id === einsatzId);
  if (!s) return 0;
  const weg = s.eintraege.filter((e) => ids.has(e.id));
  if (weg.length === 0) return 0;
  const nummern = meldungsNummern(s.eintraege);
  const jeEinheit = new Map<string, MeldeEintrag[]>();
  for (const e of weg) jeEinheit.set(e.einheitSchluessel, [...(jeEinheit.get(e.einheitSchluessel) ?? []), e]);
  for (const [schl, eintraege] of jeEinheit) {
    const ganz = s.eintraege.every((e) => e.einheitSchluessel !== schl || ids.has(e.id));
    const nummer = nummern.get(schl);
    meldungInPapierkorb(einsatzId, { art: ganz ? "einheit" : "fassung", eintraege, ...(ganz && nummer != null ? { nummer } : {}) });
  }
  // Die Nummern gehören der Einheit (R18-A1): Vor dem Entfernen festschreiben, damit die übrigen nicht aufrücken.
  for (const x of s.eintraege) {
    const n = nummern.get(x.einheitSchluessel);
    if (x.nummer == null && n != null) x.nummer = n;
  }
  s.eintraege = s.eintraege.filter((e) => !ids.has(e.id));
  s.geaendert = Date.now();
  sammlungenSchreiben(liste);
  entfernteMerken(einsatzId, weg.map((e) => e.id));
  return weg.length;
}

/**
 * Den Stand des anderen Geräts übernehmen.
 *
 * `einsatzId`: die gekoppelte Sammlung, oder `null`, solange dieses Gerät sie
 * noch nicht kennt (es hat den Code gescannt und wartet auf den ersten Stand).
 * `eigeneZurueckgeholt`: was dieses Gerät in dieser Sitzung zurückgeholt hat —
 * das Entfernen des anderen Geräts gilt dafür nicht noch einmal.
 */
export function standUebernehmen(
  nachricht: StandNachricht,
  einsatzId: string | null,
  eigeneZurueckgeholt: readonly string[] = [],
  jetzt = Date.now(),
  /** Sammler: Von der Zentrale gilt nur der Kopf. Meldungen und Entfern-Listen fallen weg, gleich was die Nachricht trägt. */
  nurKopf = false,
): UebernahmeErgebnis {
  const sammlung = einsatzAusDatei(nachricht.einsatz);
  const n: StandNachricht = nurKopf ? { ...nachricht, entfernt: [], zurueckgeholt: [] } : nachricht;
  if (nurKopf) {
    sammlung.eintraege = [];
    delete sammlung.exportStaende;
    delete sammlung.lageAngaben;
  }
  const id = sammlung.id;
  const ergebnis: UebernahmeErgebnis = { einsatzId: id, geaendert: false, neuerEinsatz: false, hinzugefuegt: 0, entfernt: 0, widersprueche: 0, zurueckgeholtBestaetigt: [] };
  if (einsatzId != null && id !== einsatzId) return { ...ergebnis, abgelehnt: "andere-sammlung" };
  // Der Kern holt eine Sammlung beim Import aus dem Papierkorb zurück. Wer sie hier gelöscht hat, hat die Kopplung
  // damit beendet; sie stünde sonst nach Sekunden wieder da.
  if (einsaetzePapierkorb().some((x) => x.id === id)) return { ...ergebnis, abgelehnt: "geloescht" };

  const vorher = standAbdruck(id, eigeneZurueckgeholt);
  const eintraegeVorher = (einsaetzeLaden().find((x) => x.id === id)?.eintraege ?? []).map((e) => ({ ...e }));

  // 1. Dort zurückgeholt: hier nicht länger als entfernt führen; der Eintrag kommt mit der Sammlung wieder.
  if (n.zurueckgeholt.length > 0) {
    entfernteVergessen(id, n.zurueckgeholt);
    meldungAusPapierkorb(id, n.zurueckgeholt, jetzt);
  }
  // 2. Dort entfernt: hier in den Papierkorb — außer dieses Gerät hat den Eintrag gerade selbst zurückgeholt.
  const eigene = new Set(eigeneZurueckgeholt);
  const dortEntfernt = new Set(n.entfernt.filter((x) => !eigene.has(x)));
  if (dortEntfernt.size > 0) ergebnis.entfernt = entfernenWieDort(id, dortEntfernt);
  // 3. Hier entfernt: kommt nicht still zurück. Das andere Gerät erfährt es mit dem nächsten Stand von hier.
  const hierEntfernt = new Set(entfernteLaden()[id] ?? []);
  const dortIds = new Set(sammlung.eintraege.map((e) => e.id));
  ergebnis.zurueckgeholtBestaetigt = eigeneZurueckgeholt.filter((x) => dortIds.has(x) && !n.entfernt.includes(x));
  sammlung.eintraege = sammlung.eintraege.filter((e) => !hierEntfernt.has(e.id) && !dortEntfernt.has(e.id));

  // Die Stände der Exporte und die Lage-Angaben hängen bis hierher an der Sammlung (einsatz-transport.ts).
  const staende = sammlung.exportStaende;
  delete sammlung.exportStaende;
  const lage = sammlung.lageAngaben;
  delete sammlung.lageAngaben;
  delete sammlung.nachtragSeit;

  const hier = einsaetzeLaden().find((x) => x.id === id);
  // Ein gleicher Stand wird nicht eingespielt: Der Kern schriebe sonst die ganze Liste neu, nur für einen Zeitstempel.
  if (!hier || stabil(sammlungKanonisch(hier)) !== stabil(sammlungKanonisch(sammlung))) {
    const r = einsatzAbgleichen(sammlung, jetzt);
    ergebnis.neuerEinsatz = r.neuerEinsatz;
    ergebnis.hinzugefuegt = r.hinzugefuegt;
    const zeilen = widerspruecheZumMerken(r);
    ergebnis.widersprueche = zeilen.length;
    widerspruchMerken(id, zeilen);
    const nachher = einsaetzeLaden().find((x) => x.id === id)?.eintraege ?? [];
    // Ändern sich laufende Nummern, bleibt der Satz dazu an der Einsatzansicht stehen (R20-D3).
    if (!r.neuerEinsatz) nummernHinweisMerken(id, nummernWechselText(nummernWechsel(eintraegeVorher, nachher), nachher));
  }
  const ids = bekannteIds();
  exportStaendeUebernehmen(id, staende, ids);
  lageAngabenUebernehmen(id, lage, ids);

  ergebnis.geaendert = standAbdruck(id, eigeneZurueckgeholt) !== vorher;
  return ergebnis;
}
