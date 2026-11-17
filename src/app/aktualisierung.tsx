/// <reference types="vite-plugin-pwa/client" />
/**
 * Update-Hinweise der Web-App.
 *
 * Herkunft: Erfassungsbogen `src/app/aktualisierung.tsx` (Commit 1d7ed5f), auf
 * den Web-Teil gekürzt. Das Android-Selbst-Update des Erfassungsbogens
 * (Capacitor-Plugin AppUpdate) entfällt: Es fragte beim Start api.github.com
 * ab, und außer der Reichweitenmessung hat diese App keine Fremdverbindung
 * (architektur.md Kap. 3.2). Der Desktop aktualisiert sich über
 * electron-updater im Hauptprozess (electron/main.js).
 *
 * Geändert gegenüber der Herkunft (2026-11-13): Das Hauptfenster sucht im
 * Betrieb selbst nach einer neuen Fassung, und jedes Fenster lädt neu, sobald
 * eine neue Fassung die Steuerung übernimmt, auch das Fenster des
 * Lagemonitors. Der Ablauf läuft einmal je Fenster (`aktualisierungStarten`),
 * nicht einmal je Ansicht. Seit 2026-11-17 bleibt der Hinweis beim Rollen
 * oben stehen, und ein Fenster, das von selbst neu gestartet ist, sagt es.
 */

import { useEffect, useSyncExternalStore } from "react";
import { istNativ } from "./nativ";

/**
 * Web-Selbst-Update über den Service Worker (nur Browser). Der SW lädt eine
 * neue Version im Hintergrund und wartet dann; der Hinweis meldet das dezent
 * und aktiviert sie erst auf Klick (kein Auto-Update, damit eine gerade
 * geführte Sammlung nicht unterbrochen wird). In der Capacitor-/Electron-App
 * wird der SW nicht registriert – dort rendert die Komponente nichts.
 */

/** So lange wartet „Neu laden" auf das Neuladen durch den Service Worker, bevor die Seite es selbst tut. */
export const NEULADEN_RUECKFALL_MS = 1500;

/**
 * „Neu laden" im Update-Hinweis (R13-O4): Der Service Worker wird aktiviert; das Neuladen hängt in der
 * Registrierung an einem Ereignis, das nur kommt, wenn die Seite beim Registrieren schon gesteuert war. In einer
 * Sitzung seit der Erstinstallation blieb der Tipp deshalb wirkungslos. Darum lädt die Seite nach kurzer Frist
 * selbst neu — wer vorher neu geladen wurde, merkt davon nichts.
 */
export function neuLadenMitRueckfall(
  aktivieren: () => Promise<void> | void,
  neuladen: () => void,
  warteMs: number = NEULADEN_RUECKFALL_MS,
): void {
  let fertig = false;
  const lade = () => {
    if (fertig) return;
    fertig = true;
    neuladen();
  };
  setTimeout(lade, warteMs);
  try {
    void Promise.resolve(aktivieren()).catch(() => lade());
  } catch {
    lade();
  }
}

/** So oft fragt das offene Hauptfenster, ob eine neue Fassung bereitliegt: eine kleine Datei der eigenen Herkunft (`sw.js`). */
export const SUCHE_MS = 60 * 60_000;
/** War das Fenster so lange verborgen (anderes Fenster, Gerät gesperrt), fragt es beim Zurückkommen gleich nach. */
export const SUCHE_NACH_PAUSE_MS = 10 * 60_000;
/** Merkt, für welche Fassung dieses Fenster schon einmal wegen „veraltet" neu geladen hat (sessionStorage, je Fenster). */
export const VERALTET_SCHLUESSEL = "eeb.fassung.veraltet";
/** Merkt über ein Neuladen hinweg, dass das Hauptfenster von selbst neu gestartet ist, nicht auf eigenes „Neu laden" (sessionStorage). */
export const NEU_GESTARTET_SCHLUESSEL = "eeb.fassung.neu-gestartet";

/**
 * Welches Fenster: Das Hauptfenster sucht und meldet eine neue Fassung; eine reine Anzeige (das Fenster des
 * Lagemonitors) sucht nicht, zeigt nichts und folgt nur.
 */
