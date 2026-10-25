/**
 * Die Kopfnavigation als React-Fassung — dieselbe Leiste, die auch über den
 * statischen Seiten steht (src/app/kopfnav.ts ist die gemeinsame Quelle).
 *
 * Herkunft: Erfassungsbogen `src/app/kopfnav-ui.tsx` (Commit f2b77f1); nur das
 * Logo nennt diese App. Wandert in Phase 1 nach @bos/oberflaeche.
 *
 * Nur Wissen, keine Aktionen: „Neuer Einsatz…" und die Eingänge bleiben auf
 * der Startseite. Begründung in kopfnav.ts.
 *
 * Nur im Web-Browser: In der installierten Fassung (Desktop-App, Android, iOS)
 * ist die Themenwelt nicht das, wofür die App geöffnet wurde — dieselbe Weiche
 * wie beim erklärenden Startseitentext (imWebBrowser() in nativ.ts). Im
 * Start-Gerüst von index.html erledigt das die Klasse `.als-app` aus der
 * Frühweiche im Kopf, damit die Leiste dort nicht bis zum Mount aufblitzt.
 */

import { KOPFNAV_LOGO, kopfnavAufbau } from "./kopfnav";

export function Kopfnav() {
  // Leerer Dateiname: Die App gehört keiner Rubrik der Themenwelt an — kein
  // Eintrag steht auf „aktiv", das Logo führt ohnehin hierher zurück.
  const eintraege = kopfnavAufbau("");
  return (
    // `div`, nicht `header`: Der Kopfbalken darunter ist der Seitenkopf der
    // App — zwei Banner-Landmarken übereinander kündigten ihn doppelt an
    // (NavHuelle in kopfnav.ts).
    <div className="kopfnav">
      <div className="kopfnav-inner">
        <a href="./" className="kopfnav-logo">
          {KOPFNAV_LOGO}
        </a>
        <nav className="kopfnav-links" aria-label="Hauptnavigation">
          {eintraege.map((e) =>
            e.unter ? (
              <span key={e.href} className={e.nurBreit ? "kopfnav-eintrag nur-breit" : "kopfnav-eintrag"}>
                <a href={e.href}>{e.label}</a>
                <span className={e.zweispaltig ? "kopfnav-unter kopfnav-unter-breit" : "kopfnav-unter"}>
                  {e.unter.map((u) => (
                    <a key={u.href} href={u.href}>
                      {u.label}
                    </a>
                  ))}
                </span>
              </span>
            ) : (
              <a key={e.href} href={e.href} className={e.nurBreit ? "nur-breit" : undefined}>
                {e.label}
              </a>
            ),
          )}
        </nav>
      </div>
    </div>
  );
}
