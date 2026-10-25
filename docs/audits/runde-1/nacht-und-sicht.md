# Audit: Nacht- und Sonnenlicht-Sichtbarkeit (thw-night-visibility-reviewer)

**Prüfstand:** Produktions-Build http://localhost:5290, Chromium headless, Telefon 390×844 in Standard, Feld, Dunkel, Nacht; System-Dunkelmodus (`prefers-color-scheme: dark`); Tablet quer 1180×820; Lagemonitor 1920×1080 in Standard und Nacht.
Messungen: WCAG-Kontrast aller sichtbaren Textknoten gegen den effektiven Hintergrund (Skript `kontrast.cjs`), mittlere relative Leuchtdichte und Anteil heller Pixel (L > 0,5) je Screenshot (Startbildschirm Einsatzansicht, 390×844).
**Nicht prüfbar:** echte Umgebungshelligkeit, Displayhelligkeit, Spiegelung bei Sonne, Farbsehschwächen am Menschen, Dunkeladaptation – nur Kontrast- und Codierungsrisiken bewertet.

## Urteil aus Sicht der Rolle
Die Farbwerte sind sauber gewählt: In allen vier Modi erreicht kein Text der Einsatzansicht weniger als **4,7:1** (Standard min. 4,96, Feld 5,01, Dunkel 7,2, Nacht 4,71). Nacht ist wirklich dunkel (mittlere Leuchtdichte 0,037, nur 1,2 % helle Pixel, hellstes Pixel L = 0,62 statt 1,0), Dunkel folgt automatisch der Systemeinstellung. Zustände tragen fast immer Text („kürzlich eingetroffen", „ABGERÜCKT", „älter als 24 h"), nicht nur Farbe. **Haupthindernis:** Auf dem Telefon lässt sich die Nachtansicht über die prominenten Knöpfe im Kopf nicht einschalten (Folge des Tipp-Fehlers aus dem Touch-Audit); der Helfer bleibt mit hellem Bildschirm (67 % helle Pixel) stehen, bis er die Leiste unten findet. Aufgabe ist ohne fremde Hilfe machbar, aber mit Umweg.

---

### 1. [P1] Telefon: „Nacht"/„Dunkel" im Kopf reagiert nicht – Bildschirm bleibt hell
- **Fundstelle:** Einsatzansicht Telefon (390×844, ≥ 1 Einheit), Ansicht-Umschalter im Kopf: „Dunkel abends" 67×46 px, „Nacht gedimmt" 75×46 px.
- **Beobachtung:** Touch-Tipp auf „Nacht" (298,117): Klasse des Dokuments bleibt leer (Standard), Screenshot unverändert. Ursache: unsichtbarer Kartenknopf über den oberen 844 px (siehe P0 im Touch-/Feldnutzer-Audit). Über die feste Leiste unten („Ansicht: Standard" 166×44 → „Nacht" 92×44) gelingt der Wechsel (Klasse `nacht-modus`).
- **Erwartung der Rolle:** Nachts ein Tipp auf „Nacht" und der Bildschirm wird dunkel.
- **Auswirkung im Einsatz:** Helfer wird von 67 % hellen Pixeln (mittlere Leuchtdichte 0,67) geblendet, verliert Dunkeladaptation, tippt mehrfach – und klappt dabei unsichtbar Karten auf.
- **Empfehlung:** Tippfehler beheben; Umschalter im Kopf muss auf Telefon wirken.
- **Verifikation:** Touch-Tipp auf „Nacht" im Kopf → Klasse `nacht-modus`, Leuchtdichte < 0,05.

### 2. [P2] Nachtmodus: alle Zustände in derselben Bernsteinfarbe
- **Fundstelle:** Einheitenkarte im Modus Nacht.
- **Beobachtung:** „kürzlich eingetroffen" (Füllung rgb(168,121,26), Text dunkel), „ANONYMISIERT" (bernstein umrandet, Text rgb(217,185,106)), „älter als 24 h" (bernstein umrandet), „Verpflegung 20 (Stärke 3)" (bernstein mit Punkt), Hinweisliste („Zeitraum vorbei …", „Verpflegung für 20 Personen angefordert, die Gesamtstärke ist aber 3") in Bernstein-Text, Primärknöpfe ebenfalls bernstein gefüllt. Info, Warnung und Aktion unterscheiden sich nur durch Füllung vs. Rahmen.
- **Erwartung:** Warnung (Plausibilitätsfehler) hebt sich von Info (anonymisiert) ab.
- **Auswirkung:** Nachts wird eine echte Unstimmigkeit (Verpflegung 20 bei Stärke 3) leicht als „ist halt gelb" überlesen.
- **Empfehlung:** In Nacht eine zweite Unterscheidung über Form/Symbol (z. B. Warnsymbol, Fettschrift, eigener Rahmenstil) für Warnungen; Aktionsknöpfe nicht in Statusfarbe.
- **Verifikation:** Graustufen-Screenshot der Karte in Nacht: Warnung und Info ohne Farbe unterscheidbar.

### 3. [P2] Dialoge ohne Abdunklung des Hintergrunds – in Nacht/Dunkel kaum vom Seiteninhalt zu trennen
- **Fundstelle:** „Bogen scannen…" (ohne Kamera) in Nacht und Standard.
- **Beobachtung:** Dialog ist modal, `::backdrop` = `rgba(0,0,0,0)`; kein sichtbarer Rahmen. In Nacht ist die Dialogfläche (rgb ~23,21,15) praktisch gleich dem Seitenhintergrund; unter den Dialogknöpfen schaut die Seite („Dateien oder Fotos von QR-Codes", „Bedarf") ungedimmt hervor.
- **Auswirkung:** Bei schwacher Displayhelligkeit unklar, was Dialog und was Seite ist; Tipp auf die scheinbar sichtbare Seite tut nichts.
- **Empfehlung:** Hintergrund abdunkeln, Dialog mit deutlicher Kante.

### 4. [P3] Dunkel: heller Primärknopf als größter Lichtfleck
- **Fundstelle:** Modus Dunkel, „Bogen scannen…" 358×57 px in Hellcyan (rgb(143,208,216), relative Leuchtdichte ≈ 0,57); Dunkel gesamt 8,3 % helle Pixel, max. L = 1,0 (weiße Ziffern).
- **Auswirkung:** Abends vertretbar, im Fahrzeug nachts blendend – dafür gibt es „Nacht"; Empfehlung, den Unterschied auf dem Umschalter klarer zu benennen („Dunkel = abends, Nacht = im Dunkeln").

