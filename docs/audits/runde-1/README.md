# Rollenaudits, Runde 1 (Stand 25.10.2026)

Erste Prüfrunde der Meldekopf-App (Phase 6 der Übernahme). Zwölf Berichte,
je einer pro Rolle, gegen den Produktionsbuild (`vite build` und
`vite preview`, Port 5290), Code-Stand `main` nach Phase 5 mit Fensterabgleich
(Commit `4719c15`). Der Prüfstand legte eine Sammlung „Hochwasser Weser" mit
vier Einheiten auf das Gerät; ihre Bögen tragen den Stand 14.05.2025. Daher
kommen die Marken „ANONYMISIERT" und „älter als 24 h", die kein Befund sind.
Die Pfade der Prüfskripte und Bilder sind durch „(Prüfstand)" ersetzt; sie
lagen außerhalb des Repos.

Die Berichte sind reine Prüfberichte. Was danach geändert wurde, steht unten.

| Rolle | Bericht | P0 | P1 | P2 | P3 |
| --- | --- | --- | --- | --- | --- |
| Helfer ohne Einweisung | [neuer-nutzer.md](neuer-nutzer.md) | 1 | 0 | 3 | 3 |
| Helfer im Feld | [feldtauglichkeit.md](feldtauglichkeit.md) | 1 | 1 | 6 | 3 |
| Arbeitsablauf | [arbeitsablauf.md](arbeitsablauf.md) | 1 | 1 | 2 | 4 |
| Fehler und Wiederanlauf | [fehler-und-wiederanlauf.md](fehler-und-wiederanlauf.md) | 1 | 1 | 4 | 1 |
| Zerstörende Handlungen | [zerstoerende-handlungen.md](zerstoerende-handlungen.md) | 0 | 1 | 0 | 4 |
| Offline und Speicher | [offline-und-speicher.md](offline-und-speicher.md) | 0 | 0 | 2 | 2 |
| Stress und Unterbrechung | [stress-und-unterbrechung.md](stress-und-unterbrechung.md) | 1 | 1 | 2 | 2 |
| Handschuh-Bedienung | [handschuh-bedienung.md](handschuh-bedienung.md) | 1 | 1 | 4 | 2 |
| Nacht und Sicht | [nacht-und-sicht.md](nacht-und-sicht.md) | 0 | 1 | 2 | 3 |
| Führungssicht | [fuehrungssicht.md](fuehrungssicht.md) | 1 | 1 | 4 | 3 |
| Analog first | [analog-first.md](analog-first.md) | 1 | 1 | 3 | 2 |
| Mobile-UI (allgemein) | [mobile-ui.md](mobile-ui.md) | 1 | 1 | 2 | 2 |

Die Zahlen zählen je Bericht. Viele Befunde haben mehrere Rollen unabhängig
gefunden; hinter den neun P0 steht eine einzige Ursache.

## P0 und P1: behoben