export type FensterArt = "hauptfenster" | "anzeige";

export interface NeueVersion {
  /** Eine neue Fassung wartet. */
  da: boolean;
  /** „Neu laden" getippt: Die neue Fassung wird geladen. */
  laedt: boolean;
  /** Die neue Fassung aktivieren; jedes Fenster der App lädt dann neu. */
  neuLaden: () => void;
  /** Den Hinweis ausblenden; er kommt mit dem nächsten Laden oder der nächsten Suche wieder, solange die Fassung wartet. */
  spaeter: () => void;
  /** Dieses Fenster ist eben von selbst neu gestartet (neue Fassung aus einem anderen Fenster oder vom Browser aktiviert). */
  neuGestartet: boolean;
  /** Die Erklärung dazu ausblenden. */
  verstanden: () => void;
}

/** Ändern nur die Tests: die Adresse des Bausteins, der diesen Code trägt (im Bau ein `assets/…js` dieser Fassung). */
export const fassungsQuelle = { adresse: import.meta.url };

/**
 * Läuft diese Seite noch mit der Fassung, die der Service Worker ausliefert? Eine neue Fassung räumt beim Aktivieren
 * die Bausteine der alten aus dem Vorrat (Workbox-Precache), und auf dem Server liegen sie nach dem Ausrollen auch
 * nicht mehr. Eine Seite der alten Fassung fände dann ihre nachgeladenen Teile nicht mehr: Die nächste Ansicht stürzte
 * mit „ohne Netz“ ab, obwohl Netz da ist. Geprüft wird, ob der Baustein mit diesem Code noch im Vorrat liegt. Im
 * Zweifel (kein Cache-Zugriff, kein Vorrat, Entwicklungsserver) gilt die Seite als aktuell.
 */
export async function fassungVeraltet(adresse: string = fassungsQuelle.adresse): Promise<boolean> {
  try {
    if (typeof caches === "undefined") return false;
    const url = new URL(adresse);
    if (!/^https?:$/.test(url.protocol) || !/\/assets\/[^/]+\.js$/.test(url.pathname)) return false;
    // Alle Vorräte der Herkunft: Workbox benennt sie je Bereich (workbox-precache-v2-<scope>). Liegt auf derselben Herkunft
    // eine zweite App unter einem anderen Pfad, stand ihr Vorrat womöglich vorn, und die Seite galt grundlos als veraltet.
    const vorraete = (await caches.keys()).filter((name) => name.startsWith("workbox-precache"));
    if (vorraete.length === 0) return false;
    for (const name of vorraete) if ((await (await caches.open(name)).match(url.href)) !== undefined) return false;
    return true;
  } catch {
    return false;
  }
}

/** Wartet, bis der Service Worker aktiv ist (dann hat er den Vorrat aufgeräumt); `false`, wenn er vorher ausscheidet. */
function aktiviert(sw: ServiceWorker): Promise<boolean> {
  if (sw.state === "activated") return Promise.resolve(true);
  if (sw.state === "redundant") return Promise.resolve(false);
  return new Promise((fertig) => {
    const zustand = () => {
      if (sw.state !== "activated" && sw.state !== "redundant") return;
      sw.removeEventListener("statechange", zustand);
      fertig(sw.state === "activated");
    };
    sw.addEventListener("statechange", zustand);
  });
}

/**
 * Darf dieses Fenster wegen „veraltet" neu laden? Einmal je Fassung und Fenster: Wäre die Prüfung einmal falsch, lüde
 * die Seite sonst immer wieder neu. Ohne sessionStorage gibt es diesen Schutz nicht, dann lädt sie nicht selbst.
 */
function veraltetNeuLadenErlaubt(): boolean {
  try {
    if (sessionStorage.getItem(VERALTET_SCHLUESSEL) === fassungsQuelle.adresse) return false;
    sessionStorage.setItem(VERALTET_SCHLUESSEL, fassungsQuelle.adresse);
    return true;
  } catch {
    return false;
  }
}

