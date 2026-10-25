# Hinweise für Claude Code

## Was dieses Repo ist

Die Meldekopf-App: zweites Produkt der Familie Erfassungsbogen, Meldekopf,
S1-Control. Sie übernimmt die Einsatz-Sammlung aus dem Erfassungsbogen
(<https://github.com/wattnpapa/erfassungsbogen>). Lies zuerst
[README.md](README.md), [PRODUCT.md](PRODUCT.md) und
[docs/architektur.md](docs/architektur.md); den Funktionsumfang beschreibt
[docs/funktionsumfang.md](docs/funktionsumfang.md), den Weg der Übernahme
[docs/uebernahme-aus-erfassungsbogen.md](docs/uebernahme-aus-erfassungsbogen.md).

## Feste Regeln

- **Sprache** der Oberfläche, des Codes, der Kommentare, Commits und Doku:
  Deutsch. Fachbegriffe sind verbindlich (Stärke x/y/z//g, Sofortbedarf,
  Meldekopf, Bereitstellungsraum, Funkrufname, Zug, DTG).
- **Kein Server, keine Anmeldung, keine Cloud.** Jede Funktion muss ohne Netz
  vollständig funktionieren. Einzige erlaubte Fremdverbindung ist die
  cookielose Reichweitenmessung (GoatCounter), gespiegelt in der CSP.
- **Der geteilte Kern** liegt als Git-Submodule unter `vendor/` und wird
  **nicht** hier geändert: `@bos/eeb-format`, `@bos/meldekopf`,
  `@bos/vokabulare`, `@bos/taktische-zeichen`. Änderungen am Kern gehen in
  dessen Repo und werden hier per gepinntem Commit übernommen (ADR-003 des
  Erfassungsbogens, sechs Aufnahmeregeln). Modulgenau importieren
  (`@bos/eeb-format/model`), nie über den Sammel-Einstieg.
- **Schema-Abwärtskompatibilität ist Pflicht.** Alte QR-Codes, Dateien und
  Sammlungen (`eeb.einsaetze.v1` aus dem Erfassungsbogen) bleiben lesbar.
- **Keine Systemdialoge** (`prompt`, `confirm`, `alert`): eigene Dialogschicht.
- **Kein Tailwind, kein Router-Framework, kein Redux.** Eigene Design-Token,
  Hash-Routing, `useState`.
- **Übernahme vor Neubau.** Was im Erfassungsbogen existiert und dort acht
  Audit-Runden überstanden hat, wird übernommen, nicht neu erfunden. Die
  Herkunft (Datei im Erfassungsbogen) steht im Kopfkommentar der Datei.

## Begleitdokumente bei Änderungen mitziehen

Die Doku beschreibt den Soll-Stand und wird mit dem Code zum Ist-Stand. Bei
jeder Änderung prüfen, ob ein Dokument nachzuziehen ist, und das im selben
Arbeitsschritt tun:

| Auslöser | Dokument |
| --- | --- |
| Funktion übernommen, neu, entfallen | `docs/funktionsumfang.md` (Spalte Stand), `README.md` |
| Bausteine, Abhängigkeiten, Submodul-Pins | `docs/architektur.md` Kap. 5, 8.6 |
| `localStorage`-Schlüssel, Fristen, Löschwege | `docs/architektur.md` Kap. 8.2, später ISK/DSFA |
| CSP, Electron-Härtung, Berechtigungen | `docs/architektur.md` Kap. 8.3 |
| Netzverbindungen, neue Fremd-Hosts | `docs/architektur.md` Kap. 3.2 und 8.3; **immer datenschutzrelevant** |
| Plattform, Release, Signierung | `docs/architektur.md` Kap. 7 |
| Modul aus dem Erfassungsbogen übernommen | `docs/uebernahme-aus-erfassungsbogen.md` (Spalte Stand) |

Sobald die App Nutzdaten hält, bekommt sie wie der Erfassungsbogen ein
Informationssicherheitskonzept und eine Datenschutz-Folgenabschätzung unter
`docs/`; die Vorlagen dort sind die Ausgangsbasis.

## Arbeitsweise

- Tests neben dem Code (`*.test.ts[x]`, Vitest), Verhaltenstests als
  Gherkin auf Deutsch (`features/*.feature`, Cucumber + Playwright gegen den
  produktiven Build). Szenarien aus dem Erfassungsbogen, die die Sammlung
  betreffen, werden mit übernommen.
- Bundle-Budget und Kern-Kopien-Prüfung wie im Erfassungsbogen als CI-Gates.
- Kein Modellname in Commits, PR-Texten oder Code-Kommentaren.