### 5. [P3] Lagemonitor Nacht: Knopf „Dunkler" mit 2,94:1
- **Fundstelle:** Lagemonitor-Fenster (1920×1080) in Nacht, Optionen-Bereich: „Dunkler" Kontrast 2,94:1 (übrige Texte ≥ 6,76:1). Der Monitor ist in beiden Modi schwarz mit großer Schrift – gut.

### 6. [P3] PDFs sind bewusst hell – Blendung beim Öffnen nachts
- **Evidence:** Likely / nicht verifiziert. Die App sagt selbst: „Die PDFs sind für Papier gedacht — hell, auch in der Ansicht ‚Nacht'." Das Öffnen von Lageblatt/Sammel-PDF in der Vorschau wurde nicht geprüft; ein heller Vollbild-PDF-Viewer ist nachts zu erwarten.
- **Empfehlung:** Vor dem Öffnen in Nacht kurz warnen oder direkt speichern statt anzeigen.

### Nicht verifiziert
- Sonnenlicht: Standard min. 4,96:1 (graue Kachelbeschriftung „EINHEITEN" 13 px auf rgb(232,235,242)), Feld min. 5,01:1 (Sprunglinks) – rechnerisch ausreichend, praktischer Test im Freien steht aus.
- Rot-Grün-Schwäche: Zustände sind textlich benannt; farbiger Punkt in „Verpfl." hat keine erkennbare Legende – Bedeutung der Punktfarbe nicht geprüft.

### Gut gelöst (erhalten)
- Vier Modi, Nacht wirklich gedimmt (hellstes Pixel L 0,62), Dunkel folgt dem System automatisch.
- Mindestkontrast ≥ 4,7:1 in allen Modi; Ansicht-Wahl zusätzlich unten in fester Leiste und in der Fußzeile.
- Abgerückte Einheiten: gestrichelter Rahmen + Schriftzug „ABGERÜCKT", nicht nur Farbe.
- Lagemonitor: schwarz, große Ziffern, keine Personennamen.

### Abschluss
- **Aufgabe geschafft:** mit Umwegen (Nachtmodus auf Telefon nur über die untere Leiste/Fußzeile)
- **Fremde Hilfe nötig:** nein (Leiste unten ist auffindbar), aber Zeitverlust
- **Größtes Missverständnis:** Tipp auf „Nacht" im Kopf bewirkt nichts – Helfer glaubt, der Nachtmodus sei kaputt.
- **Größtes Einsatzrisiko:** Plausibilitätswarnungen gehen im Nachtmodus in der einheitlichen Bernsteinfarbe unter.
- **Top-Priorität für die nächste Iteration:** Umschalter im Kopf auf dem Telefon wieder antippbar machen (Ursache: Kartenknopf-Fläche), danach Warnungen in Nacht über Form/Symbol unterscheidbar machen.
