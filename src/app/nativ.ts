/**
 * Native Brücke (Capacitor): Plattform erkennen.
 *
 * Herkunft: Erfassungsbogen `src/app/nativ.ts` (Commit f2b77f1), in Phase 0
 * auf die Plattform-Erkennung gekürzt. Der Rest — In-App-QR-Scanner, Dateien
 * über das System-Share-Sheet teilen (AirDrop, Quick Share, Dateien-App),
 * App-Links empfangen — kommt unverändert mit den Eingängen (Phase 3) und der
 * Weitergabe (Phase 5), zusammen mit den Capacitor-Plugins, an denen er hängt.
 *
 * Im Browser ist istNativ() false und die Web-Pfade bleiben unverändert.
 */

import { Capacitor } from "@capacitor/core";

export function istNativ(): boolean {
  return Capacitor.isNativePlatform();
}

/** Aktuelle Laufzeit-Plattform: "ios" | "android" | "web". */
export function plattform(): string {
  return Capacitor.getPlatform();
}

/**
 * Läuft die Oberfläche in einem echten Browser-Tab (oder als PWA) — und nicht
 * in einer installierten Fassung? Gegenstück zu den drei App-Wegen:
 *   - Capacitor (iOS/Android) meldet sich über die native Brücke,
 *   - Electron lädt das Bundle im Paket über file://.
 * Bewusst NICHT über „Electron/" in der Gerätekennung: die tragen auch
 * gewöhnliche Browser-Hüllen auf Chromium-Basis, die den Text zeigen sollen.
 * Der Electron-Dev-Lauf gegen den Vite-Server gilt damit als Browser — ein
 * Fall, den nur die Entwicklung kennt.
 * Gebraucht für Inhalte, die es nur im Web gibt: der erklärende Text der
 * Startseite richtet sich an Suchmaschinen und an Erstbesucher — in der
 * installierten App ist die Frage „was ist das hier?" längst beantwortet.
 * Muss mit der Frühweiche in index.html (Klasse `als-app`) zusammenpassen.
 */
export function imWebBrowser(): boolean {
  if (typeof window === "undefined") return false;
  if (istNativ()) return false;
  return window.location.protocol !== "file:" && window.location.protocol !== "capacitor:";
}

/**
 * Ist ein System-Share-Sheet erreichbar? Nativ immer (Capacitor Share), im
 * Browser nur mit Web Share API. Desktop-Chrome unter Linux und Electron haben
 * keine — dort bleiben Zwischenablage und Download die Wege.
 */
export function shareSheetVerfuegbar(): boolean {
  return istNativ() || (typeof navigator !== "undefined" && typeof navigator.share === "function");
}
