# Audit Meldekopf – Rolle: THW-Helfer unter Stress (thw-stress-test-user)

Prüfstand wie in den anderen Rollen: http://localhost:5290, Playwright/Chromium, Telefon 390×844 (Touch) und Tablet 768×1024. Nachgestellt habe ich:

- Unterbrechung mitten in der Erfassung durch Neuladen und durch Wechsel zurück in den Einsatz.
- Browser-Zurück.
- Doppeltipp auf „In Einsatz übernehmen“.
- Schnelles Tippen in frisch geöffneten Dialogen.
- Doppelter Scan desselben QR-Codes.
- Abrücken mit Rückgängig.

Screenshots unter `(Prüfstand)/bilder/`.

## Urteil

Vieles ist auf Unterbrechung ausgelegt:

- Eine halb ausgefüllte Erfassung übersteht Neuladen und Seitenwechsel.
- Ein doppelter Tipp auf „In Einsatz übernehmen“ legt nur eine Einheit an.
- Ein zweiter Scan desselben Bogens wird als „Bereits vorhanden – übersprungen“ erkannt.
- „Abrücken“ wirkt sofort und bietet unten eine Quittung mit „Rückgängig“.
- Nach dem Übernehmen sagt die Quittung „Zuletzt abgelegt: … jetzt 1 Einheit, Gesamt 9“.

Unter Zeitdruck auf dem Telefon scheitert der Helfer aber an der Einsatzansicht: Die Hauptknöpfe schlucken Tipps, und Einheitenkarten öffnen sich nicht (P0). Nach einer Unterbrechung kann außerdem eine neue Erfassung unbemerkt mit den Daten der vorigen, unterbrochenen Einheit gefüllt sein (P1).

## Befunde

### P0-1 – Telefon: Tipps auf die Hauptknöpfe gehen verloren, Einheitenkarten öffnen sich nicht

- **Fundstelle / Aufgabe:** Einsatzansicht auf dem Telefon (390×844) mit mindestens einer Einheit. Eine Einheit trifft ein, der Helfer tippt „Einheit manuell erfassen…“ oder „Bogen scannen…“.
- **Beobachtung:**
  - Bei 4 Einheiten in der Liste brauchte „Einheit manuell erfassen…“ 5 Tipps, bis sich die Erfassung öffnete. Die Tipps 1 bis 4 zeigten im sichtbaren Bereich keine Reaktion.
  - Jeder dieser Tipps klappte außerhalb des Bildes die jeweils letzte zugeklappte Einheitenkarte auf.
  - Ursache im Hit-Test: Der unsichtbare Knopf `.karte-aufklappen` jeder Karte liegt mit 390×844 px über dem ganzen ersten Bildschirm.
  - Ein Tipp auf die Karte selbst bewirkt nichts.
  - Das betrifft auch „‹ Startseite“, „Bogen scannen…“, „Bögen einlesen…“ und den Ansicht-Umschalter.
  - Mit 30 Einheiten wären es 31 Tipps (hochgerechnet, nicht nachgestellt).
- **Erwartung der Rolle:** Ein Tipp, eine Wirkung. Ich habe 10 bis 20 Sekunden, nicht mehr.
- **Auswirkung im Einsatz:**
  - Unter Stress tippt der Helfer zwei- oder dreimal, nichts passiert. Er wechselt zu Zettel und Kugelschreiber oder startet die App neu; das hilft nicht, weil die Karten nach dem Laden wieder zugeklappt sind.
  - „Abrücken“ und „Zug zuordnen“ einer bestimmten Einheit sind nicht erreichbar.
  - Durch die Fehltipps klappen unbemerkt fremde Karten auf; wer danach nach unten rollt, steht mitten in den Aktionsknöpfen einer anderen Einheit als gedacht.
