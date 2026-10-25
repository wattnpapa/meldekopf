# Audit: THW-Feldnutzer (thw-field-user-reviewer)

**Prüfstand:** Produktions-Build http://localhost:5290 (vite preview), Playwright/Chromium headless, Touch-Emulation.
Telefon 390×844 (Hauptprüfung), Tablet quer 1180×820, Lagemonitor-Fenster 1920×1080. Vorgelegte Sammlung „Hochwasser Weser" (4 Einheiten) bzw. leeres Gerät.
Skripte: `(Prüfstand)`, Bilder: `(Prüfstand)/bilder/`.

**Aufgaben (Szenarien):**
1. Neue Einsatz-Sammlung anlegen (leeres Gerät) – **geschafft: ja**.
2. Eintreffende Einheit ohne Bogen erfassen (Einheit, Stärke, übernehmen) – **mit Schwierigkeiten** (Stärke um 1 falsch übernommen, siehe P1).
3. Einheit in der Liste öffnen, Abrücken, Details – **Telefon: nein** (Karten lassen sich per Tipp nicht öffnen, siehe P0); **Tablet: ja**.
4. Bogen scannen ohne Kamera (Handscanner-Hinweis, „QR aus Bild") – Dialog verständlich, auf dem Telefon aber nur erreichbar, wenn der P0 nicht greift (getestet per Skript-Klick).
5. Weitergabe/Lagemonitor – Lagemonitor öffnet sich (Tablet) und ist gut lesbar; PDF/CSV/Excel-Erzeugung nicht inhaltlich geprüft.

**Mentales Modell des Helfers:** „Oben sehe ich die Summen und die großen Knöpfe: Scannen, Erfassen. Darunter die Liste der Einheiten; tippe ich eine an, sehe ich Details und kann sie abrücken lassen."

---

## [P0] Telefon: unsichtbare Fläche verschluckt alle Tipps im oberen Bildschirmbereich der Einsatzansicht
**Evidence:** Observed
**Where:** Einsatzansicht auf Telefon (getestet 390 und 600 px Breite, alle Anzeigemodi), sobald mindestens eine Einheit in der Kartenansicht steht. Betroffen: „‹ Startseite", Ansicht-Umschalter Standard/Feld/Dunkel/Nacht im Kopf, „Bogen scannen…", „Einheit manuell erfassen…", „Bögen einlesen…", „Bedarf", „Zur Einheitenliste ↓". Ab 768 px Breite (Tablet) tritt es nicht auf.
**Beobachtung:** Der Aufklapp-Knopf jeder Einheitenkarte (`.karte-aufklappen`, Name „Aufklappen: Zeiten, Details und Aktionen") liegt nicht über seiner Karte, sondern misst 390×844 px ab Seitenanfang (0,0). Die Karte hat keinen positionierten Bezugsrahmen (`li.einheit-zeile` → `position: static`). `elementFromPoint` liefert für alle zehn oben genannten Bedienelemente den Kartenknopf statt des Knopfes selbst.
- Touch-Tipp auf „Bogen scannen…" (195,465): kein Dialog, keine Navigation; stattdessen klappt unsichtbar **Karte Nr. 4** (außerhalb des Bildschirms) auf.
- Touch-Tipp auf „Nacht" im Kopf: Ansicht bleibt Standard; nächste Karte klappt auf.
- Touch-Tipp auf die Karte Nr. 1 selbst (dort, wo sie sichtbar ist, Seiten-y ≈ 1097): **nichts passiert** – die Karte liegt unterhalb der 844 px, die die Knöpfe abdecken. Erst nach vier Fehltipps oben (alle vier Karten aufgeklappt, Knöpfe weg) funktionieren die Knöpfe wieder.
**Nachstellweg:** Prüfstand `seite({width:390,height:844,gesaet:true})` → `page.touchscreen.tap(195,465)` → kein Scan-Dialog, `aria-expanded`-Zustand der Karte 4 wechselt; Skripte s4–s7.
**Field-user reaction:** „Der Knopf geht nicht." Tippt mehrfach, wechselt das Gerät oder gibt auf. Dass nebenbei Karten aufklappen, sieht er nicht.
**Problem:** Die Hauptaufgaben (Einheit aufnehmen, Bogen scannen, zurück zur Startseite, Nachtmodus) sind auf dem Telefon nicht verlässlich auslösbar; Einheiten lassen sich nicht öffnen, also kein Abrücken, keine Details, kein Zug.
**Operational impact:** Meldekopf mit Handy kann eintreffende Einheiten nicht aufnehmen und nicht abrücken lassen → Stärke-Lage falsch oder Rückfall auf Papier.
**Recommendation:** Den Aufklapp-Knopf auf die Fläche seiner eigenen Karte begrenzen (Karte als Bezugsrahmen) und mit einem Regressions-Szenario auf Telefonbreite absichern (Tipp auf „Bogen scannen…" öffnet den Scan-Dialog; Tipp auf Karte Nr. 1 klappt Karte Nr. 1 auf).
**Retest:** Auf 390×844 mit ≥1 Einheit jeden Knopf im oberen Bereich per Touch antippen; `elementFromPoint` an deren Mittelpunkt muss den Knopf selbst liefern; Tipp auf jede Karte klappt genau diese Karte auf.

## [P1] Vorschlagsliste im Feld „Ort der Einheit" verschluckt den nächsten Tipp – Stärke wird falsch übernommen
**Evidence:** Observed
**Where:** „Einheit manuell erfassen…" → Feld „Ort der Einheit (Pflicht)" → danach Stärke-Zähler „+".
**Beobachtung:** „Wardenburg" eingetippt, Vorschlag „Wardenburg · OWAR · 26203 Wardenburg" erscheint. Erster Tipp auf „Führer: erhöhen" wird **nicht gezählt**; stattdessen übernimmt die App den Vorschlag und füllt ungefragt OV-Kürzel, Telefon, E-Mail sowie zwei übergeordnete Ebenen (RB Bremen, LV Bremen, Niedersachsen) ein. Die Seite wächst dabei um rund 700 px, der Stärke-Block springt aus dem Bild. Ergebnis im Durchlauf: geplant 1/1/3/5, übernommen 0/1/3/4 (Gesamt der Sammlung 21 → 25 statt 26). Mit einem Ort ohne Vorschlag („Xyzdorf") zählt der erste Tipp korrekt.
**Nachstellweg:** Skript s10/s11: Feld antippen, „Wardenburg" tippen, Stärke-„+" antippen → Werte vorher `0|0|0|0`, nachher `0|0|0|0` plus OV/RB/LV-Daten; zweiter Tipp → `1|0|0|1`.
**Field-user reaction:** „Ich habe doch + gedrückt." Bemerkt den Verlust oft nicht, weil der Bildschirm nach dem Sprung Kontaktdaten statt Stärke zeigt.
**Problem:** Eingabe geht ohne Rückmeldung verloren; Kontaktdaten werden ohne bewusste Auswahl übernommen.
**Operational impact:** Falsche Stärke in Summe, Lageblatt und Weitergabe.
**Recommendation:** Vorschlag nur durch ausdrückliches Antippen übernehmen; Tipp außerhalb schließt die Liste und führt die getippte Aktion trotzdem aus; keine großen Layout-Sprünge ohne Nutzerhandlung.
**Retest:** Ort mit Vorschlag eintippen, sofort „+" bei Führer → Führer = 1, keine übergeordneten Ebenen automatisch eingefügt.

## [P2] Pflichtfeld heißt „Ort der Einheit", Fehlermeldung sagt „Name der Einheit fehlt"
**Evidence:** Observed
**Where:** Schnellerfassung, „In Einsatz übernehmen" ohne Eingaben → Dialog „Name der Einheit fehlt … Zum Namensfeld"; der Fokus landet im Feld „Ort der Einheit (Pflicht)". Der Einleitungstext sagt „Es reichen der Name der Einheit und die Stärke".
**Field-user reaction:** Sucht ein Feld „Name" – findet „Organisationsname (optional)", „Einheitstyp", „Ort der Einheit". Ohne den Knopf „Zum Namensfeld" unklar.
**Operational impact:** Zeitverlust, Fehleingaben (Einheitsname im falschen Feld).
**Recommendation:** Ein Begriff durchgängig (Beschriftung, Einleitung, Fehlermeldung), z. B. „Ortsverband/Ort (= Name der Einheit)".
**Retest:** Neuer Nutzer findet ohne Hilfe das Pflichtfeld in <10 s.

## [P2] Stärke steht erst nach rund 1800 px – unter Zugehörigkeit/Kontaktstellen
**Evidence:** Observed
**Where:** Schnellerfassung Telefon: Stärke-Block bei Seiten-y ≈ 1800 px (Seite 3302 px lang), davor Eintreffzeit, Nr., Zug, Organisation, Einheitstyp, Ebene, Ort, Kürzel, Telefon, E-Mail, übergeordnete Ebene.
**Problem/Impact:** Die Kernangabe (laut Einleitung „Name und Stärke reichen") erfordert drei Bildschirmhöhen Scrollen; mit Vorschlag (P1) springt sie noch weiter weg.
**Recommendation:** Name/Ort und Stärke direkt oben; Kontaktstellen eingeklappt darunter.
**Retest:** Stärke-Zähler im ersten Bildschirm nach Öffnen sichtbar.

## [P2] „Stärke ändern" verlangt Tastatur statt der Zähler aus der Erfassung
**Evidence:** Observed
**Where:** Karte → „Mehr…" → „Stärke ändern…": drei Textfelder (inputmode numeric, 332×44 px), keine −/+-Zähler.
**Impact:** Uneinheitliche Bedienung; Tastatur verdeckt Teile des Dialogs (Tastatur selbst **nicht verifiziert**, headless).
**Recommendation:** Dieselben Zähler wie in der Schnellerfassung.

## [P2] Tabellenansicht auf dem Telefon: Gesamtspalte nicht sichtbar
**Evidence:** Observed
**Where:** Einsatzansicht → „Tabelle" (390 px): Tabelle 1619 px breit in 356 px Rahmen; sichtbar Einheit, Zug (teilweise überdeckt), F, U, M; Gesamt nur nach seitlichem Wischen; Summenzeile zeigt „4 / 3 / 14" ohne 21.
**Recommendation:** Gesamt direkt neben dem Namen oder feste Summenspalte.

## [P2] Sprunglink „Weitergeben, Lageblatt, Export ↓" liegt unter der festen Ansicht-Leiste
**Evidence:** Observed
**Where:** Einsatzansicht Telefon, Startposition: Link bei y 775–822, feste Leiste „Ansicht: Standard" bei y 787–844; Tipp auf die Linkmitte trifft die Leiste.
**Recommendation:** Inhaltsende/Abstand unter der festen Leiste freihalten.

## [P2] Offline-Bereitschaft auf der Startseite – nicht verifiziert
**Evidence:** Not verified
**Where:** Startseite: „⏳ Wird für den Offline-Betrieb geladen: 0,0 von 5,1 MB — bitte mit Netz geöffnet lassen." Im Prüfstand waren Service Worker gesperrt, daher bleibt die Anzeige bei 0,0 – kein App-Fehler belegbar.
**Retest manuell:** Auf echtem Gerät bis „bereit" laden, Flugmodus, Neustart, Erfassung durchführen.

## [P3] Dialoge ohne abgedunkelten Hintergrund
**Evidence:** Observed – Scan-Dialog ist modal, aber `::backdrop` ist transparent (`rgba(0,0,0,0)`) und der Dialog hat keinen Rahmen; die Seite dahinter („Bögen einlesen…") schaut unten heraus.
**Impact:** Unklar, ob man noch „auf der Seite" ist. **Recommendation:** Hintergrund abdunkeln, Dialog rahmen.

## [P3] Angefangene Schnellerfassung ist in der Einsatzansicht nicht erkennbar
**Evidence:** Observed – Entwurf bleibt nach „‹ Einsatz" und nach Neuladen erhalten (gut), die Einsatzansicht zeigt aber keinen Hinweis „angefangene Erfassung fortsetzen".

## [P3] Tablet quer: Summenkachel „Gesamt" bricht allein in die zweite Zeile
**Evidence:** Observed (1180×820) – die wichtigste Zahl steht vereinzelt unter den Teilsummen.

---

### Was gut funktioniert (bei Umbau erhalten)
- Abrücken ohne Rückfrage, dafür Hinweisleiste „Abgerückt 20:48 … Rückgängig" (mind. 40 s sichtbar) – schnell und korrigierbar.
- Doppeltipp-Schutz: Rückt nach „Abrücken" ein anderer Knopf unter den Finger („Zug zuordnen"), wird der zweite Tipp mit „Einen Moment …" abgefangen.
- Löschdialoge erklären Folgen konkret („Nummern ändern sich: Nr. 2–4 rücken auf …", „30 Tage im Papierkorb"); „Alle Daten löschen" verlangt Häkchen plus Knopf und bietet „Vorher Sicherung erstellen…".
- Leere Pflichtangabe beim Übernehmen: klarer Dialog mit Knopf „Zum Namensfeld".
- Schnellerfassungs-Entwurf überlebt Zurück und Neuladen.
- Lagemonitor: großer, kontraststarker TV-Bildschirm.

### Comprehension check
- Orientation: understood
- Next action: uncertain (Telefon: Hauptknöpfe reagieren nicht, P0)
- System status: understood (Bestätigung „Zuletzt abgelegt: … jetzt 5 Einheiten, Gesamt 25")
- Error recovery: understood (Rückgängig, Papierkorb) – auf dem Telefon aber durch P0 blockiert
- Field suitability: unsuitable auf dem Telefon (bis P0 behoben); limited auf dem Tablet
