/**
 * Herkunft: neu in der Meldekopf-App (Rollenaudit Runde 2: Meldekopf P2-1 und P2-6, Bereitstellungsraum P2-2,
 * UEAL U12).
 *
 * Was die Führung in einem Zug mit der Stärke abfragt und was unter den fünf Kacheln der Einsatzansicht fehlte:
 *
 *  - FAHRZEUGE der Anwesenden: standen am Telefon nur in der zugeklappten Zeile „Bedarf:".
 *  - Stärke JE ORGANISATION: zeigte nur die Tafel des Lagemonitors.
 *  - ABGERÜCKTE mit Stärke und Fahrzeugen: Es gab nur die Zahl der Einheiten.
 *  - STÄRKEMELDUNG als eine Zeile zum Durchgeben über Funk oder Messenger, mit DTG.
 *
 * Reine Rechnung (kein React, keine Persistenz). Gezählt wird wie in den Summen (auswertung.ts): die geltende
 * Fassung je Einheit, Übungsmeldungen außerhalb der Lage nicht.
 */
import { staerke, type Staerke } from "@bos/eeb-format/model";
import { EinsatzArt, MeldeStatus, type MeldeEintrag } from "@bos/meldekopf/einsaetze";
import { aktuelleMeldungen, zaehltInLage } from "./auswertung";
import { geltendeJeEinheit } from "./fassung-vorrang";
import { natoZeitstempel, orgLabel } from "./hilfen";

export interface Teilsumme {
  einheiten: number;
  staerke: Staerke;
  fahrzeuge: number;
}

function summe(meldungen: readonly MeldeEintrag[]): Teilsumme {
  const s: Teilsumme = { einheiten: 0, staerke: { fuehrer: 0, unterfuehrer: 0, mannschaft: 0, gesamt: 0 }, fahrzeuge: 0 };
  for (const e of meldungen) {
    const st = staerke(e.bogen);
    s.einheiten++;
    s.staerke.fuehrer += st.fuehrer;
    s.staerke.unterfuehrer += st.unterfuehrer;
    s.staerke.mannschaft += st.mannschaft;
    s.staerke.gesamt += st.gesamt;
    s.fahrzeuge += e.bogen.fahrzeuge.length;
  }
  return s;
}

/** „1 / 3 / 9 // 13" */
export function staerkeZeile(s: Staerke): string {
  return `${s.fuehrer} / ${s.unterfuehrer} / ${s.mannschaft} // ${s.gesamt}`;
}

/** Anwesende, zählende Einheiten je Organisation, die stärkste zuerst. Der Name ist der eigene der Organisation, sonst ihr Kürzel. */
export function staerkeJeOrganisation(eintraege: MeldeEintrag[], art: EinsatzArt): ({ organisation: string } & Teilsumme)[] {
  const gruppen = new Map<string, MeldeEintrag[]>();
  for (const e of aktuelleMeldungen(eintraege, art)) {
    const name = orgLabel(e.bogen.einheit.organisation);
    gruppen.set(name, [...(gruppen.get(name) ?? []), e]);
  }
  return [...gruppen.entries()]
    .map(([organisation, liste]) => ({ organisation, ...summe(liste) }))
    .sort((a, b) => b.staerke.gesamt - a.staerke.gesamt || a.organisation.localeCompare(b.organisation, "de"));
}

/** Abgerückte Einheiten der Lage mit Stärke und Fahrzeugen ihrer letzten Fassung. */
export function abgerueckteSumme(eintraege: MeldeEintrag[], art: EinsatzArt): Teilsumme {
  return summe(geltendeJeEinheit(eintraege).filter((e) => e.status === MeldeStatus.ABGERUECKT && zaehltInLage(art, e.bogen)));
}

/**
 * Die Stärkemeldung als eine Zeile: „242105nov26 Hochwasser Hunte: 9 Einheiten, Stärke 2 / 9 / 47 // 58, 12 Fahrzeuge".
 * Abgerückte stehen dahinter, wenn es welche gibt. Ohne Namen und Rufnummern: Die Zeile geht über Funk und Messenger.
 */
export function staerkemeldungText(name: string, eintraege: MeldeEintrag[], art: EinsatzArt, jetzt: Date = new Date()): string {
  const da = summe(aktuelleMeldungen(eintraege, art));
  const ab = abgerueckteSumme(eintraege, art);
  const einheiten = (n: number) => (n === 1 ? "1 Einheit" : `${n} Einheiten`);
  const fahrzeuge = (n: number) => (n === 1 ? "1 Fahrzeug" : `${n} Fahrzeuge`);
  return (
    `${natoZeitstempel(jetzt)} ${art === EinsatzArt.UEBUNG ? "ÜBUNG " : ""}${name}: ${einheiten(da.einheiten)}, Stärke ${staerkeZeile(da.staerke)}, ${fahrzeuge(da.fahrzeuge)}` +
    (ab.einheiten > 0 ? `; abgerückt ${einheiten(ab.einheiten)}, Stärke ${staerkeZeile(ab.staerke)}` : "")
  );
}
