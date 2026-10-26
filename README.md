# Meldekopf

Eintreffende Einheiten erfassen, zählen, weitermelden. Für Meldeköpfe,
Bereitstellungsräume und kleine Führungsstellen im ELW.

> **Stand:** 2026-10-25, Phasen 0 bis 6 umgesetzt (Phase 6: Rollenaudit, alle P0/P1 behoben):
> Einsatz-Sammlungen anlegen und führen, Summen, Einheitenliste und -tabelle,
> Zug, Abrücken, Aufteilen und Zusammenführen, Papierkorb, Fristen,
> Lagemonitor, Ausgabe als Sammel-PDF, Lageblatt, CSV und Excel, Datensicherung
> (auch die des Erfassungsbogens). Bögen kommen per Kamera, USB-Handscanner,
> Foto, Datei, PDF mit QR-Code, Einsatz-Datei oder geteiltem Link herein; ein
> Link fragt, in welche Sammlung der Bogen gehört, oder reicht ihn an den
> Erfassungsbogen weiter. Eine Einheit ohne Bogen nimmt die Schnellerfassung auf (Stärke, Führungskraft, Fahrzeuge, Eintreffzeit vom Zettel); für den vollständigen Bogen öffnet sie den Erfassungsbogen. Dialoge, Anzeigemodi, Kopfnavigation und
> Design-Token liefert `@bos/oberflaeche`, die Ausgabe ohne Oberfläche wächst
> in `@bos/eeb-satz`. Die Doku unter `docs/` beschreibt, was gebaut wird und
> wie; der Funktionsumfang wird aus der Einsatz-Sammlung des
> [Erfassungsbogens](https://github.com/wattnpapa/erfassungsbogen) übernommen
> (Reihenfolge in [docs/uebernahme-aus-erfassungsbogen.md](docs/uebernahme-aus-erfassungsbogen.md), Abschnitt G).

## Die Produktfamilie

| App | Für wen | Was sie tut |
| --- | --- | --- |
| [Erfassungsbogen](https://github.com/wattnpapa/erfassungsbogen) (erfassungsbogen.app) | Eine Einheit | Füllt ihren Einheiten-Erfassungsbogen aus, druckt ihn als PDF im Papier-Layout, gibt ihn per QR-Code, Link oder Datei weiter. |
| **Meldekopf** (dieses Repo) | Meldekopf, Bereitstellungsraum, kleine Führungsstelle | Sammelt die Bögen eintreffender Einheiten unter einem Einsatz, zählt Stärke und Sofortbedarf laufend zusammen, zeigt die Lage auf dem Fernseher und gibt alles geschlossen an die nächste Führungsstelle weiter. |
| [S1-Control](https://github.com/wattnpapa/S1-Control) | Führungsstelle mit vollem Stab | Liest die Einsatz-Datei des Meldekopfs ein und führt die Lage über Tage, Geräte und Sachgebiete weiter. |

Alle drei sprechen dasselbe Format (`@bos/eeb-format`) und teilen sich die
Logik der Einsatz-Sammlung (`@bos/meldekopf`). Die Grenze zwischen Meldekopf
und S1-Control: Der Meldekopf ist **ein Gerät, offline, ohne Anmeldung**, und
sein Ergebnis ist eine Weitergabe. Alles, was mehrere Geräte, Verlauf über
Tage oder Aufträge braucht, ist S1-Control.

## Was die App können wird

- Bögen eintreffender Einheiten aufnehmen: Kamera-Scan, USB-Handscanner,
  Bilderstapel (Fotos, Screenshots, ganzer Ordner), Datei, PDF, Link.
- Einheit ohne Bogen in Minuten erfassen: nur Stärke, Führungskraft,
  Fahrzeuge; Bogen drucken, fertig.
- Laufende Summen über alle anwesenden Einheiten, mit Zwischensummen je Zug;
  Karten- und Tabellensicht mit Suche, Qualifikations- und Kraftfahrer-Filter.
- Folgemeldungen als Historie je Einheit; Schichtübergabe-Diff („Stärke
  12 → 9, Fahrzeug abgemeldet").
- Abrücken, Zug zuordnen, Bogen aufteilen und zusammenführen, Papier-Abgleich.
- Lagemonitor für den Fernseher am Gerät: Funkrufname, Einsatzname, DTG,
  Einsatzdauer, Stärke, Bedarf, Stärke je Zug, Einheitentabelle mit Zug und
  Gesamt, ohne Personennamen.
- Weitergabe: Sammel-PDF, CSV-Übersicht für die Lagekarte, CSV mit allen
  Daten, Excel-Liste im Format „Oldenburg", Einsatz-Datei für S1-Control.
  Wahlweise nur, was seit der letzten Weitergabe dazugekommen ist.
- Papierkorb, Datenschutzfristen, Datensicherung; Feld- und Nacht-Modus.
- Kein Server, keine Anmeldung, keine Cloud. Alles bleibt auf dem Gerät.

Die vollständige Liste steht in [docs/funktionsumfang.md](docs/funktionsumfang.md).

## Dokumentation

| Dokument | Inhalt |
| --- | --- |
| [PRODUCT.md](PRODUCT.md) | Nutzer, Zweck, Positionierung, Prinzipien, Abgrenzung |
| [docs/funktionsumfang.md](docs/funktionsumfang.md) | Funktionsumfang, nach Bereichen, mit Herkunft im Erfassungsbogen |
| [docs/architektur.md](docs/architektur.md) | Architektur nach Arc42: Kontext, Bausteine, Laufzeit, Verteilung, Querschnitt, Entscheidungen |
| [docs/uebernahme-aus-erfassungsbogen.md](docs/uebernahme-aus-erfassungsbogen.md) | Welche Module woher kommen, was in den Kern wandert, Reihenfolge der Umsetzung |
| [docs/audits/runde-1/README.md](docs/audits/runde-1/README.md) | Rollenaudits (zwölf THW-Rollen) gegen den Produktionsbuild, Befunde und ihr Stand |
| [docs/start-prompt.md](docs/start-prompt.md) | Einstieg für die erste Entwicklungs-Session |
| [CLAUDE.md](CLAUDE.md) | Hinweise für Claude Code |

## Plattformen

Web-App (PWA) unter meldekopf.erfassungsbogen.app über GitHub Pages; Desktop-App
(Electron) mit Installern für Windows x64/arm64 und Linux (deb, pacman) in den
GitHub Releases; macOS ist wie beim Erfassungsbogen vorerst still. Die
Android-App (Capacitor, `android/`) baut in der CI; als signierte APK erscheint
sie im Release, sobald die Secrets `ANDROID_KEYSTORE_BASE64` und
`ANDROID_KEYSTORE_PASSWORD` im Repo hinterlegt sind (Schlüsselalias
`meldekopf`). Für den App Link braucht `public/.well-known/assetlinks.json`
dann noch den SHA-256-Fingerabdruck dieses Schlüssels.

## Entwicklung

```bash
git clone --recurse-submodules https://github.com/wattnpapa/meldekopf.git
cd meldekopf
npm ci                 # Node 24 (.nvmrc); mit npm 10 scheitert die Auflösung der Submodule, dann: npx npm@11 ci
npm run dev            # http://localhost:5173
npm run build          # dist/ für GitHub Pages, mit CNAME aus src/app/adressen.ts
npm test               # Vitest: Logik (Node) und Oberfläche (jsdom)
npm run test:e2e       # Cucumber + Playwright gegen den produktiven Build
npm run kern-kopien    # genau eine Kopie je Kern-Baustein (ADR-003)
npm run bundle-budget  # gebauten Stand gegen scripts/bundle-budget.json messen
npm run sbom           # Stückliste als CycloneDX
```

Der Kern unter `vendor/` wird hier nicht geändert (ADR-003); das gilt auch
für die beiden Bausteine `vendor/bos-eeb-satz` (Ausgabe ohne Oberfläche,
ADR-005) und `vendor/bos-oberflaeche` (Oberfläche, ADR-004). Änderungen daran
gehen in deren Repo und kommen per gepinntem Commit hierher. Der Domainname
steht genau einmal in `src/app/adressen.ts`; Kopfnavigation und Startseiten-
text werden aus `src/app/kopfnav.ts` und `src/app/start-inhalt.ts` erzeugt
(`npm run kopfnav`, `npm run start-inhalt`), die Tests schlagen an, wenn
`index.html` veraltet ist.

## Lizenz

[EUPL-1.2](LICENSE). Die taktischen Zeichen aus `@bos/taktische-zeichen`
stehen unter CC BY 4.0 (© Jonas Köritz); bei Weitergabe ist die Namensnennung
mitzuführen.
