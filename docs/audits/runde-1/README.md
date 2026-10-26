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

## P2 und P3: gemeinsame Runde (Stand 26.10.2026)

Die Befunde, die der Erfassungsbogen genauso hat, sind im Meldekopf behoben,
nach Nutzen im Einsatz geordnet. Jede Korrektur hat ein Szenario, das ohne sie
scheitert (gegengeprüft gegen den Stand davor). Alle Korrekturen liegen in der
App selbst; der geteilte Kern ist unverändert.

10. **Lagemonitor ohne Zug und Bedarf, Nachträge als „vor 2 Min" (P2,
    Führung F3, F4).** Die Tabelle hat Zug und Gesamt je Einheit und ist nach
    Eintreffzeit geordnet; darüber stehen eine Bedarfszeile (Verpflegung,
    Ruhezeit, Unterbringung, abweichende Verpflegung mit Warnzeichen) und die
    Stärke je Zug. Eine nachgetragene Einheit steht in den Bewegungen als
    „nachgetragen, da seit 19:55". Szenarien in `lagemonitor.feature`.
11. **Papier-Abgleich ohne Zeitprüfung (P2, Fehler F3).** „Abgleich
    übernehmen" fragt bei Zeiten in der Zukunft wie die Einzelkorrektur an der
    Karte, gesammelt für alle Zeilen. Szenario in `papier-abgleich.feature`.
12. **Browser-Zurück verlässt die App (P2, Fehler F6).** Startseite, Einsatz
    und Erfassung stehen im Verlauf (`history.state`; das Fragment trägt die
    Bogen-Links und bleibt dafür frei). Zurück schließt erst ein offenes
    Fenster, dann geht es Erfassung → Einsatz → Startseite. Szenarien in
    `verlauf.feature`.
13. **„Stärke ändern" per Tastatur (P2, Feld, Handschuh).** Das Fenster hat
    die Zähler der Schnellerfassung, der Fokus liegt auf „Mannschaft:
    erhöhen". Szenario „Stärke ändern geht mit den Zählern".
14. **Tabelle am Telefon mit 22 Spalten (P2, Führung, mobile UI).** Unter
    700 px elf Spalten mit Gesamt neben dem Namen, „Alle 22 Spalten zeigen"
    für den Rest. Szenario „Am Telefon steht die Gesamtstärke neben dem
    Namen".
15. **Weitergabe unter der ganzen Liste (P2 Führung F6, P3 Arbeitsablauf).**
    Unter der Stärke-Summe steht, ob das Lageblatt noch aktuell und der
    Einsatz übergeben ist, mit Sprung zur Ausgabe. Szenario „Neben der Summe
    steht, ob das Lageblatt noch aktuell ist".
16. **„Einsatz-Datei" ist eine PDF, „sichern" doppelt belegt (P2,
    Arbeitsablauf P2-1).** Der Knopf heißt „Einsatz übergeben (PDF mit
    Daten)"; die Quittung sagt, dass die PDF auf dem neuen Gerät über
    „Einsatz importieren…" eingelesen wird und keine Datensicherung des Geräts
    ist. Szenario „Die Übergabe-PDF sagt, wie die Ablösung sie einliest".
17. **Alle Zustände nachts in Bernstein (P2, Nacht 2).** Warnungen tragen
    nachts ein Warnzeichen und Fettschrift, Hinweise stehen ohne Füllung mit
    gestrichelter Kante, Primärknöpfe dunkel mit heller Kante. Szenario in
    `nachtmodus.feature`.
18. **Dialoge ohne Abdunklung im Nachtmodus (P2, Nacht 3).** In Dunkel und
    Nacht dunkelt ein Dialog die Seite zu 75 % ab und liegt eine Stufe heller
    mit heller Kante. Der Scanner war seit Korrektur 1 schon Vollbild.
    Szenario in `nachtmodus.feature`.

Offen im Erfassungsbogen: dieselben Korrekturen. Sie liegen dort in Dateien,
die die Sammlung betreffen und mit Phase 7 zurückgebaut werden; ob sie vorher
noch nachgezogen werden, entscheidet der Plan für Phase 7.

Weiter offen im Meldekopf: die übrigen P3 der Berichte (Lagemonitor-Knopf
„Dunkler" mit 2,94:1, DTG und Absender im Kopf des Lageblatts, eine Stelle
für die Ansichtswahl am Telefon, Einsatzdaten des Lagemonitors bei 1280×720)
und ein Ort für Sicherung und Sammel-PDF außerhalb des Geräts (Analog, A5);
ein zweites Medium bleibt organisatorisch (ISK, M7).