interface Lauf {
  aktivieren: (() => Promise<void> | void) | null;
  vorDemNeuladen: (() => void) | null;
  beenden: () => void;
}
let lauf: Lauf | null = null;
let stand: { da: boolean; laedt: boolean; neuGestartet: boolean } = { da: false, laedt: false, neuGestartet: false };
// In diesem Fenster wurde „Neu laden" getippt: Das folgende Neuladen braucht keine Erklärung.
let selbstGetippt = false;
const zuhoerer = new Set<() => void>();

function melden(neu: Partial<typeof stand>): void {
  stand = { ...stand, ...neu };
  for (const z of zuhoerer) z();
}

/**
 * Service Worker registrieren (nur im Web), nach neuen Fassungen suchen und auf eine neue Fassung reagieren. Läuft
 * einmal je Fenster; ein zweiter Aufruf setzt nur `vorDemNeuladen`.
 *
 * Hauptfenster: Gesucht wird beim Laden, stündlich ({@link SUCHE_MS}), nach mindestens zehn Minuten im Hintergrund
 * beim Zurückkommen und wenn das Netz wiederkommt. Vorher fragte eine offene App nie selbst nach; ein Laptop, der den
 * ganzen Einsatz lief, erfuhr von einer neuen Fassung erst beim nächsten Neuladen. Ohne Netz scheitert die Frage still.
 * Eine wartende Fassung meldet der Hinweis; aktiviert wird sie erst auf „Neu laden“.
 *
 * Jedes Fenster lädt neu, sobald eine neue Fassung die Steuerung übernimmt, aus welchem Fenster auch immer sie
 * aktiviert wurde. Das tat die Bibliothek schon vorher für Hauptfenster, die den Hinweis gesehen hatten; jetzt gilt es
 * für alle, auch für das Fenster des Lagemonitors. Weiterlaufen kann ein Fenster nicht: Die Bausteine seiner Fassung
 * sind dann weder im Vorrat noch auf dem Server. Eine Eingabe in der Schnellerfassung übersteht das Neuladen
 * (Entwurf). Übernimmt eine Fassung eine Seite, die vorher ungesteuert war (Erstinstallation, oder hart an Service
 * Worker und Vorrat vorbei geladen), lädt sie nur neu, wenn ihre eigene Fassung nicht mehr im Vorrat liegt
 * ({@link fassungVeraltet}); ebenso beim Start, wenn die Übernahme lief, während die Seite lud.
 */
