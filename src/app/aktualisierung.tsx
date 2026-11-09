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
 */

import { useEffect, useState } from "react";
import { istNativ } from "./nativ";

/**
 * Web-Selbst-Update über den Service Worker (nur Browser). Der SW lädt eine
 * neue Version im Hintergrund und wartet dann; dieses Banner meldet das dezent
 * und lädt die Seite erst auf Klick neu (kein Auto-Reload, damit eine gerade
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

export function WebUpdateBanner() {
  const [neueVersion, setNeueVersion] = useState(false);
  const [laedt, setLaedt] = useState(false);
  // updateSW(true) aktiviert den wartenden SW (SKIP_WAITING) und lädt neu.
  const [neuLaden, setNeuLaden] = useState<(() => void) | null>(null);

  useEffect(() => {
    // Kein SW in der nativen App (Capacitor iOS/Android) oder im Electron-Build:
    // die App liegt dort schon lokal, und capacitor://- bzw. file://-Kontexte
    // tragen keinen brauchbaren Service Worker.
    if (istNativ()) return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    // Nur über http/https registrieren (nicht unter file://, capacitor://).
    if (!/^https?:$/.test(window.location.protocol)) return;

    let abbestellt = false;
    // Dynamischer Import: das virtuelle Modul liefert vite-plugin-pwa erst im
    // Build/Dev; so bleibt der native Bundle-Pfad unberührt.
    import("virtual:pwa-register")
      .then(({ registerSW }) => {
        if (abbestellt) return;
        const updateSW = registerSW({
          // Neue Version wartet im Hintergrund → Banner einblenden.
          onNeedRefresh() {
            setNeuLaden(() => () => updateSW(true));
            setNeueVersion(true);
          },
        });
      })
      .catch(() => {
        /* SW-Registrierung fehlgeschlagen – App läuft weiter (nur ohne Offline-Cache). */
      });

    return () => { abbestellt = true; };
  }, []);

  if (!neueVersion) return null;

  return (
    <div className="update-banner" role="status">
      <span>{laedt ? "Die neue Version wird geladen …" : "Neue Version verfügbar."}</span>
      <button
        type="button"
        className="primaer"
        disabled={laedt}
        onClick={() => {
          if (laedt) return;
          setLaedt(true);
          neuLadenMitRueckfall(() => neuLaden?.(), () => window.location.reload());
        }}
      >
        Neu laden
      </button>
      <button type="button" className="link" onClick={() => setNeueVersion(false)}>Später</button>
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
