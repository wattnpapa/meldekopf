# Meldekopf

Eintreffende Einheiten erfassen, zählen, weitermelden. Für Meldeköpfe,
Bereitstellungsräume und kleine Führungsstellen im ELW.

> **Stand:** Projektanlage am 2026-10-25. Es gibt noch keinen Code. Die Doku
> unter `docs/` beschreibt, was gebaut wird und wie; der Funktionsumfang
> wird aus der Einsatz-Sammlung des
> [Erfassungsbogens](https://github.com/wattnpapa/erfassungsbogen) übernommen.

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
  Einsatzdauer, Stärke, Einheitentabelle ohne Personennamen.
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
| [docs/start-prompt.md](docs/start-prompt.md) | Einstieg für die erste Entwicklungs-Session |
| [CLAUDE.md](CLAUDE.md) | Hinweise für Claude Code |

## Plattformen (geplant)

Web-App (PWA) unter meldekopf.app über GitHub Pages, Desktop-App (Electron:
Windows x64/arm64, macOS, Linux), Android-App (Capacitor). Derselbe Aufbau wie
beim Erfassungsbogen, damit Build, Release und Härtung übernommen werden können.

## Lizenz

[EUPL-1.2](LICENSE). Die taktischen Zeichen aus `@bos/taktische-zeichen`
stehen unter CC BY 4.0 (© Jonas Köritz); bei Weitergabe ist die Namensnennung
mitzuführen.
