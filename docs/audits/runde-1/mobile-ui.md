# Mobile UI/UX Audit – Meldekopf-App

**Scope:** Einsatzansicht (Summenzeile, Eingangsknöpfe, Bedarf, Karten, Tabelle, Filter, Export-Bereich), Schnellerfassung, Dialoge (Scanner ohne Kamera, Einsatz löschen, Datensicherung, Nr. schon vergeben), Papier-Abgleich, Startseite.
**Mode:** Live website audit (Produktions-Build http://localhost:5290, Playwright/Chromium mit Touch-Emulation).
**Primary task:** Eintreffende Einheit am Telefon aufnehmen und die Lage (Stärke, Bedarf) ablesen.
**Limitations:** Keine echte Bildschirmtastatur – nachgestellt durch Fokus + Verkleinern des Viewports auf 360×400 (die App setzt dabei `tastatur-offen`). „Große Systemschrift" nachgestellt über Chromium-Standardschrift 24 px (CDP `Page.setFontSizes`), die App schaltet dabei auf `schrift-gross`. Keine Safe-Area-/Notch-Emulation, kein iOS-Safari. Service Worker im Prüfstand gesperrt.

Schweregrad-Zuordnung zum P-Schema: Critical = P0, High = P1, Medium = P2, Low = P3.

## Priority findings

### 1. Unsichtbare Tippfläche der Einheitenkarten überdeckt den ganzen ersten Bildschirm — Critical (P0)
**Where:** Einsatzansicht bei ≤ 600 px Breite (gemessen 320×640, 360×740, 390×844, 430×932, 600×960), Karten zugeklappt (Standard am Telefon).
**Observed:** `button.karte-aufklappen` jeder zugeklappten Karte ist `position:absolute; inset:0`, der Elternteil `li.einheit-zeile.kompakt` ist `position:static`. Gemessene Box jedes dieser Knöpfe: x 0, y 0, 390×844 (bzw. 360×740) – also der gesamte erste Viewport des Dokuments, unabhängig von der Kartenposition. `elementFromPoint` liefert auf „‹ Startseite" (50,34), Ansicht „Feld" (140,115), „Bogen scannen…" (195,465), „Einheit manuell erfassen…" (195,535), „Bedarf" (100,680) und „Zur Einheitenliste ↓" (60,756) den Aufklapp-Knopf von Karte Nr. 4. Echter Touch-Tipp auf „Bogen scannen…": kein Dialog, Karte 4 (außerhalb des Sichtbereichs) klappt auf; der Scanner-Dialog öffnet erst beim 5. Tipp (4 Einheiten; je Tipp verliert die nächste Karte ihr `kompakt`). Nur die fest positionierte Leiste „Ansicht: Standard" unten bleibt erreichbar. Nicht betroffen: 700 px und breiter, Telefon quer (740×360, 844×390) – dort sind die Karten offen.
**Why it matters:** Die primären Aktionen des Hauptbildschirms reagieren am Telefon nicht und geben keinerlei sichtbare Rückmeldung. Bei N Einheiten sind N+1 Tipps nötig; nach jeder Rückkehr aus der Schnellerfassung sind die Karten wieder zu.
**Recommendation:** Die Tippfläche an die Karte binden (Karte als Bezugsrahmen der absoluten Positionierung).
**Verification:** 390×844 mit ≥ 4 zugeklappten Karten: `elementFromPoint` auf jedem Kopf-/Eingangsknopf liefert den Knopf selbst; ein Tipp genügt; Karte öffnet nur bei Tipp auf die Karte.

### 2. Schnellerfassung: Stärke erst nach ~2,5 Bildschirmhöhen — High (P1)
**Where:** „Einheit erfassen", 360×740.
**Observed:** Seitenhöhe 3324 px; erstes Stärke-Zählfeld („Führer: erhöhen") bei y = 1796 px. Davor: Eintreffzeit, Nr., Zug, Hilfetext, Organisation, Organisationsname, Einheitstyp, Erklärtext Zugehörigkeit, Ebene, Ort (Pflicht), Kürzel/Telefon, E-Mail, „+ übergeordnete Ebene", „OV/RB/LV-Vorlage". Die feste Fußleiste „In Einsatz übernehmen" (81 px) ist gut, blendet sich bei offener Tastatur aus (geprüft, `tastatur-offen`), das fokussierte Feld bleibt sichtbar (Telefon-Feld bei y 72 von 400).
**Why it matters:** Kernzweck („Es reichen der Name der Einheit und die Stärke") steht ganz unten; jede Erfassung kostet mehrere Wischgesten über Felder, die meist leer bleiben.
**Recommendation:** Name/Ort und Stärke direkt nach Nr./Zug; Zugehörigkeit und Kontakt einklappbar.
**Verification:** 360×740: Stärke-Zähler innerhalb des ersten bzw. zweiten Viewports.

### 3. Viel feste Bedienleiste im ersten Viewport, Ansichtswahl dreifach — Medium (P2)
**Where:** Einsatzansicht, Telefon.
**Observed:** Kopfbereich 232 px hoch (390×844), davon eine eigene Zeile „Ansicht: Standard/Feld/Dunkel/Nacht"; zusätzlich feste Leiste unten „Ansicht: Standard" (57 px) und die Ansichtswahl noch einmal in der Fußzeile. Zusammen ≈ 289 px = 34 % des Viewports für Kopf + feste Leiste. Bei großer Schrift (24 px) Kopf 340 px (40 %), die Ansicht-Segmente brechen in zwei Reihen um („Nacht" allein in Zeile 2).
**Why it matters:** Summenzeile und Eingangsknöpfe rutschen nach unten; „Bedarf" liegt bei 390×844 knapp über der festen Leiste, bei 360×740 halb dahinter (Screenshot `m-360x740-einsatz.png`).
**Recommendation:** Am Telefon nur eine Stelle für die Ansichtswahl; Kopf auf Titel + Zurück reduzieren.
**Verification:** Kopf + feste Leisten ≤ 20 % der Viewporthöhe bei 360×740.

### 4. Einheitentabelle am Telefon: Gesamtstärke außerhalb, 22 Spalten — Medium (P2)
**Where:** Ansicht „Tabelle", 390×844.
**Observed:** Tabelle 1615 px breit im Scrollcontainer 356 px; erste Spalte klebt (gut), sichtbar Einheit, Zug (abgeschnitten), F, U, M; „GES." beginnt am Rand. Mehrzeilige Einheitennamen + Marke machen jede Zeile ~95 px hoch.
**Why it matters:** Der wichtigste Wert je Einheit (Gesamt) braucht eine horizontale Wischgeste; Vergleich über Zeilen leidet.
**Recommendation:** Am Telefon Gesamt direkt nach Einheit; selten gebrauchte Spalten (Unterbringung M/W/D, Gemisch …) erst hinten oder ausgeblendet.
**Verification:** 390 px: Einheit, Gesamt, Zug ohne horizontales Scrollen sichtbar.

### 5. Pflichtfeld-Benennung und Rückfrage passen nicht zusammen — Low (P3)
**Where:** Schnellerfassung, „In Einsatz übernehmen" ohne Ort.
**Observed:** Feld heißt „Ort der Einheit (Pflicht)", Rückfrage „Name der Einheit fehlt … Bitte zuerst den Namen eintragen" mit „Zum Namensfeld".
**Recommendation:** Einheitliche Bezeichnung.

### 6. Lagemonitor: aufgeklappte „Einsatzdaten" quetschen die Tabelle — Low (P3)
**Where:** `?lagemonitor=…`, 1280×720.
**Observed:** Nach Aufklappen von „Einsatzdaten" bleibt von der Einheitentabelle eine Zeile, der Hinweis „+ 3 weitere Einheiten" wird überdeckt (`c08-lagemonitor-tab.png`). Bei 1920×1080 nicht nachgestellt.

## Positiv bestätigt (keine Befunde)
- Kein horizontales Seiten-Scrollen bei 320, 360, 390, 430, 600, 768, 1024 px und Telefon quer.
- Knöpfe und Eingabefelder 44 px hoch, Stärke-Zähler 52×52 px, Eingaben 16 px (kein Zoom-Sprung), `inputmode=numeric` für Nr./Stärke, `type=tel/email/time/datetime-local` passend.
- Dialoge passen bei 360×740 in den Viewport (Scanner-Dialog 360×621, Löschen-Dialog 328×297 mit Knöpfen 302×44), Escape/Zurück schließt.
- Papier-Abgleich-Zeilen: Felder 302×44, Status als Optionsfelder mit 108×44 Tipp-Label.
- Tablet hoch/quer: Karten offen, Summen- und Bedarfsblock vollständig, Eingangsknöpfe nebeneinander.

## Mobile breakpoint observations
- **320–600 px:** Karten zugeklappt → Befund 1 aktiv. Bedarf zugeklappt (eine Zeile).
- **360×740:** Bedarf-Zeile teilweise hinter der festen Ansicht-Leiste.
- **390×844, Schrift 24 px:** Kopf 340 px, Summen-Kacheln zweispaltig (Gesamt allein in Zeile 3), Ansicht-Segmente zweizeilig; sonst kein Überlauf.
- **700/768 px und breiter, Telefon quer:** Karten offen, Befund 1 nicht vorhanden; Bedarf als Tabelle offen.

## Needs live verification
- Echtes iOS/Android-Verhalten der Bildschirmtastatur (visualViewport) und Safe-Area unten bei der festen Leiste.
- Verhalten mit 30+ Einheiten (Länge der Einsatzansicht, Weg zu „Einsatz weitergeben").

## What to fix first
1. Tippfläche der zugeklappten Karte auf die Karte begrenzen (Befund 1).
2. Schnellerfassung: Stärke und Einheitsname nach oben, Rest einklappen (Befund 2).
3. Kopf am Telefon verschlanken, Ansichtswahl nur einmal (Befund 3).
4. Tabellen-Spaltenreihenfolge am Telefon (Befund 4).
