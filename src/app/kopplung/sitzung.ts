/**
 * Eine Abgleich-Sitzung: wann ein Gerät dem anderen seinen Stand schickt (neu
 * im Meldekopf, ADR-009). Ohne Netzwerk-Code — die Verbindung reicht nur
 * `senden` herein —, damit sich das Hin und Her zweier Geräte im Test mit zwei
 * Speichern nachstellen lässt.
 *
 * Regel: Ein Gerät schickt seinen ganzen Stand, sobald er anders ist als der
 * zuletzt geschickte. Nach dem Einspielen eines fremden Stands schickt es nur,
 * wenn sich dadurch hier etwas geändert hat (das andere Gerät kennt dann
 * meist schon alles; der Abgleich je Feld kann aber einen dritten Stand
 * ergeben, den es noch nicht hat).
 *
 * Bremse: Der Abgleich schreibt bei einem Widerspruch ohne Verlauf einen
 * Vermerk mit der Uhrzeit des Abgleichs. Zwei Geräte könnten sich solche
 * Vermerke endlos zuspielen. Nach {@link MAX_ECHO} Runden, in denen niemand
 * etwas getan hat, schweigt die Sitzung, bis hier wieder jemand etwas ändert.
 */

import { entfernteLaden } from "../entfernte-meldungen";
import { einsaetzeLaden } from "../einsaetze-lesen";
import { standAbdruck, standNachricht, standNachrichtPruefen, standUebernehmen, type StandNachricht, type UebernahmeErgebnis } from "./abgleich";

export const MAX_ECHO = 3;

export class AbgleichSitzung {
  /** Die gekoppelte Sammlung; `null`, bis der erste Stand des anderen Geräts sie nennt. */
  einsatzId: string | null;
  private gesendet: string | null = null;
  private echo = 0;
  /** Der Stand, bei dem die Bremse griff: Er geht erst hinaus, wenn hier jemand etwas ändert. */
  private gebremst: string | null = null;
  private readonly zurueckgeholt = new Set<string>();
  private entferntZuletzt: Set<string> | null = null;

  constructor(
    einsatzId: string | null,
    private readonly senden: (n: StandNachricht) => void,
  ) {
    this.einsatzId = einsatzId;
    this.entferntZuletzt = this.entfernt();
  }

  private entfernt(): Set<string> | null {
    return this.einsatzId ? new Set(entfernteLaden()[this.einsatzId] ?? []) : null;
  }

  /** Was hier seit dem letzten Blick aus dem Papierkorb zurückkam, erfährt das andere Gerät. */
  private rueckholungenErkennen(): void {
    const jetzt = this.entfernt();
    const vorher = this.entferntZuletzt;
    this.entferntZuletzt = jetzt;
    if (!jetzt || !vorher || !this.einsatzId) return;
    const s = einsaetzeLaden().find((x) => x.id === this.einsatzId);
    if (!s) return;
    const da = new Set(s.eintraege.map((e) => e.id));
    for (const id of vorher) if (!jetzt.has(id) && da.has(id)) this.zurueckgeholt.add(id);
  }

  /**
   * Stand schicken, wenn er sich geändert hat. `ausAbgleich`: Die Änderung kam
   * durch das Einspielen eines fremden Stands, nicht von einer Hand an diesem
   * Gerät. Rückgabe: ob etwas hinausging; `null`, wenn es die Sammlung hier
   * nicht mehr gibt.
   */
  pruefen(ausAbgleich = false): boolean | null {
    if (!this.einsatzId) return false;
    if (!ausAbgleich) this.rueckholungenErkennen();
    const zurueck = [...this.zurueckgeholt];
    const abdruck = standAbdruck(this.einsatzId, zurueck);
    if (abdruck == null) return null;
    if (abdruck === this.gesendet) return false;
    if (ausAbgleich) {
      if (this.echo >= MAX_ECHO) {
        this.gebremst = abdruck;
        return false;
      }
      this.echo++;
    } else {
      if (abdruck === this.gebremst) return false;
      this.echo = 0;
    }
    this.gebremst = null;
    const n = standNachricht(this.einsatzId, zurueck);
    if (!n) return null;
    this.gesendet = abdruck;
    this.senden(n);
    return true;
  }

  /** Nach einem neuen Verbindungsaufbau: Das andere Gerät kennt nichts von dem, was zuletzt hinausging. */
  neuVerbunden(): void {
    this.gesendet = null;
    this.echo = 0;
    this.gebremst = null;
  }

  /** Eine Nachricht des anderen Geräts einspielen und, wenn nötig, den eigenen Stand zurückschicken. */
  empfangen(roh: unknown): UebernahmeErgebnis {
    const n = standNachrichtPruefen(roh);
    // Erst die eigenen Rückholungen festhalten: Das Einspielen ändert die Liste der entfernten Kennungen.
    this.rueckholungenErkennen();
    const r = standUebernehmen(n, this.einsatzId, [...this.zurueckgeholt]);
    if (r.abgelehnt) return r;
    this.einsatzId = r.einsatzId;
    for (const id of r.zurueckgeholtBestaetigt) this.zurueckgeholt.delete(id);
    this.entferntZuletzt = this.entfernt();
    this.pruefen(true);
    return r;
  }
}
