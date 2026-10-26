/**
 * Eine Einsatz-Sammlung, wie sie nach dem Einspielen einer Datensicherung aus
 * dem Erfassungsbogen auf dem Gerät liegt — gebaut mit denselben Kern-
 * Funktionen, die beide Apps benutzen (`einsatzAnlegen`, `meldungHinzufuegen`
 * aus `@bos/meldekopf`), und als Inhalt von `eeb.einsaetze.v1` vor dem Laden
 * in den Browser gelegt.
 *
 * Warum nicht über die Oberfläche: Im Erfassungsbogen legen die Szenarien die
 * Sammlung über einen Bogen-Link und den Assistenten an. Beide Eingänge
 * übernimmt diese App erst mit Phase 3 und 4; Phase 2 ist „Sammlung lesen und
 * zeigen" (Übernahme-Doku, Abschnitt G). Die Szenarien prüfen deshalb ab hier,
 * mit demselben alten v2-Bogen wie dort. Sobald die Eingänge da sind, kehrt
 * die Grundlage zum Weg über die Oberfläche zurück.
 */

import { deflateRaw, inflateRaw } from "pako";
import { decodePayloadUrl } from "../../vendor/eeb-format/src/codec";
import { OrganisationsTyp, PersonalErfassung, type Erfassungsbogen } from "../../vendor/eeb-format/src/model";
import { EinsatzArt, einsatzAnlegen, meldungHinzufuegen, speicherhuelleSetzen } from "../../vendor/bos-meldekopf/src/einsaetze";
import { V2_FRAGMENT } from "../fixtures";

const KOMPRESSOR = { deflateRaw: (d: Uint8Array) => deflateRaw(d), inflateRaw: (d: Uint8Array) => inflateRaw(d) };

/** Der alte v2-Bogen der Szenarien: THW Oldenburg - Ni, FGr K (A), 3 Personen. */
export function alterBogen(): Erfassungsbogen {
  return decodePayloadUrl(V2_FRAGMENT, KOMPRESSOR);
}

/**
 * Eine weitere Einheit nach dem Muster des alten Bogens, mit anderer
 * Organisation und anderem Ort — wie im Erfassungsbogen die Schritte „ich die
 * Einheit … manuell in den Einsatz aufnehme" sie anlegen (nur Stärke).
 */
export function weitereEinheit(organisation: OrganisationsTyp, ort: string): Erfassungsbogen {
  const b = alterBogen();
  return {
    ...b,
    einheit: {
      organisation,
      einheitsTyp: { freitext: "Einheit" },
      hierarchie: [{ bezeichnung: { freitext: "Ort" }, name: ort }],
    },
    personalErfassung: PersonalErfassung.NUR_STAERKE,
    personal: [],
    fahrzeuge: [],
    staerkeManuell: { fuehrer: 1, unterfuehrer: 1, mannschaft: 4, gesamt: 6 },
  };
}

/** Inhalt von `eeb.einsaetze.v1` mit einer Sammlung aus den gegebenen Bögen. */
export function sammlungSpeicher(
  name: string,
  boegen: Erfassungsbogen[],
  opt: { vomPapier?: boolean } = {},
): { einsaetze: string; einsatzId: string } {
  const ablage = new Map<string, string>();
  speicherhuelleSetzen({ getItem: (k) => ablage.get(k) ?? null, setItem: (k, v) => void ablage.set(k, v) });
  try {
    const s = einsatzAnlegen(name, EinsatzArt.EINSATZ);
    for (const b of boegen) meldungHinzufuegen(s.id, b, { quelle: "scan" });
    // In der Reihenfolge eingetroffen, eine Minute auseinander — sonst trügen
    // alle denselben Zeitpunkt, und „nach Eintreffzeit" sortierte zufällig.
    const liste = JSON.parse(ablage.get("eeb.einsaetze.v1") ?? "[]") as {
      id: string;
      eintraege: { empfangenAm: number; vomPapier?: number }[];
    }[];
    const beginn = Date.now() - boegen.length * 60_000;
    for (const x of liste) {
      x.eintraege.forEach((e, i) => {
        e.empfangenAm = beginn + i * 60_000;
        // Zeitpunkt des Einlesens vom Papier, wie ihn vomPapierMarkieren (eintrag-zeiten.ts) setzt.
        if (opt.vomPapier) e.vomPapier = e.empfangenAm;
      });
    }
    return { einsaetze: JSON.stringify(liste), einsatzId: s.id };
  } finally {
    speicherhuelleSetzen(null);
  }
}
