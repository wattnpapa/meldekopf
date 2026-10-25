/**
 * Abschnitt Stärke der Schnellerfassung: Zähler für Führer, Unterführer und
 * Mannschaft, wahlweise die Aufteilung nach Geschlecht, die Verpflegung und
 * eine Führungskraft für Rückfragen.
 *
 * Herkunft: Erfassungsbogen `src/app/schritte/personal.tsx` (Commit 441811c),
 * der Teil „Nur Stärke (Meldekopf-Schnellerfassung)" mit den Befunden R3-N3
 * (Geschlecht ausgeschrieben) und R6-A8 (Sollstärke nicht dazuzählen). Neu
 * statt der Personenkarte: Die Führungskraft ist hier eine Zeile mit Name und
 * Telefon. Wer mehr Personen oder Funktionen erfassen will, nimmt „Im
 * Erfassungsbogen vollständig erfassen…".
 */
import { KontaktArt, StaerkeRolle, verpflegung, type Person } from "@bos/eeb-format/model";
import { Feld, FREMDE_DATEN, MWD_LEGENDE, Stepper, STAERKE_LEGENDE } from "@bos/oberflaeche/bausteine";
import { useZahlQuittung } from "@bos/oberflaeche/quittung";
import { neuePerson } from "../hilfen";
import type { AbschnittProps } from "./abschnitt";

/** Die erste Person des Bogens als Führungskraft — Name und Mobilnummer. */
function fuehrungskraft(personal: Person[]): { nachname: string; vorname: string; telefon: string } {
  const p = personal[0];
  return {
    nachname: p?.nachname ?? "",
    vorname: p?.vorname ?? "",
    telefon: p?.kontakte.find((k) => k.art === KontaktArt.MOBIL || k.art === KontaktArt.FESTNETZ)?.wert ?? "",
  };
}

/**
 * Führungskraft zurück in die Personalliste. Leer bleibt die Liste leer: Eine
 * leere Karte trüge sonst eine Person ohne Namen in den Bogen. Weitere
 * Personen (aus einem eingelesenen Bogen) bleiben stehen.
 */
function mitFuehrungskraft(personal: Person[], f: { nachname: string; vorname: string; telefon: string }): Person[] {
  const rest = personal.slice(1);
  const leer = !f.nachname.trim() && !f.vorname.trim() && !f.telefon.trim();
  if (leer) return rest;
  const alt = personal[0] ?? { ...neuePerson(), staerkeRolle: StaerkeRolle.FUEHRER };
  const andereKontakte = alt.kontakte.filter((k) => k.art !== KontaktArt.MOBIL && k.art !== KontaktArt.FESTNETZ);
  const person: Person = {
    ...alt,
    nachname: f.nachname,
    vorname: f.vorname,
    kontakte: f.telefon ? [{ art: KontaktArt.MOBIL, dienstlich: true, wert: f.telefon }, ...andereKontakte] : andereKontakte,
  };
  return [person, ...rest];
}

