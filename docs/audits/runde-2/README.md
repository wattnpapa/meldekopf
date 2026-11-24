# Rollenaudits, Runde 2 (Stand 24.11.2026)

Zweite Prüfrunde der Meldekopf-App, diesmal nach Einsatzort statt nach
Prüfthema: dreimal ein Zugtrupp-Helfer, der die App an einer anderen Stelle
benutzt. Geprüft wurde der Produktionsbuild (`vite build` und `vite preview`,
Port 4173) mit Playwright, Code-Stand `main` (Commit `93ef69d`). Jede Rolle
hat ihre Abläufe in der laufenden App durchgespielt und die Summen gegen eine
Handrechnung geprüft. Die Pfade der Prüfskripte und Bilder lagen außerhalb des
Repos.

Die Berichte sind reine Prüfberichte. Was danach geändert wurde, steht unten.

| Rolle | Bericht | P0 | P1 | P2 | P3 |
| --- | --- | --- | --- | --- | --- |
| Meldekopf | [rolle-meldekopf.md](rolle-meldekopf.md) | 0 | 1 | 9 | 9 |
| Bereitstellungsraum | [rolle-bereitstellungsraum.md](rolle-bereitstellungsraum.md) | 0 | 2 | 7 | 8 |
| UEAL / Zugbefehlsstelle | [rolle-ueal-zugbefehlsstelle.md](rolle-ueal-zugbefehlsstelle.md) | 1 | 2 | 10 | 7 |

Stärke- und Fahrzeugsummen stimmten bei allen drei Rollen in jedem Zustand,
auch nach Abrücken, Rückkehr, Aufteilen, Geräteabgleich und ohne Netz. Der P0
der Runde 1 (Telefon nicht bedienbar) ist behoben.

## P0 und P1: behoben

1. **CSV „Alle Daten" meldet Verpflegung 1 statt der Stärke (P0, UEAL U1).**
   Die Einheitszeile rechnete mit der Personalliste; bei einer
   Schnellerfassung steht dort nur die Führungskraft. Im Test ergab die Spalte
   39 statt 58. Sie rechnet jetzt wie Übersicht-CSV, Lageblatt und Summen
   (`verpflegungLage`, `unterbringungLage`): bei „nur Stärke" aus der Stärke,
   und ohne erfasstes Geschlecht steht bei Unterbringung M/W/D 0 statt 1.
   Test in `bogen-csv.test.ts`.
2. **Am Laptop steht „Übergabe und Abschluss" über der Lage (P1, UEAL U2).**
   Im zweispaltigen Raster ab 72rem fehlte dem Block die Zeile; die
   automatische Platzierung legte ihn nach oben. Er hat jetzt Zeile 5, die
   Verwaltung Zeile 6. Nachgemessen bei 1366 × 768: Summen und Liste bei
   y = 189, der Abschluss-Block bei y = 2449 hinter dem Lagemonitor.
3. **Führungskraft, Erreichbarkeit und Funkrufname nur in den Details (P1,
   UEAL U3).** Karte (auch zugeklappt) und Tabelle zeigen Führung mit
   Rückrufnummer und den Funkrufnamen. Der Funkrufname aus der
   Schnellerfassung (Kontakt der Führungskraft) gilt als Funkrufname der
   Einheit, wenn kein Fahrzeug einen trägt; damit zeigen ihn auch Lagemonitor
   und Tafel. Nach Ablauf der Datenschutzfrist bleibt die Führung leer. Die
   Rechnung liegt in `erreichbarkeit.ts`.
4. **Suche findet kein Fahrzeug und keinen Funkrufnamen (P1,
   Bereitstellungsraum P1-1; P2 Meldekopf, UEAL).** Die Suche greift
   zusätzlich auf Fahrzeugtyp (Kurzform und Name), Sondergerät und den
   Funkrufnamen der Führungskraft. Die Karte nennt die Fahrzeuge in Kurzform,
   die Tabelle unter der Zahl. Personennamen bleiben bewusst draußen.
5. **Von Hand erfasste Einheit lässt sich nicht berichtigen (P1, Meldekopf
   P1-1).** „Angaben berichtigen…" unter „Mehr…" öffnet die Abschnitte der
   Schnellerfassung mit den Angaben der Einheit und legt beim Übernehmen eine
   neue Fassung derselben Einheit ab. Nummer, Eintreffzeit, Auftrag und
   Historie bleiben; die Karte vermerkt „Angaben am Meldekopf berichtigt". Im
   Nachtest blieb die Summe bei 13 und die Zahl der Einheiten bei 2. Treffen
   die berichtigten Angaben eine andere Einheit der Lage, sperrt die
   Übernahme. Nur für die eigene Erfassung (von Hand, nur Stärke).
   `angaben-berichtigen.feature`, `berichtigung.test.tsx`.
6. **Nur ein Status „abgerückt" (P1, Bereitstellungsraum P1-2; P2 UEAL U6,
   Meldekopf P2-5).** Umgesetzt ist der kleinste Schritt ohne neuen Status,
   wie im Bericht vorgeschlagen: Der Filter „Auftrag" bietet die vergebenen
   Aufträge zur Wahl, auch die der Abgerückten, und die Tafel nennt bei
   Abgerückten den Auftrag als Ziel. Ein eigener Zustand für entsandt,
   eingesetzt oder entlassen bleibt eine Produktentscheidung: `PRODUCT.md`
   verweist die Auftragsverfolgung nach S1-Control.

Alle Korrekturen liegen in der App selbst; der geteilte Kern unter `vendor/`
ist unverändert.

Das Startbündel wächst dadurch von 640.760 auf 645.480 Byte und liegt über der
Grenze des Bundle-Budgets (642.929). Das Budget ist nicht angehoben: Ob der
Zuwachs gewollt ist, entscheidet nach ADR-003 (Aufnahmeregel 5), wer den Stand
übernimmt (`npm run bundle-budget -- --setze` mit Begründung im Commit).

## Offen

- Die P2 und P3 der drei Berichte, darunter: Angaben, die die Schnellerfassung
  setzt, ohne dass jemand sie gemacht hat (Zeitraum 08:00–18:00, Führungskraft
  als „männlich / Fleisch"), die unsichtbare angefangene Erfassung, die
  fehlende Kurzmeldung zum Durchgeben, DTG und Absender im Lageblatt,
  Sofortbedarf für Einheiten ohne Bogen, Tastaturbedienung.
- Zu U2: Die Kachel „Gesamt" bricht in der schmalen Seitenspalte weiter in
  eine zweite Zeile um. Sie steht im ersten Bildschirm.
- Nicht geprüft wurden Kamera und Handscanner, echter Druck, die Electron- und
  Android-Hülle und echter Dauerbetrieb.
