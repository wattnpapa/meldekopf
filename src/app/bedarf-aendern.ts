/**
 * Herkunft: neu in der Meldekopf-App (Rollenaudit Runde 2, Bereitstellungsraum P2-4, UEAL U4).
 *
 * „Bedarf ändern…" an der Karte: der Dialog und die neue Fassung des Bogens. Die Schnellerfassung fragt den
 * Sofortbedarf nicht ab, und an der Karte ließ er sich nicht nachtragen. Meldete der Gruppenführer nach drei Stunden
 * „wir brauchen Unterbringung und 80 l Diesel", blieb nur die Notiz; in Bedarf, Tafel und Lageblatt fehlte es.
 *
 * Eigene Datei, die einsaetze-ui.tsx erst beim Tippen nachlädt (Startbündel, ADR-003 Aufnahmeregel 5), wie
 * ort-aendern.ts. Wie dort entsteht eine neue Fassung mit allem Übrigen; Nummer und Historie bleiben.
 */
import { staerke, type Erfassungsbogen, type Sofortbedarf } from "@bos/eeb-format/model";
import { frageFelder } from "@bos/oberflaeche/dialoge";
import { einheitAnzeigename } from "./hilfen";

export interface BedarfAenderung {
  neu: Erfassungsbogen;
  /** „Unterbringung, Diesel 80 l" für Quittung und Vermerk; „kein Bedarf", wenn alles leer ist. */
  kurz: string;
}

const JA_NEIN = [
  { wert: "nein", label: "nein" },
  { wert: "ja", label: "ja" },
];

/** Ganze Zahl ab 0 aus einer Eingabe; `null`, wenn sie keine ist. Leer zählt als 0. */
export function literAusEingabe(text: string | undefined): number | null {
  const t = (text ?? "").trim();
  if (t === "") return 0;
  if (!/^\d{1,5}$/.test(t)) return null;
  return Number(t);
}

/** Kurztext eines Sofortbedarfs: was gebraucht wird, in der Folge der Karte. */
export function bedarfKurz(sb: Sofortbedarf): string {
  const teile = [
    sb.verpflegungPersonen > 0 ? `Verpflegung ${sb.verpflegungPersonen}` : "",
    sb.unterbringung ? "Unterbringung" : "",
    sb.ruhezeitErforderlich ? "Ruhezeit" : "",
    sb.dieselLiter > 0 ? `Diesel ${sb.dieselLiter} l` : "",
    sb.benzinLiter > 0 ? `Benzin ${sb.benzinLiter} l` : "",
    sb.gemischLiter > 0 ? `Gemisch ${sb.gemischLiter} l` : "",
  ].filter(Boolean);
  return teile.length > 0 ? teile.join(", ") : "kein Bedarf";
}

/** Der Bogen mit neuem Sofortbedarf; `null`, wenn sich nichts ändert. Der Stand liegt nie vor dem bisherigen. */
export function mitBedarf(bogen: Erfassungsbogen, sb: Sofortbedarf, jetzt: number): BedarfAenderung | null {
  const alt = bogen.sofortbedarf;
  if (alt && JSON.stringify(alt) === JSON.stringify(sb)) return null;
  // Ohne bisherigen Bedarf und ohne neue Angabe bleibt „nicht erfasst" stehen.
  if (!alt && bedarfKurz(sb) === "kein Bedarf") return null;
  return { neu: { ...structuredClone(bogen), sofortbedarf: sb, stand: Math.max(jetzt, bogen.stand) }, kurz: bedarfKurz(sb) };
}

/** Fragt den Sofortbedarf ab und liefert die neue Fassung; `null` bei Abbruch oder ohne Änderung. */
export async function bedarfErfragen(bogen: Erfassungsbogen, jetzt: number): Promise<BedarfAenderung | null> {
  const alt = bogen.sofortbedarf;
  const gesamt = staerke(bogen).gesamt;
  let vorgabe: Record<string, string> = {
    verpflegung: String(alt?.verpflegungPersonen ?? 0),
    unterbringung: alt?.unterbringung ? "ja" : "nein",
    ruhezeit: alt?.ruhezeitErforderlich ? "ja" : "nein",
    diesel: String(alt?.dieselLiter ?? 0),
    benzin: String(alt?.benzinLiter ?? 0),
    gemisch: String(alt?.gemischLiter ?? 0),
  };
  let fehler = "";
  for (;;) {
    const w = await frageFelder({
      titel: "Bedarf ändern",
      hinweis:
        `${fehler}Sofortbedarf von „${einheitAnzeigename(bogen.einheit)}" (Stärke ${gesamt}), wie ihn die Einheit meldet. ` +
        "Zählt in Bedarf, Lagemonitor und Lageblatt. Nummer, Auftrag und Historie bleiben; „Rückgängig“ nimmt die Änderung zurück.",
      ok: "Bedarf übernehmen",
      felder: [
        { name: "verpflegung", label: "Verpflegung für Personen", vorgabe: vorgabe.verpflegung, zahl: true, optional: true },
        { name: "unterbringung", label: "Unterbringung nötig", auswahl: JA_NEIN, vorgabe: vorgabe.unterbringung },
        { name: "ruhezeit", label: "Ruhezeit erforderlich", auswahl: JA_NEIN, vorgabe: vorgabe.ruhezeit },
        { name: "diesel", label: "Diesel (Liter)", vorgabe: vorgabe.diesel, zahl: true, optional: true },
        { name: "benzin", label: "Benzin (Liter)", vorgabe: vorgabe.benzin, zahl: true, optional: true },
        { name: "gemisch", label: "Gemisch (Liter)", vorgabe: vorgabe.gemisch, zahl: true, optional: true },
      ],
    });
    if (!w) return null;
    const zahlen = { verpflegung: literAusEingabe(w.verpflegung), diesel: literAusEingabe(w.diesel), benzin: literAusEingabe(w.benzin), gemisch: literAusEingabe(w.gemisch) };
    if (Object.values(zahlen).some((z) => z == null)) {
      // Die Eingaben bleiben stehen; der Dialog nennt, was nicht stimmt.
      vorgabe = { ...vorgabe, ...w };
      fehler = "Bitte ganze Zahlen ab 0 eintragen (ohne Komma und Einheit). ";
      continue;
    }
    return mitBedarf(
      bogen,
      {
        verpflegungPersonen: zahlen.verpflegung!,
        dieselLiter: zahlen.diesel!,
        benzinLiter: zahlen.benzin!,
        gemischLiter: zahlen.gemisch!,
        unterbringung: w.unterbringung === "ja",
        ruhezeitErforderlich: w.ruhezeit === "ja",
      },
      jetzt,
    );
  }
}
