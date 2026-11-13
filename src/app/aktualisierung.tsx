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
 * Geändert gegenüber der Herkunft (2026-11-13): Die offene App sucht selbst
 * stündlich nach einer neuen Fassung, und das Fenster des Lagemonitors folgt
 * ihr (`useNeueVersion`, Hinweis dort in `lagemonitor-ui.tsx`).
 */

import { useEffect, useRef, useState } from "react";
import { istNativ } from "./nativ";

/**
 * Web-Selbst-Update über den Service Worker (nur Browser). Der SW lädt eine
 * neue Version im Hintergrund und wartet dann; der Hinweis meldet das dezent
 * und lädt das Hauptfenster erst auf Klick neu (kein Auto-Reload, damit eine
 * gerade geführte Sammlung nicht unterbrochen wird). In der Capacitor-/Electron-App
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

/** So oft fragt eine offene App, ob eine neue Fassung bereitliegt: eine kleine Datei der eigenen Herkunft (`sw.js`). */
export const SUCHE_MS = 60 * 60_000;
/** Nach so langer Pause (Fenster im Hintergrund, Gerät im Ruhezustand) fragt sie beim Zurückkommen gleich nach. */
export const SUCHE_NACH_PAUSE_MS = 10 * 60_000;

export interface NeueVersion {
  /** Eine neue Fassung wartet, oder sie ist schon aktiv, während diese Seite noch die alte zeigt. */
  da: boolean;
  /** „Neu laden" getippt: Die neue Fassung wird geladen. */
  laedt: boolean;
  /** Die neue Fassung aktivieren und diese Seite neu laden. */
  neuLaden: () => void;
  /** Den Hinweis ausblenden; er kommt mit dem nächsten Laden oder der nächsten Suche ({@link SUCHE_MS}) wieder. */
  spaeter: () => void;
}

/**
 * Service Worker registrieren (nur im Web), nach neuen Fassungen suchen und melden, ob eine wartet.
 *
 * Gesucht wird beim Laden, stündlich ({@link SUCHE_MS}), nach einer längeren Pause beim Zurückkommen und wenn das Netz
 * wiederkommt. Vorher fragte eine offene App nie selbst nach: Ein Fernseher oder Laptop, der den ganzen Einsatz lief,
 * erfuhr von einer neuen Fassung erst beim nächsten Neuladen. Ohne Netz scheitert die Frage still.
 *
 * `fernseher`: Das Fenster des Lagemonitors folgt einer neuen Fassung von selbst. Sobald sie aktiv ist, aus welchem
 * Fenster auch immer, lädt es neu: Es ist reine Anzeige, verloren geht nichts, und mit der alten Fassung fehlten ihm
 * nachgeladene Bausteine (die Tafel). Vorher blieb es alt, auch wenn man es selbst neu lud, solange das Hauptfenster
 * offen war. Das Hauptfenster lädt nur neu, wenn dort „Neu laden" getippt wurde; ist die neue Fassung anderswo aktiv
 * geworden, zeigt es den Hinweis, statt eine laufende Eingabe zu verwerfen.
 */
