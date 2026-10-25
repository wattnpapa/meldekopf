/// <reference types="vite-plugin-pwa/client" />
/**
 * Update-Hinweise der Web-App.
 *
 * Herkunft: Erfassungsbogen `src/app/aktualisierung.tsx` (Commit f2b77f1), auf
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
export function WebUpdateBanner() {
  const [neueVersion, setNeueVersion] = useState(false);
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
      <span>Neue Version verfügbar.</span>
      <button type="button" className="primaer" onClick={() => neuLaden?.()}>Neu laden</button>
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