1. **Telefon nicht bedienbar (P0, neun Rollen).** Unter 700 px Breite lag
   der unsichtbare Aufklappknopf jeder zugeklappten Einheitenkarte über dem
   ganzen Bildschirm; „Bogen scannen…", „Einheit manuell erfassen…",
   „‹ Startseite" und die Ansichtswahl klappten nur eine Karte auf, weiter
   unten und außer Sicht. Ursache war die Übernahme der Stilregeln in Phase 2:
   Das Skript erkannte Klassen aus Template-Strings nicht (`kompakt`), und ein
   Teilstring-Vergleich hielt `.scanner` für vorhanden, weil `dialog.scanner`
   dastand. Nachgezogen sind alle Regeln des Erfassungsbogens, deren Klassen
   die übernommenen Komponenten setzen, auch in ihren Media- und
   Container-Fassungen, dazu die Token `--rolle-*` und `--qr-ruhezone`. Damit
   hat auch der Scanner wieder sein Vollbild (P2 „Scan-Fenster ohne Rahmen").
   Szenario „Am Telefon erreichen die Knöpfe über der Einheitenliste ihren
   Tipp" (scheitert ohne die Regeln).
2. **Schnellerfassung zu lang, erster Tipp verloren (P1, Feld, Handschuh,
   Analog, mobile UI).** Kontaktstellen und übergeordnete Ebenen sind in der
   Schnellerfassung zugeklappt; die Stärke steht bei 390 px auf y = 1201 statt
   1796, die Seite ist 2705 statt 3324 px hoch. Die OV-Ergänzung beim
   Verlassen des Ortsfelds erscheint als feste Leiste mit „Rückgängig" statt
   als Zeile über den Zählern, der erste Tipp auf „Führer: erhöhen" zählt.
3. **Unterbrochene Erfassung öffnet sich wortlos (P1, Stress, Arbeitsablauf).**
   „Einheit manuell erfassen…" fragt jetzt „Diese Erfassung fortsetzen" oder
   „Verwerfen und neue Einheit erfassen" (im Erfassungsbogen R2-E1).
   Szenario „Eine unterbrochene Erfassung fragt vor dem Fortsetzen".
4. **Zug vom Zettel nicht vereinheitlicht (P1 Führung, P2 Analog).** „2.Zug"
   aus der Schnellerfassung wird „2. Zug" wie bei „Zug zuordnen" und im
   Papier-Abgleich. Derselbe Fehler steht in `eintrag-zeiten.ts` des
   Erfassungsbogens.
5. **Aufteilen setzt die Eintreffzeit neu (P1, Fehler, Zerstörende
   Handlungen).** Beide Teile behalten die Eintreffzeit der Einheit
   (`eintreffzeitErben`); der Kern legt sie als neue Einträge mit
   `empfangenAm = jetzt` an. Derselbe Fehler steht im Erfassungsbogen. Die
   Rückgängig-Leiste nach dem Aufteilen gibt es (R2-D6); im Build nach den
   Korrekturen ist sie nachgeprüft sichtbar. Warum die Prüfer sie nicht
   sahen, ist nicht geklärt.
6. **Nachtmodus über die Kopfleiste nicht wählbar (P1, Nacht).** Folge von 1.
7. **Rückfrage „Name der Einheit fehlt" (P2, mehrere Rollen).** Heißt jetzt
   „Ort der Einheit fehlt" wie das Feld.
8. **Zwei Fenster, eine Erfassung, zwei Einheiten (P2, Fehler F4).** Hat ein
   anderes Fenster die Erfassung geändert oder übernommen, sperrt „In Einsatz
   übernehmen" und sagt, was zu klären ist. Szenario „Eine im anderen Fenster
   übernommene Erfassung wird nicht doppelt angelegt" (scheitert ohne die
   Sperre).
9. **Offline-Stand nur auf der Startseite (P2, Offline O1).** Solange der
   Vorrat lädt oder abgebrochen ist, steht dieselbe Zeile als feste Warnung
   auch in der Einsatzansicht, mit „Jetzt neu laden".

## P2 und P3: offen

Die meisten offenen Befunde betreffen Verhalten, das der Erfassungsbogen
genauso hat, und gehören in eine gemeinsame Runde beider Apps:
Lagemonitor ohne Zug und Bedarf und mit „vor 2 Min" für nachgetragene
Einheiten, Weitergabe unter der ganzen Einheitenliste, Tabellenansicht am
Telefon mit 22 Spalten, „Stärke ändern" per Tastatur statt Zählern,
Browser-Zurück verlässt die App, „Einsatz-Datei" ist eine PDF und „sichern"
ist doppelt belegt, Papier-Abgleich ohne Zeitprüfung, Dialoge ohne
Abdunklung im Nachtmodus, alle Zustände nachts in derselben Bernsteinfarbe.

Nur den Meldekopf betrifft: Sicherung und Sammel-PDF landen auf dem Gerät
selbst (Analog, A5); ein zweites Medium bleibt organisatorisch (ISK, M7).
