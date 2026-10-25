# Product

## Platform

web (PWA), dazu Desktop (Electron) und Android (Capacitor) als Hüllen um
dieselbe Web-App.

## Users

Eine Nutzergruppe mit drei Ausprägungen desselben Auftrags:

1. **Meldekopf** am Eingang eines Einsatzraums oder Einsatzabschnitts: nimmt
   eintreffende Einheiten entgegen, erfasst sie, meldet sie weiter.
2. **Leitung Bereitstellungsraum**: betreibt am Eingang des Bereitstellungsraums
   einen Meldekopf und braucht jederzeit die Übersicht, welche Kräfte mit
   welchem Bedarf bereitstehen und welche schon abgerückt sind.
3. **Kleine Führungsstelle im ELW** (Zug- oder Verbandsführer, Einsatzleitung
   einer Gemeinde, Führungsgruppe): bündelt die eigenen Einheiten, verfolgt
   Folgemeldungen und gibt die Lage geschlossen an die nächste Ebene weiter.

Nutzer sind Ehrenamtliche und Einsatzkräfte aller BOS (THW, Feuerwehr,
DRK/JUH/MHD/ASB, DLRG, Polizei, Bundeswehr, Katastrophenschutz der Länder),
keine IT-Fachleute. Die App muss ohne Schulung und ohne Anmeldung
funktionieren.

**Nicht** Nutzer dieser App: die einzelne Einheit, die ihren eigenen Bogen
ausfüllt (das ist der Erfassungsbogen), und der volle Stab mit Lagekarte,
Einsatztagebuch und Auftragsverfolgung (das ist S1-Control).

## Product Purpose

Eintreffende Einheiten erfassen, zählen und weitermelden. Erfolg heißt: Eine
Einheit mit QR-Code ist in Sekunden aufgenommen, eine ohne Bogen in wenigen
Minuten; Stärke und Sofortbedarf über alle anwesenden Einheiten stimmen zu
jedem Zeitpunkt ohne Rechnen; die Weitergabe an die nächste Führungsstelle
enthält genau das, was seit der letzten Weitergabe dazukam.

## Positioning

Der Meldekopf ist das mittlere Glied der Produktfamilie Erfassungsbogen,
Meldekopf, S1-Control. Er liest, was der Erfassungsbogen erzeugt (QR-Code,
Link, Datei, PDF), und erzeugt, was S1-Control liest (Einsatz-Datei, CSV,
Excel-Liste). Offline-first, ohne Server, ohne Kopplung der Geräte, kostenlos,
freie Software (EUPL-1.2), keine Anmeldung, keine Cloud.

Die Funktionen entstehen nicht neu: Sie werden aus der Einsatz-Sammlung des
Erfassungsbogens herausgelöst, die dort seit 2026 in acht Audit-Runden auf
Feldtauglichkeit geprüft wurde. Der Erfassungsbogen gibt diese Funktionen ab,
sobald der Meldekopf sie vollständig trägt.

## Operating Context

- **Maßgebliche Nutzungssituation:** ein Tablet oder Laptop am Eingang des
  Bereitstellungsraums, im ELW oder auf der Motorhaube; Zeitdruck, Lärm,
  grelles Tageslicht wie Dunkelheit, Handschuhe. Feld- und Nacht-Modus sind
  Pflicht, nicht Zierde.
- Ein zweiter Bildschirm (Fernseher per Kabel) zeigt die Lage in großer
  Schrift für alle im Raum.
- Eingänge ohne Netz: Kamera, USB-Handscanner am PC, Fotos aus Messenger
  und Mail, Datei, PDF, AirDrop/Quick Share, Link.
- Ausgänge ohne Netz: Sammel-PDF (Papier bleibt der Vertrag), CSV, Excel-Liste
  „Oldenburg", Einsatz-Datei.
- Läuft im Browser (PWA, meldekopf.erfassungsbogen.app), als Desktop-App (Electron) und als
  Android-App (Capacitor). iOS folgt dem Stand des Erfassungsbogens.

