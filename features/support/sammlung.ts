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
import { decodePayloadUrl, encodePayloadUrl, fragmentInhalt } from "../../vendor/eeb-format/src/codec";
import { OrganisationsTyp, PersonalErfassung, type Erfassungsbogen } from "../../vendor/eeb-format/src/model";
import { EinsatzArt, MeldeStatus, einsatzAnlegen, meldungHinzufuegen, speicherhuelleSetzen } from "../../vendor/bos-meldekopf/src/einsaetze";
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

/**
 * Eine volle Lage für die Tafel des Lagemonitors (neu im Meldekopf): THW-Einheiten reihum auf Züge verteilt, der erste
 * Zug mit langem Namen, zwei von drei Einheiten mit Sofortbedarf (Ruhezeit und Unterbringung, jede dritte dazu mit
 * abweichender Verpflegung). Über die Oberfläche bräuchte das je Einheit ein Dutzend Schritte. Mit `abgerueckt` sind
 * die zuerst eingetroffenen so viele Einheiten abgerückt (vor 5, 10, … Minuten), wie es die Einsatzansicht vermerkt.
 */
export function tafelLageSpeicher(name: string, einheiten: number, zuege: number, abgerueckt = 0): { einsaetze: string; einsatzId: string } {
  const ablage = new Map<string, string>();
  speicherhuelleSetzen({ getItem: (k) => ablage.get(k) ?? null, setItem: (k, v) => void ablage.set(k, v) });
  try {
    const s = einsatzAnlegen(name, EinsatzArt.EINSATZ);
    // Einheitentypen des THW-Vokabulars: Zugtrupp, Bergungsgruppe und Fachgruppen, jede mit Kurzform.
    const typen = [3, 4, 16, 27, 9, 6, 25, 43, 18, 5];
    for (let i = 0; i < einheiten; i++) {
      const zug = i % zuege;
      const nr = Math.floor(i / zuege);
      const b = weitereEinheit(OrganisationsTyp.THW, "");
      const gesamt = b.staerkeManuell?.gesamt ?? 6;
      const ort = `Ort ${zug + 1}${nr >= typen.length ? `-${Math.floor(nr / typen.length) + 1}` : ""}`;
      const bogen: Erfassungsbogen = {
        ...b,
        einheit: { organisation: OrganisationsTyp.THW, einheitsTyp: { code: typen[nr % typen.length]! }, hierarchie: [{ bezeichnung: { code: 1 }, name: ort }] },
        ...(nr % 3 === 0
          ? {}
          : {
              sofortbedarf: {
                verpflegungPersonen: nr % 3 === 2 ? gesamt + 14 : gesamt,
                dieselLiter: 0,
                benzinLiter: 0,
                gemischLiter: 0,
                unterbringung: true,
                ruhezeitErforderlich: true,
              },
            }),
      };
      meldungHinzufuegen(s.id, bogen, { quelle: "scan", zugEtikett: zug === 0 ? "1. Technischer Zug Oldenburg-Wesermarsch Nord" : `${zug + 1}. Zug` });
    }
    // Eingetroffen im Abstand von einer Minute: Die jüngsten tragen auf der Tafel die Marke „neu".
    const liste = JSON.parse(ablage.get("eeb.einsaetze.v1") ?? "[]") as {
      id: string;
      eintraege: { empfangenAm: number; status: MeldeStatus; abgerueckAm?: number; vermerke?: { zeit: number; text: string }[] }[];
    }[];
    const jetzt = Date.now();
    const beginn = jetzt - einheiten * 60_000;
    for (const x of liste) {
      x.eintraege.forEach((e, i) => {
        e.empfangenAm = beginn + i * 60_000;
        if (i < abgerueckt) {
          const zeit = jetzt - (i + 1) * 5 * 60_000;
          e.status = MeldeStatus.ABGERUECKT;
          e.abgerueckAm = zeit;
          e.vermerke = [{ zeit, text: "Abgerückt" }];
        }
      });
    }
    return { einsaetze: JSON.stringify(liste), einsatzId: s.id };
  } finally {
    speicherhuelleSetzen(null);
  }
}

/**
 * Übungsbögen (neu im Meldekopf): THW-Einheiten mit Typen des Vokabulars, jede als Übung gekennzeichnet, Stärke
 * 1/1/4//6. In einer Sammlung der Art „Einsatz" zählen sie nicht in die Lage; in einer Übung wie jede andere Einheit.
 */
export function uebungsBoegen(anzahl: number): Erfassungsbogen[] {
  const typen = [3, 4, 16, 27, 9, 6];
  return Array.from({ length: anzahl }, (_, i): Erfassungsbogen => ({
    ...weitereEinheit(OrganisationsTyp.THW, ""),
    einheit: { organisation: OrganisationsTyp.THW, einheitsTyp: { code: typen[i % typen.length]! }, hierarchie: [{ bezeichnung: { code: 1 }, name: `Übungsort ${i + 1}` }] },
    uebung: true,
  }));
}

/** Datenteil eines Bogen-Links (hinter „#") für einen Übungsbogen, wie ihn der Erfassungsbogen teilt. */
export function uebungsBogenFragment(): string {
  return fragmentInhalt(encodePayloadUrl(uebungsBoegen(1)[0]!, KOMPRESSOR));
}