export function aktualisierungStarten(art: FensterArt, vorDemNeuladen?: () => void): void {
  if (lauf) {
    if (vorDemNeuladen) lauf.vorDemNeuladen = vorDemNeuladen;
    return;
  }
  // Kein SW in der nativen App (Capacitor iOS/Android) oder im Electron-Build:
  // die App liegt dort schon lokal, und capacitor://- bzw. file://-Kontexte
  // tragen keinen brauchbaren Service Worker.
  if (istNativ()) return;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  // Nur über http/https registrieren (nicht unter file://, capacitor://).
  if (!/^https?:$/.test(window.location.protocol)) return;

  const container = navigator.serviceWorker;
  const hauptfenster = art === "hauptfenster";
  let registrierung: ServiceWorkerRegistration | undefined;
  let aktualisieren: ((neuLaden?: boolean) => Promise<void>) | null = null;
  let takt: number | undefined;
  let verborgenSeit: number | null = document.visibilityState === "hidden" ? Date.now() : null;
  let vorher = container.controller;

  const l: Lauf = { aktivieren: null, vorDemNeuladen: vorDemNeuladen ?? null, beenden: () => {} };
  lauf = l;
  const laeuft = () => lauf === l;

  const neuLaden = () => {
    if (!laeuft()) return;
    try {
      l.vorDemNeuladen?.();
      // Ein Hauptfenster, das von selbst neu startet, sagt es danach: Wer in einem Dialog tippte, fände die Eingabe sonst
      // ohne Erklärung nicht mehr.
      if (hauptfenster && !selbstGetippt) sessionStorage.setItem(NEU_GESTARTET_SCHLUESSEL, "1");
    } catch {
      /* Nur Bequemlichkeit (Stufe, Vollbild, Erklärung); neu geladen wird trotzdem. */
    }
    window.location.reload();
  };

  // Eine neue Fassung wartet. Nur das Hauptfenster meldet sie; bei der Erstinstallation (noch keine aktive Fassung) gibt es
  // nichts zu melden. Gefragt wird die Registrierung, nicht die Steuerung dieser Seite: Ein hart neu geladenes Fenster ist
  // ungesteuert, und nach „Später“ kam der Hinweis dort nie wieder. Weggelegt steht er nach der nächsten Suche wieder da.
  const wartet = () => {
    if (!hauptfenster || !laeuft() || !registrierung?.waiting || !registrierung.active) return;
    l.aktivieren = () => aktualisieren?.(true);
    melden({ da: true });
  };
  const suchen = () => {
    void registrierung?.update().then(wartet, () => {
      /* Ohne Netz oder bei einem Fehler des Servers: beim nächsten Mal. */
    });
  };
  // Gemessen wird die Zeit im Hintergrund, nicht die seit der letzten Suche: Ein kurzer Blick in ein anderes Fenster fragt nicht.
  const sichtbarkeit = () => {
    if (document.visibilityState === "hidden") {
      verborgenSeit ??= Date.now();
      return;
    }
    const weg = verborgenSeit;
    verborgenSeit = null;
    if (weg != null && Date.now() - weg >= SUCHE_NACH_PAUSE_MS) suchen();
  };
  // Eine Installation selbst verfolgen: Die Bibliothek hört nach der ersten von außen angestoßenen nicht mehr hin, und
  // `update()` ist erfüllt, bevor die neue Fassung fertig installiert ist. Ohne das kam der Hinweis nach einer
  // abgebrochenen Installation erst eine Suche (eine Stunde) später.
  const gefunden = () => {
    const neu = registrierung?.installing;
    if (!neu) return;
    const zustand = () => {
      if (neu.state === "installing") return;
      neu.removeEventListener("statechange", zustand);
      if (neu.state === "installed") wartet();
    };
    neu.addEventListener("statechange", zustand);
  };

  const veraltetPruefen = async () => {
    const sw = container.controller;
    if (!sw || !(await aktiviert(sw)) || !laeuft() || container.controller !== sw) return;
    if (!(await fassungVeraltet()) || !laeuft()) return;
    // Einmal je Fassung und Fenster. Ist die Seite danach weiter „veraltet“, irrt die Prüfung (etwa ein beschädigter Vorrat):
    // Dann bleibt es still, statt eine neue Version zu melden, die „Neu laden“ nie herbeiholt.
    if (veraltetNeuLadenErlaubt()) neuLaden();
  };

  const wechsel = () => {
    const war = vorher;
    vorher = container.controller;
    if (war) neuLaden();
    else void veraltetPruefen();
  };
  container.addEventListener("controllerchange", wechsel);
  void veraltetPruefen();

  l.beenden = () => {
    window.clearInterval(takt);
    container.removeEventListener("controllerchange", wechsel);
    document.removeEventListener("visibilitychange", sichtbarkeit);
    window.removeEventListener("online", suchen);
    registrierung?.removeEventListener("updatefound", gefunden);
  };

  // Das Fenster des Lagemonitors meldet den Service Worker nicht an, wie vor 2026-11-13: Es sucht und aktiviert nichts, und
  // seine Anmeldung kurz nach dem Öffnen ließ im Wettlauf mit „Neu laden“ das Hauptfenster hängen (Gegenprüfung
  // 2026-11-16). Wechsel der Steuerung und Prüfung „veraltet“ brauchen die Registrierung nicht.
  if (!hauptfenster) return;
  try {
    if (sessionStorage.getItem(NEU_GESTARTET_SCHLUESSEL)) {
      sessionStorage.removeItem(NEU_GESTARTET_SCHLUESSEL);
      melden({ neuGestartet: true });
    }
  } catch {
    /* Ohne sessionStorage keine Erklärung. */
  }

  // Dynamischer Import: das virtuelle Modul liefert vite-plugin-pwa erst im
  // Build/Dev; so bleibt der native Bundle-Pfad unberührt.
  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      if (!laeuft()) return;
      const updateSW: (neuLaden?: boolean) => Promise<void> = registerSW({
        // Neue Version wartet im Hintergrund → Hinweis einblenden (nur im Hauptfenster).
        onNeedRefresh() {
          if (!laeuft()) return;
          l.aktivieren = () => updateSW(true);
          melden({ da: true });
        },
        // Neu geladen wird oben beim Wechsel der Steuerung, an einer Stelle für alle Fenster; die Bibliothek lüde
        // sonst ein zweites Mal.
        onNeedReload() {},
        onRegisteredSW(_adresse, r) {
          if (!laeuft() || !r) return;
          registrierung = r;
          aktualisieren = updateSW;
          takt = window.setInterval(suchen, SUCHE_MS);
          document.addEventListener("visibilitychange", sichtbarkeit);
          window.addEventListener("online", suchen);
          r.addEventListener("updatefound", gefunden);
        },
      });
    })
    .catch(() => {
      /* SW-Registrierung fehlgeschlagen – App läuft weiter (nur ohne Offline-Cache). */
    });
}

