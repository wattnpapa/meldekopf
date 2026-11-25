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

Das Startbündel wuchs dadurch von 640.760 auf 645.480 Byte; das Bundle-Budget
ist dafür angehoben (ADR-003, Aufnahmeregel 5).

## P2: behoben (Stand 24.11.2026)

Gebündelt nach Ursache; jede Korrektur hat einen Test, die mit Oberfläche ein
Szenario (`lage-nachfuehren.feature`, `rollenaudit-runde2-p2.test.tsx`).

7. **Die Schnellerfassung setzt Angaben, die niemand gemacht hat (Meldekopf
   P2-7, UEAL U5, U14).** Der Einsatzzeitraum bleibt leer („nicht angegeben")
   statt „heute 08:00–18:00". Rolle, Geschlecht und Ernährung der
   Ansprechperson stehen in der CSV „Alle Daten" leer; die Details nennen
   keine Rolle und beim Geschlecht „ohne Angabe". Der Satz „die 1 Namen
   stammen aus der Meldung davor" entfällt bei einer Erstmeldung.
8. **„Bedarf nicht erfasst" hängt am Fahrzeug (UEAL U4).** Die Marke gilt für
   jede Schnellerfassung ohne Sofortbedarf, mit oder ohne Fahrzeug.
9. **Sofortbedarf lässt sich nicht nachtragen (Bereitstellungsraum P2-4).**
   „Bedarf ändern…" an der Karte, nach dem Muster von „Stärke ändern…": neue
   Fassung, Vermerk, „Rückgängig".
10. **Fahrzeuge, Abgerückte und Stärke je Organisation fehlen bei der Summe
    (Meldekopf P2-1, Bereitstellungsraum P2-2, UEAL U12).** Eine Zeile unter
    den Kacheln nennt Fahrzeuge, die Stärke je Organisation und die
    Abgerückten mit Stärke und Fahrzeugen. Dazu der Filter „Organisation";
    die Summenzeile der Tabelle rechnet die Auswahl.
11. **Keine Kurzmeldung zum Durchgeben (Meldekopf P2-6).** „Stärkemeldung…"
    zeigt eine Zeile mit DTG, Einheiten, Stärke und Fahrzeugen zum Vorlesen
    und Kopieren.
12. **Angefangene Erfassung unsichtbar (Meldekopf P2-3, offen aus Runde 1).**
    Unter der Summe steht „Erfassung angefangen, noch nicht in der Lage" mit
    „Fortsetzen…".
13. **„Einheit manuell erfassen…" hinter „Weitere Wege" (Meldekopf P2-2).**
    Die Zeile bleibt am Telefon offen, solange die jüngste Meldung von Hand
    kam.
14. **Organisationswechsel löscht den getippten Ort (Meldekopf P2-4).** Der
    Ort bleibt stehen.
15. **Suche verknüpft Wörter über Felder hinweg (Bereitstellungsraum P2-1).**
    Eine Wortfolge in Anführungszeichen muss als Ganzes in einem Feld stehen.
    Ohne Anführungszeichen sucht die App wie bisher.
16. **Verpflegungszahl heißt je Ansicht etwas anderes (Bereitstellungsraum
    P2-3).** Lagemonitor und Tafel nennen Anforderung und Anwesende wie die
    Einsatzansicht; das Lageblatt nennt vegetarisch und vegan.
17. **Nach einer Stunde warnt jede Karte dauerhaft (Bereitstellungsraum
    P2-5).** „Stand bestätigen" setzt das Alter neu, mit Vermerk und
    „Rückgängig".
18. **Abgleich-Meldungen nennen nur den Ort (UEAL U8).** Führt die Sammlung
    mehrere Einheiten aus einem Ort, steht der volle Name der Einheit da.
19. **Tastatur (UEAL U9).** In der Schnellerfassung steht der Cursor mit
    Tastatur im Ort, Strg+Eingabetaste übernimmt; „/" springt in die Suche.
20. **Suche über Funkrufname (Meldekopf P2-8)** und **Auftrag als Filter
    (Meldekopf P2-5, UEAL U6)** sind mit den P1 erledigt.

## Offen

P2, bewusst nicht umgesetzt, weil sie eine Produktentscheidung oder einen
eigenen Entwurf brauchen:

- **Einzelperson in der Schnellerfassung, Ort nicht als Pflicht (Meldekopf
  P2-9).** Berührt den Schlüssel der Einheit und die Zählung.
- **Eigener Zustand für eingesetzt, Ruhe, abgelöst (UEAL U6) und
  Mehrfachauswahl „Markierte abrücken…" (Bereitstellungsraum P2-7).** Die
  Auftragsverfolgung verweist `PRODUCT.md` nach S1-Control. Der Tipp-Schutz
  nach einem Statuswechsel ist unverändert.
- **Verlauf über den ganzen Einsatz (UEAL U7).** Das Einsatztagebuch gehört
  nach S1-Control.
- **Mehrere angefangene Erfassungen (UEAL U10).** Es bleibt bei einem
  Entwurf je Gerät; er ist jetzt sichtbar (Punkt 12).
- **Feste Zeile mit Summe beim Blättern (UEAL U11), dichtere Karten und
  Tabelle (Bereitstellungsraum P2-6), Tafel als Vorgabe des Lagemonitors
  (UEAL U13).** Gestaltungsfragen mit Folgen für Telefon und Fernseher.
- Die Zwischensumme je Auftrag (Meldekopf P2-5) gibt es nur über den Filter
  und die Summenzeile der Tabelle.

Außerdem:

- Die P3 der drei Berichte.
- Ein von Hand auf „kein Bedarf" gestellter Sofortbedarf trägt weiter die
  Marke „Bedarf nicht erfasst": Das Format unterscheidet „nicht gefragt" und
  „nichts nötig" nicht.
- Zu U2: Die Kachel „Gesamt" bricht in der schmalen Seitenspalte weiter in
  eine zweite Zeile um. Sie steht im ersten Bildschirm.
- Nicht geprüft wurden Kamera und Handscanner, echter Druck, die Electron- und
  Android-Hülle und echter Dauerbetrieb.
