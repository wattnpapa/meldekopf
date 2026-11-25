/**
 * Eine Abgleich-Sitzung: wann ein Gerät dem anderen seinen Stand schickt (neu
 * im Meldekopf, ADR-009). Ohne Netzwerk-Code — die Verbindung reicht nur
 * `senden` herein —, damit sich das Hin und Her der Geräte im Test mit
 * getrennten Speichern nachstellen lässt.
 *
 * Zentrale: schickt ihren ganzen Stand, sobald er anders ist als der zuletzt
 * geschickte. Was ein Sammler schickt, gleicht sie ab, quittiert es und
 * schickt danach wieder ihren Stand (er hat sich dadurch geändert).
 *
 * Sammler: schickt, was er aufgenommen hat und die Zentrale noch nicht kennt,
 * sobald sich daran etwas ändert, und nach jedem neuen Verbindungsaufbau noch
 * einmal: Eine Meldung, die ohne Verbindung aufgenommen wurde oder deren
 * Quittung ausblieb, geht so nach. Den Stand der Zentrale übernimmt er ganz.
 *
 * Ein Kreislauf kann dabei nicht entstehen: Der Stand der Zentrale erzeugt am
 * Sammler nichts, was die Zentrale nicht kennt. (Die Bremse der ersten
 * Fassung, in der beide Geräte einander je Feld abglichen, ist damit weg.)
 */

import { type MeldeEintrag } from "@bos/meldekopf/einsaetze";
import { einsaetzeLaden } from "../einsaetze-lesen";
import {
  standAbdruck,
  standNachricht,
  standNachrichtPruefen,
  standUebernehmen,
  zentraleStandUebernehmen,
  type ErhaltenNachricht,
  type StandNachricht,
  type UebernahmeErgebnis,
} from "./abgleich";

/** `zentrale`: führt die Lage, ihr Stand ist maßgeblich. `sammler`: nimmt auf und führt mit, was die Zentrale schickt. */
export type SitzungsRolle = "zentrale" | "sammler";

export class AbgleichSitzung {
  /** Die gekoppelte Sammlung; `null`, bis der erste Stand der Zentrale sie nennt. */
  einsatzId: string | null;
  private gesendet: string | null = null;
  /** Sammler: was mit dem zuletzt gesendeten Stand hinausging, bis die Quittung kommt. */
  private unterwegs: { kennung: string; ids: string[] } | null = null;
  /** Sammler: Meldungen, die die Zentrale kennt, weil sie sie bestätigt oder selbst geschickt hat. */
  private readonly bekannt = new Set<string>();

  constructor(
    einsatzId: string | null,
    private readonly senden: (n: StandNachricht | ErhaltenNachricht) => void,
    readonly rolle: SitzungsRolle,
    /** Sammler, nach einem Neuladen: was die Zentrale schon kannte (merker.ts). */
    bekannt: readonly string[] = [],
  ) {
    for (const id of bekannt) this.bekannt.add(id);
    this.einsatzId = einsatzId;
  }

  /** Sammler: Wartet diese Meldung noch auf die Zentrale? */
  private readonly wartet = (e: MeldeEintrag): boolean => !this.bekannt.has(e.id);

  /**
   * Stand schicken, wenn er sich geändert hat. Rückgabe: ob etwas hinausging; `null`, wenn es die Sammlung hier nicht
   * mehr gibt.
   */
  pruefen(): boolean | null {
    if (!this.einsatzId) return false;
    const auswahl = this.rolle === "sammler" ? this.wartet : undefined;
    const abdruck = standAbdruck(this.einsatzId, [], auswahl);
    if (abdruck == null) return null;
    if (abdruck === this.gesendet) return false;
    const n = standNachricht(this.einsatzId, [], auswahl);
    if (!n) return null;
    this.gesendet = abdruck;
    if (auswahl) {
      const ids = (einsaetzeLaden().find((x) => x.id === this.einsatzId)?.eintraege ?? []).filter(auswahl).map((e) => e.id);
      // Nichts wartet: Der Zentrale ist nichts zu sagen.
      if (ids.length === 0) return false;
      this.unterwegs = { kennung: abdruck, ids };
    }
    this.senden({ ...n, kennung: abdruck });
    return true;
  }

  /** Nach einem neuen Verbindungsaufbau: Das andere Gerät kennt nichts von dem, was zuletzt hinausging. */
  neuVerbunden(): void {
    this.gesendet = null;
    this.unterwegs = null;
  }

  /** Eine Nachricht des anderen Geräts einspielen und, wenn nötig, den eigenen Stand schicken. */
  empfangen(roh: unknown): UebernahmeErgebnis {
    const n = standNachrichtPruefen(roh);
    if (this.rolle === "sammler") {
      const r = zentraleStandUebernehmen(n, this.einsatzId, this.bekannt);
      if (r.abgelehnt) return r;
      this.einsatzId = r.einsatzId;
      for (const id of r.zentraleIds) this.bekannt.add(id);
      this.pruefen();
      return r;
    }
    // Was ein Sammler entfernt oder zurückholt, sagt er nicht: Er nimmt nur auf.
    const r = standUebernehmen({ ...n, entfernt: [], zurueckgeholt: [] }, this.einsatzId);
    if (r.abgelehnt) return r;
    this.einsatzId = r.einsatzId;
    // Die Zentrale quittiert: Der Sammler weiß damit, dass diese Meldungen eingespielt sind.
    if (n.kennung) this.senden({ art: "erhalten", kennung: n.kennung });
    this.pruefen();
    return r;
  }

  /** Sammler: Die Zentrale hat einen Stand eingespielt. Rückgabe: ob die Quittung zum zuletzt gesendeten Stand gehört. */
  quittung(kennung: unknown): boolean {
    const u = this.unterwegs;
    if (this.rolle !== "sammler" || !u || u.kennung !== kennung) return false;
    this.unterwegs = null;
    for (const id of u.ids) this.bekannt.add(id);
    // Was eben noch wartete, wartet nicht mehr: Der Abdruck der wartenden Meldungen ist jetzt ein anderer, zu schicken ist nichts.
    if (this.einsatzId) this.gesendet = standAbdruck(this.einsatzId, [], this.wartet);
    return true;
  }

  /** Sammler: alles, was die Zentrale kennt, zum Merken über ein Neuladen. */
  bestaetigte(): string[] {
    return [...this.bekannt];
  }

  /** Sammler: Kennt die Zentrale diese Meldung? */
  uebertragen(eintragId: string): boolean {
    return this.bekannt.has(eintragId);
  }

  /** Sammler: wie viele Meldungen dieses Geräts die Zentrale noch nicht kennt. */
  offen(): number {
    if (!this.einsatzId) return 0;
    const s = einsaetzeLaden().find((x) => x.id === this.einsatzId);
    return s ? s.eintraege.filter(this.wartet).length : 0;
  }
}