## Capabilities and Constraints

- Einsatz-Sammlung: Einsätze anlegen (Einsatz, Übung, Bereitstellungsraum),
  Bögen aufnehmen, Summen und Zwischensummen je Zug, Historie, Diff,
  Abrücken, Aufteilen/Zusammenführen, Papier-Abgleich, Papierkorb.
- Schnellerfassung einer Einheit ohne Bogen (nur Stärke, Führungskraft,
  Fahrzeuge). Kein vollständiger Assistent: Für einen vollständigen Bogen
  wird der Erfassungsbogen per Link geöffnet und der Bogen kommt per Link
  zurück.
- Lagemonitor als zweites Fenster, ohne Personennamen.
- Exporte: Sammel-PDF, CSV, XLSX Oldenburg, Einsatz-Datei; Export-Stand je
  Format mit „nur neue seit dem letzten Export".
- **Schema-Abwärtskompatibilität ist Pflicht:** alte QR-Codes, Dateien und
  Sammlungen müssen per Migration lesbar bleiben. Bestandsdaten aus der
  Einsatz-Sammlung des Erfassungsbogens müssen übernommen werden können.
- Kein Server, keine Anmeldung, keine Cloud; Reichweitenmessung cookielos
  (GoatCounter), sonst keine Netzverbindung.
- Fachterminologie ist verbindlich: Stärke (x/y/z//g), Sofortbedarf,
  Meldekopf, Bereitstellungsraum, Funkrufname, taktische Zeichen, Zug,
  Verband, DTG.
- Sprache der Oberfläche und des Codes: Deutsch.

## Brand Commitments

Name „Meldekopf" / meldekopf.erfassungsbogen.app. Dieselbe Designsprache wie der
Erfassungsbogen („Amtlich"-Optik über eigene CSS-Design-Token, Oberflächen-
schrift Archivo im Bundle, eingebackene taktische Zeichen, Dunkelmodus nur per
Schalter). Die beiden Apps sollen als Geschwister erkennbar sein, aber mit
eigenem Icon und eigener Kennfarbe unterscheidbar bleiben.

## Evidence on Hand

- Acht Rollenaudits des Erfassungsbogens (`docs/audits/` dort), davon die
  Rollen Führungssicht, Arbeitsablauf, Offline und Speicher, zerstörende
  Handlungen mit vielen Befunden zur Einsatz-Sammlung; alle behoben.
- Gherkin-Szenarien des Erfassungsbogens zu Einsatz-Sammlung, Einsatz-Detail,
  Einheitenliste und Übergabe als ausführbare Anforderungen.
- Beispielbögen als JSON unter `examples/` des Erfassungsbogens.
- Keine Testimonials, Fallstudien oder Nutzerzahlen vorhanden. Nicht erfinden.

## Product Principles

1. **Offline ist der Normalfall, nicht der Fehlerfall.**
2. **Draußen bedienbar.** Lesbarkeit und Trefferflächen für Sonne, Nacht,
   Handschuhe, Zeitdruck schlagen Ästhetik am Schreibtisch.
3. **Das Papier ist der Vertrag.** Sammel-PDF und Begriffe folgen den
   amtlichen Bögen; was auf Papier ankommt, muss sich nachtragen lassen.
4. **Nichts geht verloren.** Abwärtskompatibilität, Papierkorb statt
   endgültigem Löschen, Historie statt Überschreiben.
5. **Sofort nutzbar.** Keine Anmeldung, keine Installationspflicht, keine
   Schulung; ein Scan genügt.
6. **Ein Gerät, eine Weitergabe.** Was mehrere Geräte oder Verlauf über Tage
   braucht, gehört nach S1-Control, nicht hierher.

## Accessibility & Inclusion

Kein verbindlicher Standard (BITV/WCAG) festgelegt. Übernommen vom
Erfassungsbogen: hoher Kontrast im Feld-Modus, Nacht-Modus, Schriftstufen,
Tipp-Schutz gegen Fehltipps unter dem Finger, Mindestgrößen der Trefferflächen.