export function useNeueVersion(fernseher: boolean): NeueVersion {
  const [da, setDa] = useState(false);
  const [laedt, setLaedt] = useState(false);
  // Was „Neu laden" tut: die wartende Fassung aktivieren (SKIP_WAITING) oder, ist sie schon aktiv, nur neu laden.
  const aktivieren = useRef<(() => Promise<void> | void) | null>(null);
  // In diesem Fenster wurde „Neu laden" getippt: Den Wechsel der Steuerung beantwortet es mit Neuladen.
  const selbst = useRef(false);
  // Aktiviert die wartende Fassung (SKIP_WAITING), sobald die Registrierung steht.
  const aktualisieren = useRef<((neuLaden?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    // Kein SW in der nativen App (Capacitor iOS/Android) oder im Electron-Build:
    // die App liegt dort schon lokal, und capacitor://- bzw. file://-Kontexte
    // tragen keinen brauchbaren Service Worker.
    if (istNativ()) return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    // Nur über http/https registrieren (nicht unter file://, capacitor://).
    if (!/^https?:$/.test(window.location.protocol)) return;

    let abbestellt = false;
    let takt: number | undefined;
    let registrierung: ServiceWorkerRegistration | undefined;
    let zuletzt = Date.now();
    // Wartet nach der Suche eine Fassung, die schon einmal gemeldet und mit „Später" weggelegt wurde, steht der Hinweis
    // wieder da: Eine neue Meldung gibt es nur für eine neue Fassung.
    const wartet = () => {
      if (!registrierung?.waiting || !navigator.serviceWorker.controller) return;
      if (!aktivieren.current) aktivieren.current = () => aktualisieren.current?.(true);
      setDa(true);
    };
    const suchen = () => {
      zuletzt = Date.now();
      void registrierung?.update().then(wartet, () => {
        /* Ohne Netz oder bei einem Fehler des Servers: beim nächsten Mal. */
      });
    };
    const zurueck = () => {
      if (document.visibilityState === "visible" && Date.now() - zuletzt >= SUCHE_NACH_PAUSE_MS) suchen();
    };

    // Die neue Fassung übernimmt die Steuerung. Nicht bei der ersten Installation (clientsClaim, vorher keine Steuerung).
    const container = navigator.serviceWorker;
    let vorher = container.controller;
    const wechsel = () => {
      const war = vorher;
      vorher = container.controller;
      if (!war) return;
      if (fernseher || selbst.current) {
        window.location.reload();
        return;
      }
      aktivieren.current = () => window.location.reload();
      setDa(true);
    };
    container.addEventListener("controllerchange", wechsel);

    // Dynamischer Import: das virtuelle Modul liefert vite-plugin-pwa erst im
    // Build/Dev; so bleibt der native Bundle-Pfad unberührt.
    import("virtual:pwa-register")
      .then(({ registerSW }) => {
        if (abbestellt) return;
        const updateSW: (neuLaden?: boolean) => Promise<void> = registerSW({
          // Neue Version wartet im Hintergrund → Hinweis einblenden.
          onNeedRefresh() {
            aktivieren.current = () => updateSW(true);
            setDa(true);
          },
          // Ob neu geladen wird, entscheidet der Wechsel der Steuerung oben; von selbst lüde jedes Fenster neu, das den
          // Hinweis einmal bekommen hat, auch mitten in einer Eingabe.
          onNeedReload() {},
          onRegisteredSW(_adresse, r) {
            if (abbestellt || !r) return;
            registrierung = r;
            aktualisieren.current = updateSW;
            takt = window.setInterval(suchen, SUCHE_MS);
            document.addEventListener("visibilitychange", zurueck);
            window.addEventListener("online", suchen);
          },
        });
      })
      .catch(() => {
        /* SW-Registrierung fehlgeschlagen – App läuft weiter (nur ohne Offline-Cache). */
      });

    return () => {
      abbestellt = true;
      window.clearInterval(takt);
      container.removeEventListener("controllerchange", wechsel);
      document.removeEventListener("visibilitychange", zurueck);
      window.removeEventListener("online", suchen);
    };
  }, [fernseher]);

  return {
    da,
    laedt,
    neuLaden: () => {
      if (laedt) return;
      setLaedt(true);
      selbst.current = true;
      neuLadenMitRueckfall(() => aktivieren.current?.(), () => window.location.reload());
    },
    spaeter: () => setDa(false),
  };
}

export function WebUpdateBanner() {
  const v = useNeueVersion(false);
  if (!v.da) return null;

  return (
    <div className="update-banner" role="status">
      <span>{v.laedt ? "Die neue Version wird geladen …" : "Neue Version verfügbar."}</span>
      <button type="button" className="primaer" disabled={v.laedt} onClick={v.neuLaden}>
        Neu laden
      </button>
      <button type="button" className="link" onClick={v.spaeter}>Später</button>
    </div>
  );
}

/**
 * Alle Update-Hinweise gebündelt. Heute nur das Web-Update über den Service
 * Worker; das native APK-Update (Android) kommt mit der Capacitor-Hülle dazu.
 */
export function Aktualisierungshinweise() {
  return <WebUpdateBanner />;
}