/** Nur für Tests: den Lauf abbauen und den Stand vergessen. */
export function aktualisierungBeenden(): void {
  lauf?.beenden();
  lauf = null;
  stand = { da: false, laedt: false, neuGestartet: false };
  selbstGetippt = false;
  zuhoerer.clear();
}

function abonnieren(z: () => void): () => void {
  zuhoerer.add(z);
  return () => zuhoerer.delete(z);
}
const standLesen = () => stand;

function neuLadenGetippt(): void {
  if (stand.laedt) return;
  selbstGetippt = true;
  melden({ laedt: true });
  neuLadenMitRueckfall(() => lauf?.aktivieren?.(), () => window.location.reload());
}

/** Stand der neuen Fassung für das Hauptfenster; startet den Ablauf beim ersten Einhängen. */
export function useNeueVersion(): NeueVersion {
  useEffect(() => {
    aktualisierungStarten("hauptfenster");
  }, []);
  const s = useSyncExternalStore(abonnieren, standLesen, standLesen);
  return {
    da: s.da,
    laedt: s.laedt,
    neuLaden: neuLadenGetippt,
    spaeter: () => melden({ da: false }),
    neuGestartet: s.neuGestartet,
    verstanden: () => melden({ neuGestartet: false }),
  };
}

export function WebUpdateBanner() {
  const v = useNeueVersion();
  if (v.da) {
    return (
      <div className="update-banner" role="status">
        <p className="update-banner-text">
          <span>{v.laedt ? "Die neue Version wird geladen …" : "Neue Version verfügbar."}</span>
          {/* Gegenprüfung 2026-11-16: Wer hier tippt, erfuhr nicht, dass die anderen Fenster mit neu starten. */}
          {!v.laedt && (
            <>
              {" "}
              <span>„Neu laden“ startet alle Fenster dieser App neu.</span>
            </>
          )}
        </p>
        <span className="update-banner-knoepfe">
          <button type="button" className="primaer" disabled={v.laedt} onClick={v.neuLaden}>
            Neu laden
          </button>
          <button type="button" className="link" onClick={v.spaeter}>Später</button>
        </span>
      </div>
    );
  }
  if (v.neuGestartet) {
    return (
      <div className="update-banner" role="status">
        <p className="update-banner-text">
          Neue Version geladen: Dieses Fenster ist von selbst neu gestartet. Eingaben in einem offenen Dialog wurden nicht übernommen.
        </p>
        <span className="update-banner-knoepfe">
          <button type="button" className="primaer" onClick={v.verstanden}>Verstanden</button>
        </span>
      </div>
    );
  }
  return null;
}

/**
 * Alle Update-Hinweise gebündelt. Heute nur das Web-Update über den Service
 * Worker; das native APK-Update (Android) kommt mit der Capacitor-Hülle dazu.
 */
export function Aktualisierungshinweise() {
  return <WebUpdateBanner />;
}