export function AbschnittStaerke({ bogen, aendern }: AbschnittProps) {
  const sm = bogen.staerkeManuell ?? { fuehrer: 0, unterfuehrer: 0, mannschaft: 0, gesamt: 0 };
  const gesamtQuittung = useZahlQuittung<HTMLInputElement>(sm.gesamt);
  const setSm = (p: Partial<typeof sm>) => {
    const neu = { ...sm, ...p };
    neu.gesamt = neu.fuehrer + neu.unterfuehrer + neu.mannschaft;
    aendern({ staerkeManuell: neu });
  };
  const vp = verpflegung(bogen);
  const setVp = (patch: Partial<{ vegetarisch: number; vegan: number }>) =>
    aendern({ verpflegungManuell: { vegetarisch: vp.vegetarisch, vegan: vp.vegan, ...patch } });
  const vegSumme = vp.vegetarisch + vp.vegan;
  const fk = fuehrungskraft(bogen.personal);
  const setFk = (p: Partial<typeof fk>) => aendern({ personal: mitFuehrungskraft(bogen.personal, { ...fk, ...p }) });

  return (
    <section className="karte">
      <h2>Stärke</h2>
      {/* Zähler statt nackter Zahlenfelder: Der Meldekopf nimmt eine
          eintreffende Einheit im Stehen auf, oft mit Handschuh, und zählt sie
          durch. Tippen bleibt möglich (das Feld in der Mitte ist eins). */}
      <div className="stepper-zeile">
        <Stepper titel="Führer" wert={sm.fuehrer} setzen={(n) => setSm({ fuehrer: n })} />
        <Stepper titel="Unterführer" wert={sm.unterfuehrer} setzen={(n) => setSm({ unterfuehrer: n })} />
        <Stepper titel="Mannschaft" wert={sm.mannschaft} setzen={(n) => setSm({ mannschaft: n })} />
        <Feld titel="Gesamt" schmal>
          {/* Errechnet, nicht getippt: die Summe zieht nach und quittiert das. */}
          <input ref={gesamtQuittung} value={sm.gesamt} readOnly />
        </Feld>
      </div>
      <p className="hinweis legende">{STAERKE_LEGENDE}</p>
      <div className="zeile">
        <label className="inline" title={MWD_LEGENDE}>
          <input
            type="checkbox"
            checked={bogen.unterbringungManuell != null}
            onChange={(e) => aendern({ unterbringungManuell: e.target.checked ? { m: 0, w: 0, d: 0 } : undefined })}
          />
          Aufteilung nach Geschlecht angeben (für Unterbringung, WC/Dusche)
        </label>
        {bogen.unterbringungManuell && (
          <>
            {/* Ausgeschrieben: „M" stand als Zähler direkt unter „Mannschaft" (R3-N3). */}
            {([["m", "männlich"], ["w", "weiblich"], ["d", "divers"]] as const).map(([g, titel]) => (
              <Stepper
                key={g}
                titel={titel}
                wert={bogen.unterbringungManuell![g]}
                setzen={(n) => aendern({ unterbringungManuell: { ...bogen.unterbringungManuell!, [g]: n } })}
              />
            ))}
          </>
        )}
      </div>
      <h3>Verpflegung</h3>
      <div className="stepper-zeile">
        <Stepper titel="vegetarisch" wert={vp.vegetarisch} setzen={(n) => setVp({ vegetarisch: n })} />
        <Stepper titel="vegan" wert={vp.vegan} setzen={(n) => setVp({ vegan: n })} />
        {/* „1 von 0 vegetarisch" ist keine Auskunft, sondern ein Widerspruch — der wird benannt. */}
        <span className="hinweis stepper-rest">
          {vegSumme > sm.gesamt
            ? `${vegSumme} vegetarisch/vegan — mehr als die Gesamtstärke ${sm.gesamt}`
            : `${vegSumme} von ${sm.gesamt} vegetarisch/vegan · ${sm.gesamt - vegSumme} sonstige`}
        </span>
      </div>
      <h3>Führungskraft / erreichbar für Rückfragen</h3>
      <p className="hinweis">Zählt nicht in die Stärke mit; die Stärke ist nur die Zahl oben.</p>
      <div className="zeile">
        <Feld titel="Name">
          <input {...FREMDE_DATEN} value={fk.nachname} onChange={(e) => setFk({ nachname: e.target.value })} />
        </Feld>
        <Feld titel="Vorname">
          <input {...FREMDE_DATEN} value={fk.vorname} onChange={(e) => setFk({ vorname: e.target.value })} />
        </Feld>
        <Feld titel="Telefon">
          {/* Ziffernblock zuerst; Fremddaten, damit der Browser nicht die eigene Nummer anbietet (R2-M6). */}
          <input
            type="tel"
            inputMode="tel"
            {...FREMDE_DATEN}
            value={fk.telefon}
            onChange={(e) => setFk({ telefon: e.target.value.replace(/\D/g, "") })}
          />
        </Feld>
      </div>
    </section>
  );
}
