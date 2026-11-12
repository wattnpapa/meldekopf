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

/**
 * Inhalt von `eeb.einsaetze.v1` mit einer Sammlung aus den gegebenen Bögen. `alterMin`: wie viele Minuten der Eingang
 * jedes Bogens vor `jetzt` liegt (Vorgabe: einer je Minute, der letzte vor einer Minute); nach einer Viertelstunde trägt
 * eine Einheit die Marke „neu" nicht mehr. `jetzt` ist die Uhr, an der die Seite die Zeiten misst (Vorgabe: die des
 * Rechners; die Seite des Prüfstands läuft ab `PRUEFSTAND_ZEIT`, support/haken.ts).
 */
export function sammlungSpeicher(
  name: string,
  boegen: Erfassungsbogen[],
  opt: { vomPapier?: boolean; art?: EinsatzArt; alterMin?: number[]; jetzt?: number } = {},
): { einsaetze: string; einsatzId: string } {
  const ablage = new Map<string, string>();
  speicherhuelleSetzen({ getItem: (k) => ablage.get(k) ?? null, setItem: (k, v) => void ablage.set(k, v) });
  try {
    const s = einsatzAnlegen(name, opt.art ?? EinsatzArt.EINSATZ);
    for (const b of boegen) meldungHinzufuegen(s.id, b, { quelle: "scan" });
    // In der Reihenfolge eingetroffen, eine Minute auseinander — sonst trügen
    // alle denselben Zeitpunkt, und „nach Eintreffzeit" sortierte zufällig.
    const liste = JSON.parse(ablage.get("eeb.einsaetze.v1") ?? "[]") as {
      id: string;
      eintraege: { empfangenAm: number; vomPapier?: number }[];
    }[];
    const jetzt = opt.jetzt ?? Date.now();
    const beginn = jetzt - boegen.length * 60_000;
    for (const x of liste) {
      x.eintraege.forEach((e, i) => {
        const alter = opt.alterMin?.[i];
        e.empfangenAm = alter != null ? jetzt - alter * 60_000 : beginn + i * 60_000;
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
 * Eine volle Lage für die Tafel des Lagemonitors (neu im Meldekopf): Einheiten reihum auf Organisationen verteilt (THW,
 * dann DRK, JUH, …), zwei von drei Einheiten mit Sofortbedarf (Ruhezeit und Unterbringung, jede dritte dazu mit
 * abweichender Verpflegung). Über die Oberfläche bräuchte das je Einheit ein Dutzend Schritte. Mit `abgerueckt` sind
 * die zuerst eingetroffenen so viele Einheiten abgerückt (vor 5, 10, … Minuten), wie es die Einsatzansicht vermerkt.
 */
export function tafelLageSpeicher(name: string, einheiten: number, organisationen: number, abgerueckt = 0): { einsaetze: string; einsatzId: string } {
  const ablage = new Map<string, string>();
  speicherhuelleSetzen({ getItem: (k) => ablage.get(k) ?? null, setItem: (k, v) => void ablage.set(k, v) });
  try {
    const s = einsatzAnlegen(name, EinsatzArt.EINSATZ);
    // Einheitentypen des THW-Vokabulars: Zugtrupp, Bergungsgruppe und Fachgruppen, jede mit Kurzform.
    const typen = [3, 4, 16, 27, 9, 6, 25, 43, 18, 5];
    const orgs = [OrganisationsTyp.THW, OrganisationsTyp.DRK, OrganisationsTyp.JUH, OrganisationsTyp.ASB];
    for (let i = 0; i < einheiten; i++) {
      const gruppe = i % organisationen;
      const nr = Math.floor(i / organisationen);
      const org = orgs[gruppe % orgs.length]!;
      const b = weitereEinheit(org, "");
      const gesamt = b.staerkeManuell?.gesamt ?? 6;
      // THW unterscheidet sich über den Typ, die übrigen Organisationen (zwei kurze Freitext-Typen) über den Ort. Ein langer
      // Freitext-Typ neben Bedarf und Stand mit Datum passt in der zweizeiligen Karte derzeit nicht (bekannt, eigener Fehler).
      const folge = org === OrganisationsTyp.THW ? (nr >= typen.length ? Math.floor(nr / typen.length) + 1 : 0) : nr + 1;
      const ort = `Ort ${gruppe + 1}${folge ? `-${folge}` : ""}`;
      const bogen: Erfassungsbogen = {
        ...b,
        einheit:
          org === OrganisationsTyp.THW
            ? { organisation: org, einheitsTyp: { code: typen[nr % typen.length]! }, hierarchie: [{ bezeichnung: { code: 1 }, name: ort }] }
            : { organisation: org, einheitsTyp: { freitext: nr % 2 === 0 ? "SEG San" : "SEG Bt" }, hierarchie: [{ bezeichnung: { freitext: "Ort" }, name: ort }] },
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
      meldungHinzufuegen(s.id, bogen, { quelle: "scan" });
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

/**
 * Die Übung vom Foto des Fernsehers (neu im Meldekopf): 17 Übungsbögen, Namen und Stärken wie dort, darunter die, die
 * auf der Tafel nur angeschnitten standen („Freiwilli… Lenglern", dreimal „DRK-Kreisverband B…", „Bundeswehr Panz…",
 * „THW Gieboldehau…" neben „0/4/13// 17"). Elf THW-Einheiten: Die Gruppe läuft in die zweite Spalte weiter.
 */
export function fernseherBoegen(): Erfassungsbogen[] {
  type Angabe = [OrganisationsTyp, string, string, number | string, [number, number, number]];
  const T = OrganisationsTyp;
  const angaben: Angabe[] = [
    [T.THW, "", "Albstadt", 3, [1, 1, 2]],
    [T.THW, "", "Crailsheim", 9, [0, 3, 9]],
    [T.THW, "", "Müllheim", 19, [0, 3, 9]],
    [T.THW, "", "Kirchehrenbach", 4, [0, 2, 7]],
    [T.THW, "", "Oldenburg (NI)", 43, [0, 1, 2]],
    [T.THW, "", "Rathenow", 4, [0, 2, 7]],
    [T.THW, "", "Oldenburg (NI)", "Verstärkter Bergungszug", [1, 9, 28]],
    [T.THW, "", "Gieboldehausen", 30, [0, 4, 13]],
    [T.THW, "", "Peine", 20, [0, 1, 2]],
    [T.THW, "", "Bad Segeberg", 26, [0, 3, 15]],
    [T.THW, "", "Schleswig", 6, [0, 2, 9]],
    [T.FEUERWEHR, "Freiwillige Feuerwehr", "Lenglern", "Schwerpunktfeuerwehr (Zug, erweitert)", [4, 18, 24]],
    [T.DRK, "DRK-Kreisverband Buchenrode e. V.", "", "Behandlung Kat. GRÜN (BHP 50)", [0, 1, 4]],
    [T.DRK, "DRK-Kreisverband Buchenrode e. V.", "", "Schnelleinsatzgruppe Sanität (Behandlung)", [1, 1, 8]],
    [T.DRK, "DRK-Kreisverband Buchenrode e. V.", "", "Sichtung und Registrierung (Betreuungsplatz)", [2, 1, 2]],
    [T.DLRG, "", "Baden", "Wasserrettungsverband — Führungstrupp", [2, 1, 1]],
    [T.BUNDESWEHR, "Bundeswehr Panzerpionierzug", "", "Panzerpionierzug", [1, 4, 38]],
  ];
  return angaben.map(([organisation, organisationName, ort, typ, [fuehrer, unterfuehrer, mannschaft]]): Erfassungsbogen => ({
    ...weitereEinheit(organisation, ort),
    einheit: {
      organisation,
      ...(organisationName ? { organisationName } : {}),
      einheitsTyp: typeof typ === "number" ? { code: typ } : { freitext: typ },
      hierarchie: [{ bezeichnung: { code: 1 }, name: ort }],
    },
    staerkeManuell: { fuehrer, unterfuehrer, mannschaft, gesamt: fuehrer + unterfuehrer + mannschaft },
    uebung: true,
  }));
}

/**
 * Eine kleine Lage für die breite Karte der Tafel (neu im Meldekopf): vier THW-Einheiten und eine Feuerwehr mit langem
 * Funkrufnamen („Florian Ammerland Bad Zwischenahn Rostrup 14/43/1"), alle ohne Sofortbedarf und seit über einer
 * Viertelstunde da ({@link FUNKRUF_ALTER_MIN}), also ohne Marken. Bei der Vorgabebreite der Namensspalte ist er gekürzt, und
 * die Tafel misst die Spalte nach. Vorgefallen (Gegenprüfung): Gemessen wurde die Hülle des Funkrufnamens, die Breite
 * hing an sich selbst, sank je Bild um einen Pixel, und nach 50 Durchgängen brach React ab.
 */
export function funkrufBoegen(): Erfassungsbogen[] {
  const T = OrganisationsTyp;
  const einheit = (organisation: OrganisationsTyp, ort: string, typ: number | string, mannschaft: number, organisationName?: string): Erfassungsbogen => ({
    ...weitereEinheit(organisation, ort),
    einheit: {
      organisation,
      ...(organisationName ? { organisationName } : {}),
      einheitsTyp: typeof typ === "number" ? { code: typ } : { freitext: typ },
      hierarchie: [{ bezeichnung: { code: 1 }, name: ort }],
    },
    staerkeManuell: { fuehrer: 0, unterfuehrer: 2, mannschaft, gesamt: 2 + mannschaft },
    // Ohne Sofortbedarf (der alte Bogen meldet Verpflegung für 20): Marken nähmen der breiten Karte den Platz.
    sofortbedarf: undefined,
  });
  const ff = einheit(T.FEUERWEHR, "Rostrup", "Löschgruppe", 8, "Freiwillige Feuerwehr");
  ff.staerkeManuell = { fuehrer: 0, unterfuehrer: 1, mannschaft: 8, gesamt: 9 };
  ff.fahrzeuge = [{ typ: { freitext: "LF 20" }, funkrufname: { kennwort: { freitext: "Florian Ammerland Bad Zwischenahn" }, eigenerStandort: true, teile: [14, 43, 1] } }];
  return [einheit(T.THW, "Peine", 4, 6), einheit(T.THW, "Uslar", 16, 6), einheit(T.THW, "Leer", 27, 6), einheit(T.THW, "Celle", 9, 6), ff];
}

/** Wie viele Minuten die Eingänge von {@link funkrufBoegen} her sind. */
export const FUNKRUF_ALTER_MIN = [103, 102, 101, 100, 30];

/**
 * Eine kleine Lage für die breite Karte der Tafel (neu im Meldekopf): zwei THW-Einheiten und eine Feuerwehr mit
 * Funkrufnamen, dazu ein eben eingetroffener DRK-Ortsverein ohne Funkrufnamen, der Ruhezeit, Unterbringung und
 * Verpflegung für 12 meldet ({@link BEDARF_ALTER_MIN}). Vorgefallen (zweite Gegenprüfung, schon im ausgelieferten
 * Stand): Die Tafel maß für die Spalte der Namen die Spur der Marken statt ihres Bedarfs; neben dem langen Namen der
 * Feuerwehr war die Spur gequetscht, die Messung folgte der Spalte um je einen Pixel, und nach 50 Durchgängen brach die
 * Tafel ab.
 */
export function bedarfBoegen(): Erfassungsbogen[] {
  const T = OrganisationsTyp;
  const einheit = (
    organisation: OrganisationsTyp,
    ort: string,
    typ: number | string,
    [fuehrer, unterfuehrer, mannschaft]: [number, number, number],
    funk?: { kennwort: string | number; teile: number[] },
    organisationName?: string,
  ): Erfassungsbogen => ({
    ...weitereEinheit(organisation, ort),
    einheit: {
      organisation,
      ...(organisationName ? { organisationName } : {}),
      einheitsTyp: typeof typ === "number" ? { code: typ } : { freitext: typ },
      hierarchie: [{ bezeichnung: { code: 1 }, name: ort }],
    },
    staerkeManuell: { fuehrer, unterfuehrer, mannschaft, gesamt: fuehrer + unterfuehrer + mannschaft },
    sofortbedarf: undefined,
    fahrzeuge: funk
      ? [{ typ: { freitext: "MTW" }, funkrufname: { kennwort: typeof funk.kennwort === "number" ? { code: funk.kennwort } : { freitext: funk.kennwort }, eigenerStandort: true, teile: funk.teile } }]
      : [],
  });
  const drk = einheit(T.DRK, "Rastede", "Sanitätsgruppe", [0, 2, 6], undefined, "DRK-Ortsverein");
  drk.sofortbedarf = { verpflegungPersonen: 12, dieselLiter: 0, benzinLiter: 0, gemischLiter: 0, unterbringung: true, ruhezeitErforderlich: true };
  return [
    einheit(T.THW, "Westerstede", 3, [1, 1, 2], { kennwort: 1, teile: [21, 10] }),
    einheit(T.THW, "Gieboldehausen", 4, [0, 3, 6], { kennwort: 1, teile: [22, 51] }),
    einheit(T.FEUERWEHR, "Bad Zwischenahn", "Löschgruppe", [0, 1, 8], { kennwort: "Florian Ammerland", teile: [14, 43, 1] }, "Freiwillige Feuerwehr"),
    drk,
  ];
}

/** Wie viele Minuten die Eingänge von {@link bedarfBoegen} her sind: der DRK-Ortsverein trägt noch die Marke „neu". */
export const BEDARF_ALTER_MIN = [70, 66, 80, 3];

/** Datenteil eines Bogen-Links (hinter „#") für einen Übungsbogen, wie ihn der Erfassungsbogen teilt. */
export function uebungsBogenFragment(): string {
  return fragmentInhalt(encodePayloadUrl(uebungsBoegen(1)[0]!, KOMPRESSOR));
}
