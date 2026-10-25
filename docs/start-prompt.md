# Start-Prompt für die erste Entwicklungs-Session

Zum Kopieren in eine neue Claude-Code-Session im Repo `wattnpapa/meldekopf`.
Der Prompt setzt voraus, dass die Session den Erfassungsbogen lesend
erreichen kann (Repo `wattnpapa/erfassungsbogen` hinzufügen oder lokal
klonen).

---

Wir bauen die Meldekopf-App: das zweite Produkt der Familie Erfassungsbogen,
Meldekopf, S1-Control. Sie übernimmt die Einsatz-Sammlung aus dem
Erfassungsbogen (https://github.com/wattnpapa/erfassungsbogen) in eine eigene
App für Meldeköpfe, Bereitstellungsräume und kleine Führungsstellen im ELW.

Lies zuerst, in dieser Reihenfolge, und fasse mir danach in zehn Zeilen
zusammen, was du verstanden hast, bevor du etwas anlegst:

1. `CLAUDE.md` (feste Regeln)
2. `PRODUCT.md` (Nutzer, Zweck, Abgrenzung, Prinzip 6: ein Gerät, eine Weitergabe)
3. `docs/architektur.md` (Arc42, besonders Kapitel 5, 8.2 und die ADRs 001 bis 008)
4. `docs/funktionsumfang.md` (was übernommen wird, mit Herkunftsdateien)
5. `docs/uebernahme-aus-erfassungsbogen.md` (welche Datei wohin, Phasen 0 bis 7)

Dann klone den Erfassungsbogen mit Submodulen neben dieses Repo
(`git clone --recurse-submodules https://github.com/wattnpapa/erfassungsbogen.git`)
und lies dort `docs/arc42-architektur.md` Kapitel 5 und 8, `docs/entwicklung.md`
und `CLAUDE.md`. Das ist die Referenz für alles, was hier übernommen wird.

Heute ist Phase 0 (Gerüst) dran:

- Repo-Struktur wie der Erfassungsbogen: `src/app/`, `public/`, `scripts/`,
  `features/`, `electron/`, `vendor/` mit den vier Kern-Submodulen auf den
  Pins aus `docs/uebernahme-aus-erfassungsbogen.md` Abschnitt A.
- `package.json` (Name `meldekopf`, `appId` `de.meldekopf.app`, `productName`
  „Meldekopf", `publish.url` auf dieses Repo), `vite.config.ts` mit CSP und
  PWA, `tsconfig.json`, `vitest.config.ts`, `cucumber.mjs`, `.github/workflows/ci.yml`
  und `release.yml` nach dem Muster des Erfassungsbogens. Übernimm die
  Skripte `bundle-budget`, `kern-kopien`, `sbom`, `precache-aufteilung`.
- Eine lauffähige, leere App: Startseite mit dem Text aus einem neuen
  `start-inhalt.ts` (Zweck, Eingänge, Weitergabe, Produktfamilie; kein
  erfundener Inhalt), Anzeigemodus-Schalter, Fußzeile mit Pflichtangaben.
  Dialogschicht, Anzeigemodus und Kopfnavigation darfst du in Phase 0 als
  Kopie aus dem Erfassungsbogen einbinden, mit Herkunft im Kopfkommentar;
  in Phase 1 wandern sie in `@bos/oberflaeche`.
- Eigenes Icon und eigene Grundfarbe: Vorschlag machen, nicht die Farbe des
  Erfassungsbogens nehmen. Begründung in `docs/architektur.md` Kapitel 8.1.
- `scripts/bundle-budget.json` nach dem ersten Build setzen.
- GitHub-Pages-Deploy im `release.yml` mit `CNAME` meldekopf.app. Ob die Domain
  registriert ist, kläre ich; baue es so, dass ein anderer Domainname ein
  Einzeiler ist.

Regeln für diese und alle weiteren Sessions:

- Übernahme vor Neubau. Wo der Erfassungsbogen etwas hat, wird es mit Tests
  und Kopfkommentar übernommen; die Audit-Begründungen (R2-D4, R4-W1 …)
  bleiben im Kommentar.
- Der Kern unter `vendor/` wird hier nicht geändert.
- Nach jeder Phase die Spalte **Stand** in `docs/funktionsumfang.md` und
  `docs/uebernahme-aus-erfassungsbogen.md` nachziehen und
  `docs/architektur.md` dort anpassen, wo der Ist-Stand vom Soll abweicht.
- Deutsch in Code, Kommentaren, Commits. Kein Modellname in Commits oder Code.
- Commits klein und benannt nach dem, was sie tun; Push nach jeder grünen
  Teilaufgabe auf den Arbeitszweig.
- Der Erfassungsbogen wird in dieser Phase nicht angefasst. Erst nach
  Phase 5 beginnt dort der Abbau; einzige Ausnahme ist das kleine Gegenstück
  zu „Vollständig erfassen" in Phase 4.

Wenn etwas in der Doku dem Code des Erfassungsbogens widerspricht, gilt der
Code; vermerke den Widerspruch in der Doku und sag es mir.

---

## Hinweise für spätere Phasen

Phase 1 beginnt mit zwei neuen Repos (`bos-eeb-satz`, `bos-oberflaeche`,
Arbeitstitel); die Vorlage für Struktur, README mit Aufnahmeregeln, `ci.yml`,
`tsconfig` und ESLint-Regeln ist `vendor/bos-meldekopf`. Für
`bos-oberflaeche` sind die Regeln aus ADR-004 statt der Kern-Regel 2 zu
verwenden (React und DOM erlaubt).

Phase 2 ist die erste, in der die App Nutzdaten hält: dann ISK und DSFA aus
den Vorlagen des Erfassungsbogens (`docs/informationssicherheitskonzept.md`,
`docs/datenschutz-folgenabschaetzung.md`) anlegen und auf den Meldekopf
zuschneiden. Die Datenkategorien D2 bis D2o aus dem ISK dort sind nahezu
vollständig die dieser App.