- **Empfehlung:** Das Tippziel einer Karte auf die Karte begrenzen und den Aufklapp-Pfeil an der Karte zeigen (siehe Befund P0-1 der Neulingsrolle; dort auch die vermutete Ursache).
- **Verifikation:** Telefon-Viewport, `gesaet: true`. Jeder erste Tipp auf einen Hauptknopf löst ihn aus, ein Tipp auf Karte Nr. 1 öffnet Nr. 1. Als Gherkin-Szenario mit 390×844.
- **Nachstellweg:** `seite({width:390,height:844,gesaet:true})`, dann fünfmal `touchscreen.tap` auf die Mitte von „Einheit manuell erfassen…“. Die Erfassung ist erst beim 5. Tipp offen. Nach jedem Tipp steht bei einer Karte mehr `aria-expanded=true`.

### P1-1 – Nach einer Unterbrechung öffnet „Einheit manuell erfassen…“ kommentarlos die alte, halb fertige Erfassung

- **Fundstelle / Aufgabe:** Ein Helfer beginnt Einheit A (Ort Bremen, Bergungsgruppe, Stärke 1/2/6, Führungskraft „Schulz“). Er wird unterbrochen und tippt „‹ Einsatz …“. Später tippt er (oder ein Kollege) „Einheit manuell erfassen…“ für die nächste Einheit B.
- **Beobachtung:**
  - Die Erfassung öffnet mit allen Werten von A.
  - Der sichtbare erste Bildschirm zeigt nur leere Felder für Eintreffzeit, Nr. und Zug sowie „Organisation THW“. Die übernommenen Werte von A stehen weiter unten.
  - Weder die Einsatzansicht noch der Kopf der Erfassung weist auf eine „angefangene Erfassung“ hin.
  - „Erfassung verwerfen…“ steht ganz unten.
  - Dass die Werte Neuladen und Seitenwechsel überstehen, ist gewollt und gut.
- **Erwartung der Rolle:** Entweder ein leeres Formular für B oder deutlich oben: „Angefangene Erfassung: Bremen Bergungsgruppe, 1/2/6 – weiter / verwerfen“.
- **Auswirkung im Einsatz:** Unter Zeitdruck trägt der Helfer oben Nr. und Zug für B ein und tippt „In Einsatz übernehmen“. In der Lage steht dann B mit Name und Stärke von A, also eine falsche Einheit und eine falsche Stärke in der Summe.
- **Annahme (nicht geprüft):** Liegen mehr als fünf Minuten zwischen Beginn und Übernahme und ist keine Eintreffzeit eingetragen, fragt die App nach der Uhrzeit (laut Hilfetext). Ob diese Frage den Fehler aufdeckt, habe ich nicht nachgestellt. Bei kurzer Unterbrechung oder eingetragener Eintreffzeit greift sie ohnehin nicht.
- **Empfehlung:** Ein offener Entwurf wird an „Einheit manuell erfassen…“ sichtbar (z. B. „Erfassung fortsetzen: Bremen …“), und beim Öffnen steht oben, wessen Daten schon drinstehen, mit „Neu beginnen“.
- **Verifikation:** Szenario „Erfassung beginnen, zurück, erneut öffnen“. Oben in der Erfassung steht der Name der angefangenen Einheit, und es gibt einen Ein-Tipp-Weg zu einem leeren Formular.
- **Nachstellweg:**
  1. Leeres Gerät, neue Sammlung, „Einheit manuell erfassen…“.
  2. Ort „Bremen“, Typ „Bergungsgruppe“, Stärke und Name ausfüllen.
  3. „‹ Einsatz …“ tippen, dann wieder „Einheit manuell erfassen…“: Alle Werte sind da, oben kein Hinweis.

### P2-1 – Browser-Zurück verlässt die App, statt eine Ebene zurückzugehen

- **Fundstelle / Aufgabe:** Erfassung oder Einsatzansicht; der Helfer nutzt die Zurück-Geste oder -Taste.
- **Beobachtung:** Die Adresse bleibt in allen Ansichten `http://localhost:5290/`, die App legt keine Verlaufseinträge an. `page.goBack()` aus der Erfassung führte aus der App heraus (`about:blank`) statt zur Einsatzansicht. Die Daten blieben erhalten, der Entwurf ebenfalls.
- **Erwartung der Rolle:** Zurück bringt mich in den Einsatz, nicht aus der App.
- **Auswirkung im Einsatz:** Kein Datenverlust, aber Neustart und Suche nach dem Einsatz, also 10 bis 20 Sekunden Orientierung.
- **Annahme (nicht geprüft):** Die Android-Hülle fängt die Zurück-Taste möglicherweise selbst ab.
- **Empfehlung:** Zurück-Geste führt eine Ebene zurück (Erfassung → Einsatz → Startseite).
- **Verifikation:** In Browser und Android-Hülle: Zurück aus der Erfassung landet in der Einsatzansicht desselben Einsatzes.

### P2-2 – Scan-Fenster wirkt halb fertig

- **Fundstelle:** „Bogen scannen…“ (ohne Kamera).
- **Beobachtung:**
  - Keine sichtbare Überschrift und eine leere weiße Fläche oben.
  - Keine Abdunklung: Die Knöpfe der Seite darunter sind sichtbar, reagieren aber nicht.
  - „Fertig“ steht neben „QR aus Bild einlesen…“ in derselben Gestaltung.
  - Der Handscanner-Weg funktioniert (nachgestellt per Tastatureingabe der Bogen-URL: Dialog „Meldung von … empfangen“).
- **Auswirkung im Einsatz:** Mit nur einem Blick auf den Bildschirm ist nicht klar, ob gerade gescannt wird. Tipps auf die sichtbaren Knöpfe darunter bleiben wirkungslos.
- **Annahme:** Das Kamerabild ist ebenso ungestaltet (nicht geprüft, keine Kamera).
- **Empfehlung / Verifikation:** Wie Befund P2-3 der Neulingsrolle.

### P3-1 – Prellschutz schluckt Tipps ohne sichtbares Zeichen

- **Fundstelle:** Frisch geöffnete Dialoge (geprüft an „Neue Einsatz-Sammlung anlegen“).
- **Beobachtung:** Ein Tipp auf „Einsatz anlegen“ etwa 0,3 s nach dem Öffnen blieb ohne Wirkung; der zweite Tipp nach weiteren 1,2 s wirkte. Der Knopf sah in der Sperrzeit voll aktiv aus (nicht `disabled`, Deckkraft 1).
- **Auswirkung:** Bei geübten, schnellen Helfern gibt es einzelne „tote“ Tipps. Der Schutz gegen Durchtippen ist sinnvoll, aber unsichtbar.
- **Empfehlung:** Die Sperrzeit sichtbar machen (z. B. kurz gedämpft).
- **Verifikation:** Screenshot 200 ms nach dem Öffnen eines Dialogs zeigt den Sperrzustand.

### P3-2 – Viel Fließtext an Stellen, an denen schnell gehandelt wird

- **Beobachtung:**
  - Erfassung: drei Zeilen zur Eintreffzeit-Regel über dem ersten Abschnitt.
  - Ausgabe: ein Absatz von 6 bis 7 Zeilen vor „Nur neue Bögen seit dem letzten Export“.
  - Ergebnis nach „Bögen einlesen…“: ein Bericht mit mehreren langen Absätzen.
- **Auswirkung:** Wer nur 10 bis 20 Sekunden hat, liest das nicht. Die Bedienung bleibt trotzdem möglich.
- **Empfehlung:** Kernsatz zuerst, Rest aufklappbar.

## Abschluss

- **Aufgabe geschafft:** mit Umwegen. Auf dem Tablet ja; auf dem Telefon nein für alle Aktionen an einzelnen Einheiten.
- **Fremde Hilfe nötig:** ja auf dem Telefon (die Ursache der „toten“ Tipps ist ohne Hinweis nicht erkennbar), nein auf dem Tablet.
- **Größtes Missverständnis:** Die App „hängt“, dabei klappt jeder Tipp unsichtbar eine Einheitenkarte auf.
- **Größtes Einsatzrisiko:** Nach einer Unterbrechung wird eine neue Einheit mit Name und Stärke der vorher angefangenen übernommen, und die Lage zählt falsch.
- **Top-Priorität für die nächste Iteration:** Tippziel der Einheitenkarten auf die Karte begrenzen (P0-1). Direkt danach einen offenen Entwurf sichtbar machen (P1-1).

Zahl der Befunde: P0: 1 · P1: 1 · P2: 2 · P3: 2
