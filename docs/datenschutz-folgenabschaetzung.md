# Datenschutz-Folgenabschätzung

**Meldekopf-App — Vorlage/Entwurf**
Grundlage: Repository `wattnpapa/meldekopf`, Stand 2026-10-25, Phase 2 — Version 0.1 (Entwurf)

> **Herkunft dieses Dokuments.** Übernommen aus der Vorlage des
> Erfassungsbogens (`docs/datenschutz-folgenabschaetzung.md` im Repository
> `wattnpapa/erfassungsbogen`, Commit `441811c`) und auf die Meldekopf-App
> zugeschnitten. Gliederung, Risikoschema und Maßnahmennummern folgen der
> Vorlage. Was für den Meldekopf nicht zutrifft, ist gestrichen oder als
> „entfällt (Grund)" gekennzeichnet. Die Nachtragshistorie der Vorlage (Audit-
> Runden 2 bis 9 des Erfassungsbogens) ist nicht übernommen; die dort
> beschriebenen Speicherorte, Fristen und Rückfragen gehören zu den
> übernommenen Modulen und stehen hier im Ist-Stand.
>
> **Stand 2026-10-25, Phase 2 („Sammlung lesen und zeigen").** Die
> technischen Aussagen wurden gegen den Zweig `claude/phase-2-sammlung`
> (Commit `1a1151c`) und die dort gepinnten Submodule geprüft. Abweichungen
> zwischen Begleitdokumenten und Code sind als *Prüfvermerk* gekennzeichnet;
> es gilt der Code.
>
> **Die schwerere der beiden Folgenabschätzungen.** Die DSFA des
> Erfassungsbogens betrifft vor allem die Daten der *eigenen* Einheit. Diese
> DSFA betrifft die Personendaten *fremder* Einheiten, die am Meldekopf über
> die Dauer eines Einsatzes auf einem Gerät gebündelt werden. Mit dem Abbau
> der Einsatz-Sammlung im Erfassungsbogen (Phase 7 der Übernahme) wandert
> dieser Teil der Risiken von dort hierher (ADR-001).
>
> **Wächst mit dem Code.** Die Eingänge (Scan, Datei, Bilderstapel, Link)
> sind seit Phase 3 live, die Schnellerfassung seit Phase 4, die Android-Hülle
> seit Phase 5. Was noch fehlt, ist hier als **geplant** beschrieben, mit dem Ort, an dem sie im Code
> entstehen; mit jeder Phase ist dieses Dokument nachzuziehen.

## Hinweis zu diesem Dokument

Dies ist ein technisch fundierter Entwurf, **keine Rechtsberatung** und keine
fertige, rechtsverbindliche Datenschutz-Folgenabschätzung. Er wurde auf Basis
einer Analyse des öffentlichen Quellcodes von `wattnpapa/meldekopf` (Stand
2026-10-25, inkl. der sechs Submodule) erstellt und beschreibt, was die
Software technisch tut — nicht, wie eine konkrete Organisation sie einsetzt,
konfiguriert oder rechtlich einordnet.

Die App hat keinen zentralen Betreiber: Es gibt keinen Server, keine Cloud,
kein Nutzerkonto. Die Organisation, die einen Meldekopf mit der App betreibt,
wird dadurch selbst zum datenschutzrechtlich Verantwortlichen für diese
Nutzung (Art. 4 Nr. 7 DSGVO) — auch für die Daten der fremden Einheiten, die
bei ihr eintreffen. Dieses Dokument ist deshalb als ausfüllbare Vorlage
angelegt: Platzhalter in eckigen Klammern sind von der jeweiligen
Organisation zu ergänzen, bevor das Dokument als eigene DSFA verabschiedet
wird.

Vor einer verbindlichen Nutzung sollte diese Vorlage von der/dem behördlichen
bzw. betrieblichen Datenschutzbeauftragten (Art. 37 ff. DSGVO) geprüft,
ergänzt und formell freigegeben werden. Rechtsgrundlagen (Abschnitt 5.6) sind
bewusst als Optionen dargestellt, da sie von Rechtsform, Bundesland und der
Einsatzstruktur (wer betreibt den Meldekopf in wessen Auftrag?) abhängen.

## 1. Zusammenfassung

Die Meldekopf-App sammelt die Erfassungsbögen eintreffender Einheiten unter
einem Einsatz, zählt Stärke und Sofortbedarf laufend zusammen, zeigt die
Lage auf einem zweiten Bildschirm und gibt sie an die nächste
Führungsstelle weiter. Sie verarbeitet dabei personenbezogene Daten des
**Personals fremder Einheiten** (Namen, Funktionen, Qualifikationen,
Fahrerlaubnisse, Geschlecht und Ernährungsform für die Logistik,
Erreichbarkeiten der Führungskräfte), Freitexte der Führungsstelle und die
Anwesenheitszeiten der Einheiten.

Wie beim Erfassungsbogen gibt es keinen Server, keine Cloud, keine
Nutzerkonten. Alle Daten bleiben auf dem Meldekopf-Gerät (`localStorage`);
Ein- und Ausgang laufen über QR-Code, Datei oder Ausdruck. Das minimiert eine
ganze Risikoklasse, verschiebt die verbleibenden Risiken aber vollständig auf
das Gerät, auf die Ausgaben und auf die Datensicherungsdatei.

**Ergebnis der Erforderlichkeitsprüfung (Abschnitt 4), neu bewertet:** Beim
Erfassungsbogen war eine DSFA nicht zwingend, aber empfohlen. Beim Meldekopf
sind zwei Kriterien der Art.-29-Datenschutzgruppe (WP248) erfüllt —
Zusammenführung von Datensätzen aus vielen Quellen (Einheiten verschiedener
Organisationen) und, je nach Lage, ein erheblicher Umfang über mehrere Tage.
Nach WP248 ist eine DSFA dann **in der Regel erforderlich**. Dieser Entwurf
empfiehlt, sie als erforderlich zu behandeln.

**Gesamtrisiko** (vor organisationsspezifischen Maßnahmen): **mittel**. Die
höchsten Einzelrisiken sind der Verlust eines ungesperrten Meldekopf-Geräts
(R1), Vollkopien der Sammlung außer Haus — Sammel-PDF, Einsatz-Datei,
Datensicherung (R2) — und die strukturelle Grenze der Betroffenenrechte
gegenüber Personen, die von der Verarbeitung nichts wissen (R8, Art. 14).

**Technisch umgesetzte Begrenzung:** Die Datenschutzfrist anonymisiert jede
Meldung 90 Tage nach dem Stand ihres Bogens (Übungsbögen ausgenommen), ruhende
Sammlungen werden nach 90 Tagen gelöscht, der Papierkorb nach 30 Tagen
geleert, alles über eine geprüfte Geräteuhr. Der Lagemonitor zeigt keine
Personennamen.

## 2. Rahmendaten

| Feld | Angabe |
| --- | --- |
| Bezeichnung der Verarbeitungstätigkeit | Meldekopf-App (App „Meldekopf", meldekopf.erfassungsbogen.app): Erfassung, Zählung und Weitermeldung eintreffender Einheiten |
| Verantwortlicher (Art. 4 Nr. 7 DSGVO) | `[Name der Organisation, die den Meldekopf betreibt]` |
| Vertreten durch | `[Name, Funktion]` |
| Datenschutzbeauftragte/r (falls bestellt) | `[Name, Kontakt]` |
| Ersteller dieses Entwurfs | KI-gestützte Analyse des öffentlichen Quellcodes, auf Anforderung von `[Name]` |
| Grundlage | Repository `wattnpapa/meldekopf`, Zweig `claude/phase-2-sammlung`, Commit `1a1151c`, inkl. Submodule |
| Herkunft der Vorlage | `docs/datenschutz-folgenabschaetzung.md` des Erfassungsbogens, Commit `441811c` |
| Version dieses Dokuments | 0.1 (Entwurf), Phase 2 |
| Datum | `[Datum der Freigabe einfügen]` |
| Nächste Überprüfung | `[Datum, spätestens mit dem ersten signierten Android-Release und bei wesentlicher Änderung der Software oder des Einsatzzwecks]` |
| Anlass der DSFA | Ersteinführung der App bei `[Organisation]` / Übernahme der Einsatz-Sammlung aus dem Erfassungsbogen / Regelmäßige Überprüfung |

## 3. Systembeschreibung (Kurzfassung)

Ausführlich beschrieben in der [Architekturdokumentation](architektur.md) und
im [Informationssicherheitskonzept](informationssicherheitskonzept.md); hier
die für die DSFA relevante Kurzfassung:

- **Plattformen:** Web/PWA unter meldekopf.erfassungsbogen.app (live);
  Desktop als Electron-Hülle für Windows und Linux (im Release, unsigniert;
  macOS still). Android (Capacitor) seit Phase 5, als signierte APK im
  Release, sobald der Keystore hinterlegt ist; ohne Selbst-Update, also ohne
  Abfrage von GitHub aus der App. iOS folgt dem Stand des Erfassungsbogens.
- **Keine Server-Infrastruktur.** Jede Verarbeitung läuft auf dem Gerät.
  Keine zentrale Datenbank, keine Nutzerkonten, keine Anmeldung, keine
  Kopplung mehrerer Meldekopf-Geräte (ADR-008).
- **Eingang** (live seit Phase 3; `src/app/eingang/`): QR-Code per Kamera
  oder USB-Handscanner, Fotos aus Messenger und Mail (Bilderstapel),
  JSON-Datei, PDF mit QR oder eingebettetem Bogen, Link mit Payload im
  Fragment, Einsatz-Datei einer Ablösung, dazu die Datensicherung (auch die
  des Erfassungsbogens). **Schnellerfassung** einer Einheit ohne Bogen
  (live seit Phase 4; `src/app/schnellerfassung/`).
- **Ausgang** (live): Sammel-PDF mit eingebetteter Sammlung, Lageblatt,
  Blanko-Vordruck, Übersichts-CSV, CSV mit allen Daten, Excel-Liste
  „Oldenburg", Einsatz-Datei, Datensicherung.
- **Lagemonitor:** zweites Fenster derselben App für einen Fernseher am
  Gerät, ohne Personennamen.
- **Signatur:** Ed25519; der Meldekopf zeichnet die QR-Codes empfangener,
  unveränderter Bögen gegen, statt sie neu zu signieren (5.5).
- **Eine externe Netzverbindung** außerhalb der Sammlungs-Funktion:
  GoatCounter-Reichweitenmessung an `meldekopf.goatcounter.com`; dazu die
  Update-Prüfung der Desktop-Fassung bei GitHub Releases und der Abruf der
  Webfassung von GitHub Pages (5.8).

## 4. Erforderlichkeitsprüfung (Art. 35 Abs. 1, 3 DSGVO)

### 4.1 Regelbeispiele Art. 35 Abs. 3 DSGVO

| Regelbeispiel | Einschlägig? | Begründung |
| --- | --- | --- |
| (a) Systematische und umfassende Bewertung persönlicher Aspekte, automatisierte Entscheidung mit Rechtswirkung | Nein | Die App summiert Stärke und Bedarf je Einheit; sie bewertet keine Personen und trifft keine Entscheidungen. Der Qualifikationsfilter („wer hat Atemschutzgeräteträger gemeldet?") ist eine Suche, keine Bewertung. |
| (b) Umfangreiche Verarbeitung besonderer Kategorien (Art. 9) oder strafrechtlicher Daten | Nein | Kein Feld für Gesundheits-, Religions- oder ähnliche Daten. Ernährungsform (vegetarisch/vegan) dient der Verpflegung. Freitexte (Notiz der Führungsstelle, „Sonstiges" der Einheit) *können* im Einzelfall solche Angaben enthalten („Kamerad X Diabetiker") — organisatorisch auszuschließen (M7). |
| (c) Umfangreiche systematische Überwachung öffentlich zugänglicher Bereiche | Nein | Keine Überwachungsfunktion. Der Lagemonitor *zeigt* Daten in einem Raum, er erhebt keine. |

Keines der drei Regelbeispiele ist erfüllt.

### 4.2 Ergänzende WP248-Kriterien

| Kriterium | Erfüllt? | Anmerkung |
| --- | --- | --- |
| Bewertung/Scoring von Personen | Nein | — |
| Automatisierte Entscheidung mit Rechts-/ähnlicher Wirkung | Nein | — |
| Systematische Überwachung | Nein (Grenzfall) | Eintreff- und Abrückzeiten mit Vermerken je Einheit ergeben ein Anwesenheitsprotokoll; es ist einheitsbezogen, nicht personenbezogen. Siehe R14. |
| Besondere Kategorien / höchstpersönliche Daten | Nein | Siehe 4.1 (b) |
| Große Datenmengen (Umfang, Dauer, Anzahl Betroffener) | **Teilweise bis ja** (neu bewertet; Vorlage: Teilweise) | Am Meldekopf einer Großlage kommen Dutzende Einheiten mit je bis zu einigen Dutzend Personen zusammen, über Tage, auf einem Gerät. Kein bundesweites Register, aber der größte Bestand der Produktfamilie. |
| Zusammenführung/Abgleich von Datensätzen aus verschiedenen Quellen | **Ja** (neu bewertet; Vorlage: Teilweise) | Das ist der Zweck der App: Meldungen vieler Einheiten verschiedener Organisationen (THW, Feuerwehr, Hilfsorganisationen, Bundeswehr …) werden zusammengeführt, mit Fassungen derselben Einheit verglichen und mit Zusätzen der Führungsstelle angereichert. Zweckgebunden innerhalb eines Einsatzes, kein Abgleich mit externen Registern. |
| Daten von schutzbedürftigen Betroffenen | Teilweise | Ehrenamtliche und Einsatzkräfte im Einsatz; sie haben die Daten nicht dem Meldekopf, sondern ihrer eigenen Einheit gegeben (Art. 14). |
| Einsatz neuer Technologien | Nein | QR-Code, Ed25519, lokale Speicherung sind etabliert. |
| Verweigerung eines Dienstes bei fehlender Einwilligung | Nein | — |

### 4.3 Ergebnis

Zwei WP248-Kriterien sind erfüllt (Zusammenführung, Umfang). Nach den
Leitlinien ist eine DSFA dann **in der Regel erforderlich**.

**Empfehlung dieses Entwurfs:** Die DSFA als erforderlich durchführen, weil
(1) Personendaten fremder Einheiten in großem Umfang gebündelt werden, (2)
die Betroffenen von der Verarbeitung am Meldekopf typischerweise nichts
wissen, (3) die Architektur ohne Server strukturelle Besonderheiten bei den
Betroffenenrechten mit sich bringt (6.3) und (4) Vollkopien der Sammlung den
Meldekopf verlassen. Ist die Organisation nach Landesrecht oder
Positivliste der Aufsichtsbehörde anders gebunden, ist das durch die/den
Datenschutzbeauftragte/n zu bestätigen.

## 5. Systematische Beschreibung der Verarbeitung (Art. 35 Abs. 7 lit. a DSGVO)

### 5.1 Zwecke der Verarbeitung

- Aufnahme eintreffender Einheiten an Meldekopf, Bereitstellungsraum oder
  kleiner Führungsstelle (Bogen per QR/Datei/Link; Schnellerfassung
  ohne Bogen).
- Laufende Zusammenzählung von Stärke (F/UF/M//Ges), Sofortbedarf
  (Verpflegung, Unterbringung M/W/D, Kraftstoff, Ruhezeit) und Fahrzeugen
  über alle anwesenden Einheiten, je Zug.
- Führung der Lage: Eintreff- und Abrückzeit je Einheit, Zug, Auftrag/Notiz
  der Führungsstelle, Folgemeldungen mit Änderungen, Aufteilen und
  Zusammenführen, Entfernen.
- Suche nach Qualifikationen und Fahrerlaubnissen in den gemeldeten Bögen
  (mit Namen), um Kräfte für einen Auftrag zu finden.
- Anzeige der Lage auf einem zweiten Bildschirm ohne Personennamen.
- Weitergabe an die nächste Führungsstelle, an S1-Control und an die Ablösung:
  Sammel-PDF (Papier ist die Rückfallebene), Lageblatt (Aushang,
  Klemmbrett), CSV, Excel-Liste „Oldenburg", Einsatz-Datei; „nur neue seit
  dem letzten Export".
- Rückfallebene Papier: Blanko-Vordruck, Lageblatt mit Nachtragszeilen,
  Abgleich der Lage vom Papier nach Geräteausfall.
- Datensicherung des Gerätebestands und Übernahme der Bestandsdaten aus dem
  Erfassungsbogen (ADR-007).
- Herkunftsnachweis durch Gegenzeichnen der QR-Codes empfangener Bögen.
- Anonyme Reichweitenmessung der App-Nutzung (5.8).

> *Entfällt gegenüber der Vorlage:* Erfassung des **eigenen** Bogens im
> Assistenten, „Meine Vorlagen", Musterung, „Vorlage teilen", Absenderkarte
> als freiwillige Angabe der meldenden Person, Beispielbögen. Diese Zwecke
> hat nur der Erfassungsbogen (ADR-006).

### 5.2 Beteiligte

| Rolle | Wer | Anmerkung |
| --- | --- | --- |
| Verantwortlicher | `[Organisation, die den Meldekopf betreibt]` | Für die Verarbeitung auf dem Meldekopf-Gerät, einschließlich der Daten fremder Einheiten |
| Ggf. gemeinsam Verantwortliche (Art. 26 DSGVO) | `[Einsatzleitung / Gebietskörperschaft, in deren Auftrag der Meldekopf betrieben wird]` | Wird der Meldekopf im Auftrag einer Einsatzleitung betrieben, ist zu klären, ob Auftragsverarbeitung, gemeinsame Verantwortung oder getrennte Verantwortung vorliegt |
| Auftragsverarbeiter (Art. 28 DSGVO) | Keiner für den Kern-Anwendungsfall | Kein Server verarbeitet im Auftrag |
| Externer Dienst (Reichweitenmessung) | GoatCounter (`meldekopf.goatcounter.com`) | Cookielos, ohne Bezug zu den Sammlungsdaten (5.8) |
| Quellen der Daten | Die eintreffenden Einheiten (Erfassungsbogen-App oder Papier) | Erheben die Daten ihres Personals selbst; der Meldekopf erhält sie im Meldeweg |
| Empfänger | Übergeordnete Führungsstelle, Stab (S1-Control), Ablösung am Meldekopf, Führungsstelle mit Excel-Vorlage „Oldenburg" | Erhalten Vollkopien oder Ausschnitte (5.8) |

### 5.3 Betroffene Personen

- **Personal fremder Einheiten** (Hauptgruppe): Name, Funktion,
  Qualifikationen, Fahrerlaubnisse, Geschlecht, Ernährungsform; bei
  Führungskräften Erreichbarkeiten. Erhoben **nicht bei der betroffenen
  Person**, sondern über ihre Einheit (Art. 14 DSGVO).
- **Führungskräfte der Einheiten und ihrer Ebenen** (Telefon, E-Mail,
  Rückrufnummer auf dem Lageblatt).
- **Absendende Personen** fremder Geräte: Name, E-Mail, Telefon aus der
  freiwilligen Absenderkarte, die im Signaturnachweis einer Meldung
  mitkommt.
- **Dritte in Freitexten**: Personen, die in Notiz/Auftrag der Führungsstelle
  oder in „Sonstiges" einer Einheit genannt werden (z. B. „Rückruf Hr. Meyer
  15:00").
- **Personal des Meldekopfs** selbst: nur mittelbar (Kürzel „übertragen von"
  auf Papier; eine Absenderkarte aus einer eingespielten
  Erfassungsbogen-Sicherung, R13).
- **Mannschaften aus Vorlagen** einer eingespielten Erfassungsbogen-Sicherung
  (R13).

### 5.4 Kategorien personenbezogener Daten

| Kategorie | Felder | Pflicht/optional | Fundstelle |
| --- | --- | --- | --- |
| Identität | Vorname, Nachname | Im Bogen je Personaleintrag; eine Nur-Stärke-Meldung aus der Schnellerfassung trägt höchstens die Führungskraft (Name, Telefon) | `Person` (`@bos/eeb-format/model`) |
| Funktion/Qualifikation | Funktionen, Zusatzqualifikationen, Fahrerlaubnisse, Zählrolle | Teils Pflicht, teils optional | `Person` |
| Unterbringungs-/Verpflegungsangaben | Geschlecht (M/W/D), Ernährungsform | Je Person | `Person` — kein Gesundheitsdatum nach Art. 9 |
| Kontaktdaten | Telefon, E-Mail (i. d. R. Führungskräfte und Ebenen) | Optional | `Kontakt` |
| Fahrzeugbezogen | Kennzeichen, Funkrufname | Optional | `Fahrzeug` |
| Absenderangabe fremder Geräte | Name, E-Mail, Telefon | Freiwillig beim Sender | Signaturnachweis am `MeldeEintrag` (`signatur`), Rohpayload (`herkunft`) |
| Einsatzkontext, Anwesenheit | Einsatz, Ort, Zeitraum des Bogens; **Eintreff- und Abrückzeit, Status, Zug je Einheit**; Bewegungen | Teils Pflicht | `Einsatz`, Zusatzfelder `eingetroffenAm`, `abgerueckAm` (`eintrag-zeiten.ts`) — ergibt mit den Personaldaten, wer wann wo im Einsatz war |
| Führungsstellen-Zusätze | Auftrag/Notiz (**Freitext**), `vermerke` (jede Handlung mit Uhrzeit, Vorwerte inklusive) | Optional | `eintrag-zeiten.ts` — nicht von der Datenschutzfrist erfasst (5.7) |
| Freitext der Einheit | „Sonstiges", Ort/Auftrag | Optional | Bogen |
| Geräteschlüssel | Öffentlicher Ed25519-Schlüssel und Kurzform (für sich ohne Personenbezug); privater Schlüssel des Meldekopfs | Automatisch | `geraete-schluessel.ts` |
| Fremdbestand aus Erfassungsbogen-Sicherung | Vorlagen (ganze Mannschaft), Entwurf, Rückholplatz, eigene Absenderkarte | Nur nach Einspielen | `vorlagen.ts`, `entwurf.ts`, `absenderkarte.ts` (reine Datenmodule) |

Dieselben Kategorien können zusätzlich im **beiseitegelegten unlesbaren
Bestand** (`eeb.unlesbar.v1`, `eeb.entwurf.beschaedigt.v1`) und — ab Phase
3 — im **wartenden Link** im Sitzungsspeicher (`eeb.wartet.fragment`)
stehen: derselbe Bogen in einem Zustand, den die App nicht lesen oder noch
nicht ablegen kann (5.7).

**Nicht enthalten:** besondere Kategorien nach Art. 9 DSGVO (außer
versehentlich in Freitexten, M7), biometrische Daten, strafrechtliche Daten.

### 5.5 Verarbeitungsvorgänge / Datenfluss

- **Eingang (live seit Phase 3):** Dekodierung des QR-Payloads (Base41,
  DeflateRaw mit Größendeckel 4 MiB, `inflateRawBegrenzt`; PDF-Ströme mit
  eigenem Deckel), Prüfung der Signatur (reiner Anzeigestatus),
  Schema-Migration, Aufnahme über `meldungAufnehmen` (Fingerabdruck je
  Einheit, Dedupe, Folgemeldung als neue Fassung, Diff). Ein Bogen-Link fragt
  „Wohin damit?“ (laufende Sammlung, neue Sammlung, Erfassungsbogen) und
  wartet bis zur Antwort im Sitzungsspeicher. „Im Erfassungsbogen öffnen“
  öffnet `erfassungsbogen.app` in einem neuen Tab mit dem Bogen im Fragment;
  das Fragment geht nicht an den Server, nach Ablauf der Datenschutzfrist
  ohne Personendaten.
- **Schnellerfassung (live seit Phase 4):** Nur-Stärke-Bogen mit Einheit,
  Zählern, Führungskraft (Name, Telefon) und Fahrzeugen; jede Eingabe steht
  sofort im Entwurf (`eeb.entwurf.v1`, an die Sammlung gebunden), bis sie
  übernommen oder verworfen wird. Abgelegt wird über denselben Weg wie ein
  gescannter Bogen, als `quelle: "manuell"` ohne Signatur. „Im
  Erfassungsbogen vollständig erfassen…“ öffnet `erfassungsbogen.app` mit dem
  bisher Erfassten im Fragment (kein Netzversand des Inhalts).
- **Eingang heute:** „Sicherung einspielen" ersetzt nach Rückfrage den ganzen
  Gerätebestand durch den der Datei (Prüfung vorher, Aufzählung beider
  Bestände, Haken bei Verlust).
- **Lage führen:** Summen, Karten- und Tabellensicht, Suche (nicht über
  Personennamen), Qualifikations- und Kraftfahrerfilter (mit Namen), Zug,
  Abrücken, Zeitkorrektur, Auftrag/Notiz, Aufteilen, Zusammenführen,
  Entfernen, Historie, Kenntnisnahme; jede Handlung der Führungsstelle als
  Vermerk mit Uhrzeit.
- **Lagemonitor:** liest denselben Speicher und zeigt Summen, Einheitsnamen,
  Organisation, Heimatort, Funkrufname, Stärke und Bewegungen — keine
  Personennamen.
- **Ausgabe:** Sammel-PDF (Lageblatt + jeder Bogen mit QR, eingebettet alle
  Bögen als JSON und die ganze Sammlung samt Export-Ständen und
  Lage-Angaben), Lageblatt allein (mit Funkrufname und **Rückrufnummer der
  Führungskraft** je Einheit — Aushang), Übersichts-CSV (eine Zeile je Einheit
  mit Notiz, Bemerkung, Hinweisen), CSV mit allen Daten (je Person eine
  Zeile, mit Namen und Erreichbarkeiten), Excel-Liste „Oldenburg" (mit
  Erreichbarkeit der Führungskraft, Notiz), Einsatz-Datei (JSON-Umschlag
  der Sammlung). „Nur neue seit dem letzten Export" je Format. Im QR-Code
  steckt nur der Bogen der Einheit, nie die Notiz der Führungsstelle.
- **Gegenzeichnen:** Ist ein Bogen seit dem Empfang unverändert, behält sein
  QR-Code die Signatur der Einheit, der Meldekopf zeichnet die Weitergabe
  gegen. Dabei wird eine auf dem Gerät liegende Absenderkarte mitsigniert
  (Prüfvermerk in 5.7, R13).
- **Datensicherung:** alle `eeb.*`-Einträge als Datei.

Eine technische Darstellung steht in Kapitel 6 der
[Architekturdokumentation](architektur.md) und, ausführlicher für die
übernommenen Abläufe, in Kapitel 6 der Arc42-Dokumentation des
Erfassungsbogens.

### 5.6 Rechtsgrundlagen (durch die einsetzende Organisation zu bestätigen)

| Verarbeitung | Mögliche Rechtsgrundlage | Anmerkung |
| --- | --- | --- |
| Führung des Meldekopfs durch BOS mit hoheitlichem Auftrag (Erfassung, Zählung, Weitermeldung eintreffender Kräfte) | Art. 6 Abs. 1 lit. e DSGVO i. V. m. `[Landes-Katastrophenschutzgesetz, Brandschutz-/Feuerwehrgesetz, THW-Gesetz, Rettungsdienstgesetz]` | Regelfall; die Lageführung ist Teil der Einsatzleitung |
| Meldekopf einer privatrechtlich organisierten Hilfsorganisation ohne hoheitlichen Auftrag | Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an Einsatzfähigkeit und Fürsorge) bzw. Mitwirkung im Katastrophenschutz nach Landesrecht | Im Einzelfall zu prüfen |
| Weitergabe an übergeordnete Führungsstellen, Stab, Ablösung | wie oben; Zweckbindung innerhalb desselben Einsatzes | Empfänger werden selbst Verantwortliche |
| Anonyme Reichweitenmessung (GoatCounter) | Art. 6 Abs. 1 lit. f DSGVO — so in `src/app/statistik.ts` dokumentiert | Kein Bezug zu den Sammlungsdaten (5.8) |
| Informationspflicht bei Erhebung nicht bei der betroffenen Person | Art. 14 DSGVO; ggf. Ausnahme nach Art. 14 Abs. 5 lit. b/c bzw. Landesrecht | **Neu gegenüber der Vorlage:** Die Betroffenen geben ihre Daten der eigenen Einheit, nicht dem Meldekopf. Wie sie informiert werden (z. B. über die Datenschutzinformation ihrer Organisation, die den Meldeweg nennt), ist zu regeln (M10) |

> *Entfällt gegenüber der Vorlage:* „Freiwillige Absenderkarte, Art. 6
> Abs. 1 lit. a (Einwilligung)" als eigene Verarbeitung — der Meldekopf bietet
> keine Absenderkarte zum Ausfüllen an. Empfangene Absenderkarten fremder
> Sender stützen sich beim Meldekopf auf dieselbe Grundlage wie der Bogen.

> *Prüfvermerk:* Der Kopfkommentar von `src/app/statistik.ts` nennt Art. 6
> Abs. 1 lit. f DSGVO und begründet, weshalb § 25 TDDDG nicht greift
> (keine Cookies, kein Storage-Zugriff durch GoatCounter, keine
> geräteübergreifende ID). Die App selbst legt den Widerspruch unter `skipgc`
> im `localStorage` ab; das ist ein auf Wunsch gespeicherter Eintrag (§ 25
> Abs. 2 Nr. 2 TDDDG), kein Zugriff des Messdienstes.

### 5.7 Speicherdauer und Löschung

Alle Fristen rechnen mit der **geprüften Geräteuhr** (`datenschutz-uhr.ts`,
`uhr-korrektur.ts`, `uhr-folgen.ts`, `uhr-warnung.tsx`): Weicht die Uhr um
mehr als 60 Tage vom letzten Start ab, vor oder zurück, löscht und
anonymisiert die App nichts, bis der Helfer „Geräteuhr stimmt" bestätigt —
nach einer Rückfrage, die die Folgen in Zahlen und die betroffenen
Sammlungen beim Namen nennt — oder bis die Uhr wieder passt. Ein Sprung wird
nie durch bloßen Zeitablauf übernommen; ein Sprung nach vorn, der nichts
fällig macht, schon.

| Speicherort | Inhalt | Personendaten | Frist / Löschweg |
| --- | --- | --- | --- |
| `eeb.einsaetze.v1` | Sammlungen mit allen Meldungen, Fassungen, Rohpayload, Signaturnachweis, Zusätzen der Führungsstelle; Papierkorb als Markierung | **Ja, Kernbestand** | Datenschutzfrist je Meldung 90 Tage nach `stand` (Übungsbögen ausgenommen); Aufräumfrist 90 Tage ohne Änderung der Sammlung (Ankündigung ab Tag 60); Papierkorb 30 Tage; „Entfernen" je Einheit; „Einsatz löschen"; „Alle Daten löschen" |
| `eeb.entwurf.v1`, `eeb.entwurf.ersetzt.v1` | Angefangene Schnellerfassung (seit Phase 4, mit Zettel-Angaben); Rückholplatz nur aus einer Erfassungsbogen-Sicherung | Ja (Führungskraft) | Übernehmen oder „Erfassung verwerfen…“ leert den Entwurf; Datenschutzfrist beim Lesen; „Alle Daten löschen"; ein eigener Bogen aus einer Sicherung wird vor dem Ersetzen genannt (R13) |
| `eeb.entwurf.beschaedigt.v1`, `eeb.unlesbar.v1` | Beiseitegelegter unlesbarer Bestand | Möglich | 90 Tage ab Beiseitelegen; „Beiseitegelegtes entfernen…"; „Alle Daten löschen" |
| `eeb.vorlagen.v1` (und ggf. `eeb.musterung.v1`) | Vorlagen aus einer Erfassungsbogen-Sicherung | **Ja (ganze Mannschaften)** | **Keine Datenschutzfrist** (Vorlagen sind wie im Erfassungsbogen ausgenommen); Papierkorbfrist 30 Tage nur für bereits gelöschte; sonst nur „Alle Daten löschen" oder Einspielen einer anderen Sicherung (R13) |
| `eeb.absenderkarte.v1` | Eigene Absenderkarte aus einer Erfassungsbogen-Sicherung | Ja | Keine Frist, nicht einzeln löschbar; „Alle Daten löschen" (R13) |
| `eeb.geraeteschluessel.v1` | Privater Signaturschlüssel des Meldekopfs | Nein (für sich) | „Geräteschlüssel neu erzeugen…"; „Alle Daten löschen" |
| `eeb.export-stand.v2`, `eeb.lageblatt-stand.v1`, `eeb.weitergabe-stand.v1`, `eeb.kenntnis-stand.v1`, `eeb.entfernt.v1` | Kennungen, Prüfsummen, Zeitpunkte | Nein | Bereinigt um gelöschte Sammlungen; „Alle Daten löschen" |
| `eeb.aufgeraeumt.v1` | Name, Zeitraum, Zahlen einer aufgeräumten Sammlung | Nein (Sammlungsname als Freitext) | bis „Verstanden"; „Alle Daten löschen" |
| `eeb.letzterEinsatz.v1` | Zuletzt offene Sammlung | Nein | 12 Stunden gültig |
| `eeb.lagebeginn.v1`, `eeb.lagefunkruf.v1`, `eeb.lagestufe.v1` | Lagemonitor: Beginn, Funkrufname der Führungsstelle, Helligkeit | Nein vorgesehen | Einträge zu gelöschten Einsätzen fallen beim Schreiben weg; „Alle Daten löschen" |
| `eeb.uhr.v1`, `eeb.sicherung.zuletzt.v1`, `eeb.anzeigemodus.v1`, `eeb.einheiten-ansicht` | Uhrstand, letzte Sicherung, Anzeige | Nein | „Alle Daten löschen" |
| `skipgc` | Widerspruch gegen die Reichweitenmessung | Nein | Bleibt bei „Alle Daten löschen" bewusst stehen; Löschen der Websitedaten |
| `sessionStorage`: `eeb.papierabgleich.v1.<Einsatz>` | Eingaben des Papier-Abgleichs (Nummer, Zeiten, Status, Zug, Notiz) | Möglich (Notiz) | Tab-Ende, Übernehmen, Verwerfen, „Alle Daten löschen"; nicht in der Sicherung |
| `sessionStorage`: `eeb.wartet.fragment`, `eeb.vorbelegung.rueckweg`, `eeb.fahrzeug.rueckweg`, `eeb.ebene.rueckweg` | Wartender Link (ganzer Bogen, seit Phase 3); Rückwege der Schnellerfassung nach „Vorbelegung“, „Fahrzeug“ oder „Ebene entfernen“ (seit Phase 4) | Ja bzw. möglich (Kennzeichen, Kontakt einer Ebene) | bis zur Antwort bzw. 15 Minuten; Tab-Ende; „Alle Daten löschen" leert alle `eeb.`-Einträge des Sitzungsspeichers |
| Arbeitsspeicher | Rückweg nach „Entfernen" einer Meldung; Teile mehrteiliger Bögen beim Bilderstapel (höchstens eine Stunde) | Ja | Neuladen, Schließen der Quittung; bewusst kein dauerhafter Papierkorb für einzelne fremde Meldungen |

Ergänzend:

- **Was die Datenschutzfrist entfernt:** Namen, Funktionen,
  Zusatzqualifikationen, Fahrerlaubnisse, Kontakte der Personen,
  Telefon/E-Mail der Ebenen, „Sonstiges"; bei Meldungen zusätzlich
  Rohpayload und Signaturnachweis (mit der Absenderkarte des Senders).
  Stärke, Unterbringung, Verpflegung bleiben als Zahlen. Die Regel liegt im
  Kern (`@bos/eeb-format/datenschutzfrist`, angewendet in
  `@bos/meldekopf/einsaetze` bei jedem Lesen) und greift damit auch für
  Sammlungen, die aus dem Erfassungsbogen übernommen wurden.
- **Was sie nicht entfernt:** die **Zusätze der Führungsstelle** (Notiz,
  Vermerke mit Vorwerten), die Freitext mit Personenbezug tragen können; sie
  leben so lange wie die Meldung bzw. Sammlung (höchstens bis zur
  Aufräumfrist, 90 Tage nach der letzten Änderung der Sammlung). Ebenso nicht
  Vorlagen und die eigene Absenderkarte aus einer Erfassungsbogen-Sicherung.
- **Grenze:** QR-Codes, eingebettetes JSON der PDFs, CSV/Excel,
  Einsatz-Dateien und Sicherungsdateien bleiben unverändert und
  unverschlüsselt. Die Frist ist eine Speicherbegrenzung in der App, keine
  Anonymisierung weitergegebener Kopien.
- **Sicherung einspielen** übernimmt den Uhrstand der Datei nicht und nennt
  vorher, was von einer alten Datei sofort wieder unter die Fristen fällt —
  eine alte Sicherung bringt nur, was nach den Fristen übrig bleibt.
- **Verfügbarkeit:** Die Web-App bittet um dauerhaften Speicher, sobald
  Sammlungen mit Meldungen vorliegen, und erinnert nach drei Tagen ohne
  Sicherung. Das verlängert keine Frist; es verhindert nur, dass der Browser
  fremde Meldungen räumt, bevor sie weitergegeben sind. Die
  Sicherungsdatei selbst enthält alle Personendaten und den privaten
  Schlüssel; ihre Ablage ist organisatorisch zu regeln (M3).
- **Empfehlung:** Nach Einsatzende Sammel-PDF bzw. Einsatz-Datei an die
  zuständige Stelle geben, die Weitergabe im Einsatztagebuch vermerken und
  die Sammlung auf dem Meldekopf-Gerät löschen, statt auf die Aufräumfrist zu
  warten (M4).

> *Prüfvermerk zur Absenderkarte (Widerspruch Doku ↔ Code):*
> `docs/architektur.md` Kap. 8.2 sagt, die Absenderkarte als Sender bleibe
> beim Erfassungsbogen. Im Code liest `qrErzeugen` (`src/app/hilfen.ts`) die
> Absenderkarte des Geräts bei jedem Signieren und Gegenzeichnen, und
> Sammel-PDF und Einzel-PDF (`weitergabe/pdf.ts`) rufen es auf. Kommt mit
> einer Erfassungsbogen-Sicherung eine Absenderkarte auf das Gerät, gehen
> deren Name, E-Mail und Telefon mitsigniert in jeden QR-Code der Sammel-PDF —
> an Empfänger, für die die Einwilligung der Person nie gedacht war, und ohne
> dass die App die Karte zeigt oder einzeln löschen lässt. Es gilt der Code
> (R13, M11).
>
> *Erledigt 2026-10-25:* Der Meldekopf signiert ohne Absenderkarte (`hilfen.ts`,
> Test in `hilfen.test.ts`); die Karte eines ursprünglichen Absenders bleibt in
> dessen Stufe.

> *Prüfvermerk zur Übung:* `docs/funktionsumfang.md` sagt, für einen als
> Übung gekennzeichneten Bogen **oder Einsatz** greife die Datenschutzfrist
> nicht. Im Kern entscheidet nur der Haken „Übung" am Bogen; eine Sammlung der
> Art „Übung" nimmt ihre Meldungen nicht aus. Es gilt der Code — das ist die
> datenschutzfreundlichere Lesart, verdient aber eine Klarstellung in der
> Funktionsumfang-Doku.

### 5.8 Empfänger und Datenübermittlung an Dritte

| Übermittlung | Ziel | Enthält Personendaten? | Rechtsgrundlage/Anmerkung |
| --- | --- | --- | --- |
| Sammel-PDF (Papier oder Datei) | Übergeordnete Führungsstelle, Ablösung, Einsatztagebuch | **Ja — Vollkopie** aller Bögen und der Sammlung samt Notizen und Vermerken | Zweckgemäß (5.6); Nachtrag „nur neue" reduziert den Umfang |
| Lageblatt | Aushang an der Wand, Klemmbrett, Ablösung | Ja — Einheiten mit Funkrufname, **Rückrufnummer mit Initial und Nachname der Führungskraft**, Notiz, gekürzte Bemerkung | Aushangort festlegen (M9) |
| Übersichts-CSV | Lagekarte, Stab | Ja (Notiz, Bemerkung, Hinweise; keine Personenliste) | Zweckgemäß |
| CSV mit allen Daten | Stab, Auswertung | **Ja — jede Person mit Namen, Funktionen, Erreichbarkeiten** | Nur wo erforderlich (M7) |
| Excel-Liste „Oldenburg" | Führungsstelle mit dieser Vorlage | Ja (Einheit, Führungskraft mit Kontakt, Zeiten, Notiz) | Zweckgemäß |
| Einsatz-Datei | S1-Control, zweites Meldekopf-Gerät | **Ja — Vollkopie** der Sammlung | Zweckgemäß; unverschlüsselt, unsigniert |
| Datensicherungsdatei | Vom Nutzer gewählt (zweites Gerät, Speichermedium) | **Ja — Vollkopie des Geräts** einschließlich privatem Schlüssel und ggf. Fremdbestand | Kein Empfänger im Meldeweg; Ablage regeln (M3) |
| QR-Codes in den PDFs | Wer die PDF bzw. den Ausdruck erhält | Ja — der Bogen der Einheit, Signaturkette, ggf. Absenderkarte (R13) | wie Sammel-PDF |
| Lagemonitor | Personen im Raum bzw. am Fahrzeug | Nein (keine Personennamen; Einheiten, Orte, Funkrufnamen, Stärke) | Keine Übermittlung, aber Offenlegung durch Anzeige (R12) |
| GoatCounter-Zählimpuls | `meldekopf.goatcounter.com` | Nein — nur Pfad (Nutzungskanal, z. B. `/pwa/android`), Titel und im Browser der Referrer; keine Cookies, keine ID, kein Fragment, keine Sammlungsdaten; technisch unvermeidbar die IP-Adresse als Transportdatum | Art. 6 Abs. 1 lit. f DSGVO; Widerspruch per Kästchen „Nicht mitzählen" im Datenschutzdialog (`skipgc`, ab dem nächsten Start) |
| Update-Prüfung (nur Desktop) | GitHub Releases | Nein, nur Verbindungsmetadaten | Berechtigtes Interesse an aktuellem Software-Stand |
| Abruf der Webfassung | GitHub Pages (meldekopf.erfassungsbogen.app) | Nein, nur Verbindungsmetadaten | Auslieferung der Anwendung |

> *Entfällt gegenüber der Vorlage:* „Vorlage teilen" (Link/Datei in
> Messenger oder Cloud) und der zweite Web-Host GitLab Pages auf Open CoDE;
> beides gibt es beim Meldekopf nicht.

> *Prüfvermerk zur GoatCounter-Zählung:* `docs/architektur.md` Kap. 3.2 nennt
> „ein Treffer je Kaltstart". `statistikStarten()` läuft in `main.tsx` auch
> für das Lagemonitor-Fenster; jedes Öffnen des Lagemonitors zählt einen
> weiteren Treffer mit demselben Pfad. Inhaltlich nichts Neues, die Zählung
> ist aber „je Fensterstart". Es gilt der Code.
>
> *Erledigt 2026-10-25:* Das Lagemonitor-Fenster zählt nicht mehr
> (`main.tsx`).

**Offene Detailfrage für die einsetzende Organisation:** Wer im Sinne der
DSGVO für die GoatCounter-Messung verantwortlich ist (der Projektbetreiber,
der die Site `meldekopf.goatcounter.com` führt und im Datenschutzdialog als
Verantwortlicher genannt ist, oder die einsetzende Organisation bei einem
eigenen Build), sollte geklärt werden. Ebenso ist zu prüfen, ob GoatCounter
die IP-Adresse selbst protokolliert; die Aussage „Die IP-Adresse wird nicht
gespeichert" im Datenschutzdialog betrifft einen Dritten und ist aus dem Code
nicht prüfbar.

## 6. Bewertung der Notwendigkeit und Verhältnismäßigkeit (Art. 35 Abs. 7 lit. b DSGVO)

### 6.1 Zweckbindung und Datenminimierung

- Der **Lagemonitor** zeigt nur Zusammenzählungen und Einheitsnamen, keine
  Personen — ausdrücklich, weil ihn jeder sieht (`lagemonitor.ts`).
- Die **Suche** der Einsatzansicht läuft nicht über Personennamen; nur der
  Qualifikations- und Kraftfahrerfilter nennt Namen, weil er dafür da ist.
- **„Nur neue seit dem letzten Export"** je Format verringert die Zahl der
  Kopien beim Empfänger.
- **Rückwege** nach dem Entfernen einer Meldung bleiben im Arbeitsspeicher —
  bewusst kein dauerhafter Papierkorb für fremde Personendaten.
- Die **Schnellerfassung** kommt ohne Personenliste aus: Stärke als
  Zähler, eine Führungskraft, Fahrzeuge. Namenslisten entstehen nur im
  Erfassungsbogen.
- Die **Notiz der Führungsstelle** reist nie im QR-Code, nur in Sammel-PDF,
  Lageblatt und Tabellen.
- CSV und Excel sind gegen Formel-Injection gesichert (Integrität beim
  Empfänger).
- **Grenze:** Notiz/Auftrag ist Freitext ohne Begrenzung des Inhalts; die
  CSV mit allen Daten führt jede Person mit Erreichbarkeit. Beides ist
  zweckmäßig, aber organisatorisch zu begrenzen (M7).

> *Entfällt gegenüber der Vorlage:* Opt-in der Absenderkarte und
> QR-Kapazitätsgrenze als Druck gegen unnötige Felder — beides wirkt beim
> Erfassen des Bogens, also im Erfassungsbogen.

### 6.2 Richtigkeit und Speicherbegrenzung

**Richtigkeit** (Art. 5 Abs. 1 lit. d DSGVO) ist am Meldekopf zugleich
Einsatzsicherheit: Welche Fassung einer Einheit gilt, entscheidet eine
App-Regel über der Kern-Regel (`fassung-vorrang.ts`); jede Handlung der
Führungsstelle steht als Vermerk mit Uhrzeit; abgerückte Einheiten bleiben
sichtbar, zählen aber nicht; die Ausgaben kennzeichnen Nachträge,
Sollstärke „nicht gemeldet" und tragen kyrillische und griechische Namen in
Umschrift; Schema-Migrationen halten alte Bögen lesbar.

**Speicherbegrenzung** (Art. 5 Abs. 1 lit. e DSGVO) ist technisch umgesetzt
(5.7): Datenschutzfrist je Meldung, Aufräumfrist je Sammlung, Papierkorb,
alles über die geprüfte Uhr — Datenschutz durch Technikgestaltung (Art. 25
DSGVO). Drei Einschränkungen bleiben:

- **Übungsbögen** sind ausgenommen (R11/M11).
- **Zusätze der Führungsstelle** und **Fremdbestand** aus einer
  Erfassungsbogen-Sicherung (Vorlagen, eigene Absenderkarte) erreicht die
  Datenschutzfrist nicht (R13).
- **Kein Schutz gegen Absicht:** Wer die Uhr zurückstellt oder Ausgaben mit
  eigenen Werkzeugen liest, umgeht die Frist.

### 6.3 Betroffenenrechte in einem dezentralen System — strukturelle Grenze

Weil es keine zentrale Instanz gibt, die alle Kopien eines Bogens kennt, kann
niemand nach einer Weitergabe zusichern, wo überall Kopien liegen. Beim
Meldekopf wiegt das schwerer als beim Erfassungsbogen:

- **Informationspflicht (Art. 14 DSGVO):** Die Betroffenen haben ihre Daten
  der eigenen Einheit gegeben. Dass sie am Meldekopf einer anderen
  Organisation gespeichert, gezählt und weitergegeben werden, erfahren sie
  nur, wenn ihre Organisation den Meldeweg in ihrer Datenschutzinformation
  nennt (M10).
- **Auskunft (Art. 15):** nur gegenüber der Stelle, bei der die Daten liegen —
  ein Meldekopf-Gerät pro Einsatz, ggf. mehrere nacheinander (Ablösung).
- **Löschung (Art. 17):** Der Meldekopf kann eine Meldung entfernen und die
  Sammlung löschen; Sammel-PDF, Einsatz-Datei, Lageblatt und Sicherungen beim
  Empfänger erreicht er nicht.
- **Berichtigung (Art. 16):** wirkt nur auf künftige Ausgaben. Eine
  Folgemeldung der Einheit ersetzt die alte Fassung, die alte bleibt in der
  Historie, bis die Meldung entfernt wird.

Das ist kein Software-Mangel, sondern die Kehrseite der Architektur (kein
Server, kein zentraler Angriffspunkt, volle Funktion ohne Netz).
**Empfehlung:** Ausgaben des Meldekopfs wie das bisherige Papier behandeln
(Aufbewahrung, Vernichtung, Vermerk im Einsatztagebuch) und
Verfahrensanweisungen für Auskunfts- und Löschanfragen festlegen, die
Ablösung und Stab einschließen (M5).

### 6.4 Transparenz

Die App enthält einen Datenschutzdialog in der Fußzeile und die Seite
`public/datenschutz.html`. Beide beschreiben die Verarbeitung durch den
**Betreiber der Website** (Auslieferung, GoatCounter) und weisen auf die
Verantwortung der einsetzenden Stelle hin (Abschnitt 5 der Seite). Eine
Datenschutzinformation für die **Betroffenen am Meldekopf** ersetzen sie
nicht; die muss die einsetzende Organisation stellen (M10).

> *Prüfvermerk (Doku in der App ↔ Code):* Datenschutzdialog
> (`src/app/fusszeile.tsx`, Abschnitt 4) und `public/datenschutz.html`
> (Abschnitt 4) sagen: „Sobald die App Einsatz-Sammlungen führt, liegen auch
> diese dort; der Datenschutzhinweis wird dann erweitert." Seit Phase 2 führt
> die App Sammlungen (`eeb.einsaetze.v1`, Datensicherung, Ausgaben). Die
> angekündigte Erweiterung um Speicherdauer, Fristen und Löschwege fehlt
> noch; der Dialog nennt als Löschweg nur das Löschen der Websitedaten, nicht
> „Alle Daten löschen". Es gilt der Code; die Texte sind nachzuziehen (M10).
>
> *Erledigt 2026-10-25:* Datenschutzdialog und `public/datenschutz.html`
> nennen jetzt die Sammlungen, die Fristen (90 Tage Anonymisierung, 90 Tage
> Aufräumen, 30 Tage Papierkorb) und „Alle Daten löschen". Eine Fassung der
> Informationspflicht nach Art. 14 für die einsetzende Organisation bleibt
> offen (M10).

## 7. Risikobewertung (Art. 35 Abs. 7 lit. c DSGVO)

Schutzziele in Anlehnung an das Standard-Datenschutzmodell (SDM):
Vertraulichkeit (V), Integrität (I), Verfügbarkeit (Vf), Transparenz (T),
Intervenierbarkeit (Iv), Nichtverkettung (N).

| # | Risiko | Schutzziel | Eintrittswahrscheinlichkeit | Schwere für Betroffene | Gesamt |
| --- | --- | --- | --- | --- | --- |
| R1 | Verlust/Diebstahl eines Meldekopf-Geräts mit unverschlüsseltem `localStorage` → Zugriff auf alle Sammlungen (Personendaten aller Einheiten eines oder mehrerer Einsätze), Notizen, Schlüssel | V | Mittel (Tablet am Eingang, im ELW, auf der Motorhaube) | **Mittel-Hoch** (neu bewertet; Vorlage: Niedrig-Mittel): viele Betroffene; begrenzt durch die 90-Tage-Fristen | **Mittel-Hoch** |
| R2 | Verlust/Fehlleitung einer Vollkopie: Sammel-PDF, Einsatz-Datei, CSV mit allen Daten, Excel, **Datensicherungsdatei** | V | Mittel | **Hoch** (neu bewertet; Vorlage: Mittel): Vollkopie mit allen Personen; bei der Sicherung samt Schlüssel | **Hoch** |
| R3 | Kein technisch erzwungener Löschzeitpunkt für Teile des Bestands: Zusätze der Führungsstelle bis zur Aufräumfrist; Übungsbögen, Vorlagen, eigene Absenderkarte unbefristet | Vf/T | Niedrig-Mittel | Niedrig-Mittel | Niedrig-Mittel |
| R4 | Auslesen des privaten Signaturschlüssels (Gerät oder Sicherungsdatei) → Gegenzeichnen im Namen des Meldekopfs | I | Niedrig | Niedrig (TOFU; austauschbar über „Geräteschlüssel neu erzeugen…") | Niedrig |
| R5 | ~~Speicher-Überlastung durch präparierte Import-Datei~~ — QR-Payload über `inflateRawBegrenzt` (4 MiB), PDF-Ströme und -Bilder mit eigenem Deckel in `@bos/eeb-satz` (Phase 3 geprüft) | Vf | Niedrig | Niedrig | Sehr niedrig |
| R6 | Verkettbarkeit: Funkrufnamen, Kennzeichen, Namen und Qualifikationen in Sammel-Exporten machen Personen über mehrere Einsätze wiedererkennbar; beim Meldekopf über viele Organisationen | N | Mittel (neu bewertet; Vorlage: Niedrig-Mittel) | Niedrig | Niedrig-Mittel |
| R7 | Fehlende eigene Zugriffssperre der App (verlässt sich auf Gerätesperre) | V | Mittel | Mittel (Meldekopf-Gerät wird am Eingang oft entsperrt liegen gelassen) | Mittel |
| R8 | Strukturelle Grenze der Betroffenenrechte; Betroffene wissen nicht, dass der Meldekopf ihre Daten hält (Art. 14) | Iv/T | Hoch (systembedingt) | Niedrig-Mittel | **Mittel** (neu bewertet; Vorlage: Niedrig-Mittel) |
| R9 | GoatCounter, Update-Prüfung und Seitenabruf als einzige Netzkontakte — Metadaten (IP-Adresse) bei Dritten | T | Hoch (jeder Start, jedes Lagemonitor-Fenster) | Sehr niedrig | Niedrig |
| R10 | Unumkehrbarer Verlust der Personendaten im laufenden Einsatz durch falsche Geräteuhr oder eine Lage, deren Bögen länger als 90 Tage nicht fortgeschrieben werden | Vf | Niedrig (Uhrsprünge ab 60 Tagen nie ohne Bestätigung; Ankündigung der Aufräumfrist ab Tag 60) | Niedrig-Mittel (Stärke und Summen bleiben) | Niedrig |
| R11 | Übungsbögen sind von der Frist ausgenommen — mit echten Personaldaten liegen sie unbefristet in der Sammlung, bis Aufräumfrist oder Löschung | V | Mittel | Niedrig-Mittel | Niedrig-Mittel |
| R12 | **Neu:** Offenlegung der Lage gegenüber Umstehenden über den Lagemonitor (Fernseher im Raum, am Fahrzeug, fotografiert); Einheitsnamen als Freitext können im Einzelfall Personennamen tragen | V | Hoch (bestimmungsgemäß sichtbar) | Niedrig (keine Personennamen vorgesehen) | Niedrig-Mittel |
| R13 | **Neu:** Unsichtbarer Fremdbestand aus einer eingespielten Erfassungsbogen-Sicherung: Vorlagen ganzer Mannschaften ohne Frist, Entwurf, eigene Absenderkarte — ohne Anzeige; die Absenderkarte reiste bis 2026-10-25 ungefragt in jedem QR-Code der Sammel-PDF mit (behoben) | V/T/Iv | Mittel (ADR-007 nennt die Sicherung als Übernahmeweg; seit Phase 3 gibt es die Einsatz-Datei als Alternative) | Mittel | **Mittel** |
| R14 | **Neu:** Anwesenheitsprotokoll — Eintreff-/Abrückzeiten, Status und Vermerke je Einheit mit Personalliste lassen nachträglich erkennen, wer wann im Einsatz war; Zweckänderung (z. B. Leistungs- oder Verhaltenskontrolle) | N/Iv | Niedrig | Mittel | Niedrig-Mittel |
| R15 | **Neu:** Doppelbestand während der Übernahme — Sammlung bleibt im Erfassungsbogen (andere Herkunft) und in Sicherungsdateien liegen, nachdem sie im Meldekopf läuft | V/Iv | Mittel (Übergangszeit) | Niedrig-Mittel | Niedrig-Mittel |

**Höchste Einzelrisiken:** R2 (Vollkopien außer Haus), R1 (Geräteverlust),
R8 und R13 (Transparenz und unsichtbarer Bestand) — R1, R2 und R8 primär
organisatorisch, R13 technisch zu mindern.

## 8. Abhilfemaßnahmen (Art. 35 Abs. 7 lit. d DSGVO)

| # | Bezug | Maßnahme | Art | Verantwortlich | Restrisiko nach Umsetzung |
| --- | --- | --- | --- | --- | --- |
| M1 | R1, R7 | Verbindliche Bildschirmsperre am Meldekopf-Gerät, kurze Sperrzeit; Geräteverschlüsselung; Gerät nie unbeaufsichtigt entsperrt | Organisatorisch/technisch | `[Organisation/IT-Verantwortliche/r]` | Niedrig-Mittel |
| M2 | R1, R4 | Perspektivisch: sensible Daten über plattformeigene sichere Speicher (Electron `safeStorage`, Schlüsselbund) statt `localStorage`; Sicherungsdatei optional verschlüsselt — Hinweis an den Projektbetreiber | Technisch (Weiterentwicklung) | `[Projektbetreiber/Maintainer]` | Niedrig (nach Umsetzung) |
| M2a | R4 | Bei Verdacht „Geräteschlüssel neu erzeugen…" und neue Kurzform an Stab und Ablösung geben | Organisatorisch (technische Grundlage vorhanden) | `[Organisation]` | Niedrig |
| M3 | R2 | Dienstanweisung: Sammel-PDF, Lageblatt, Einsatz-Datei, CSV/Excel und **Datensicherungsdateien** wie das bisherige Papier behandeln (Aufbewahrung, Zugriffsschutz, dokumentierte Vernichtung); zulässige Ablageorte und Übergabewege festlegen, keine privaten Messenger | Organisatorisch | `[Organisation]` | Mittel |
| M4 | R3 | Datenschutzfrist, Aufräumfrist und Papierkorb sind technisch umgesetzt. Für die Organisation: nach Einsatzende Übergabe dokumentieren und die Sammlung aktiv löschen; Frist für Papierausdrucke und Exporte festlegen | Technisch (umgesetzt) / Organisatorisch | `[Organisation/Datenschutzbeauftragte/r]` | Niedrig |
| M5 | R8 | Verfahrensanweisung für Auskunfts- und Löschanfragen, die Ablösung, Stab und weitergegebene Ausgaben einschließt | Organisatorisch | `[Organisation/Datenschutzbeauftragte/r]` | Niedrig-Mittel |
| M6 | R5 | Erledigt (Phase 3): QR-Eingänge über `inflateRawBegrenzt`; die PDF-Ströme liefen ungedeckelt und haben seitdem einen eigenen Deckel. Bei jedem neuen Eingang erneut prüfen | Technisch | `[Projektbetreiber/Maintainer]` | Sehr niedrig |
| M7 | R6, 4.1 (b) | Freitexte (Notiz/Auftrag) knapp und sachlich, keine Gesundheitsangaben; CSV mit allen Daten nur auf Anforderung; in organisationsübergreifenden Exporten prüfen, ob Kennzeichen und Personenlisten nötig sind | Organisatorisch | `[Meldekopf-Verantwortliche/r]` | Niedrig |
| M8 | R7 | App-eigene Sperre ist nicht vorgesehen — über M1 sicherstellen | Organisatorisch | `[Organisation]` | Niedrig-Mittel |
| M9 | R9, 5.8; Lageblatt | Verantwortlichkeit für die GoatCounter-Messung klären; alternativ „Nicht mitzählen" auf allen Meldekopf-Geräten setzen. Aushangort des Lageblatts (Rückrufnummern) festlegen | Organisatorisch/rechtlich | `[Organisation/Datenschutzbeauftragte/r]` | Sehr niedrig |
| M10 | R8, 6.4 | Datenschutzinformation nach Art. 13/14 für die Betroffenen: die eigene Organisation nennt den Meldeweg (Meldekopf, Stab) in ihrer Information für Helfende; der Meldekopf-Betreiber hält eine Kurzinformation vor (Aushang am Meldekopf). **Projekt:** Datenschutzdialog und `datenschutz.html` um Sammlungen, Fristen und „Alle Daten löschen" ergänzen (Prüfvermerk 6.4) | Organisatorisch / technisch | `[Organisation]` / `[Projektbetreiber]` | Niedrig-Mittel |
| M11 | R11, R13 | Übungen: nur Daten eintragen, deren unbefristete Speicherung vertretbar ist; nach der Übung löschen. Fremdbestand: für die Übernahme aus dem Erfassungsbogen die Einsatz-Datei bevorzugen („Einsatz importieren…“); bei einer Sicherung die Rückfrage lesen und kein Gerät mit eigenen Vorlagen als Quelle nehmen. **Projekt:** Absenderkarte nicht mitsignieren — erledigt 2026-10-25; offen: Vorlagen beim Einspielen wahlweise weglassen | Organisatorisch / technisch (Weiterentwicklung) | `[Organisation]` / `[Projektbetreiber]` | Niedrig |
| M12 | R10 | Bei Lagen über 90 Tage Bögen fortschreiben oder rechtzeitig als Sammel-PDF sichern; die App kündigt die Aufräumung ab Tag 60 an | Organisatorisch | `[Meldekopf]` | Niedrig |
| M13 | R12 | Lagemonitor nicht zum Publikum aufstellen, bei Publikumsverkehr dimmen oder abschalten; Einheitsnamen ohne Personennamen erfassen | Organisatorisch | `[Organisation/Einsatzleitung]` | Niedrig |
| M14 | R14 | Zweckbindung festschreiben: Anwesenheitsdaten der Sammlung nur für Lageführung, Versorgung und Einsatzdokumentation, nicht zur Leistungs- oder Verhaltenskontrolle; Personalvertretung einbinden (9) | Organisatorisch | `[Organisation/Personalvertretung]` | Niedrig |
| M15 | R15 | Nach der Übernahme in den Meldekopf die Sammlung im Erfassungsbogen und die Sicherungsdatei löschen; Übergangszeit kurz halten (ADR-007) | Organisatorisch | `[Organisation]` | Niedrig |

## 9. Konsultation

- **Interne Konsultation (Art. 35 Abs. 2 DSGVO):** Diese Vorlage ist vor
  Freigabe der/dem Datenschutzbeauftragten vorzulegen. Wurde sie eingeholt?
  `[Ja/Nein, Datum, Name]`
- **Abstimmung mit den Quell-Organisationen:** Wo regelmäßig Einheiten
  anderer Organisationen am Meldekopf eintreffen (Kreisebene, Bereitstellungs-
  raum), sollten deren Datenschutzbeauftragte den Meldeweg kennen (M10).
  `[ggf. Abstimmung dokumentieren]`
- **Anhörung Betroffener/Personalvertretung** (soweit einschlägig, wegen R14):
  `[Personalrat/Betriebsrat/Vertrauensleute einbinden]`
- **Konsultation der Aufsichtsbehörde (Art. 36 DSGVO):** Nur erforderlich,
  falls nach Umsetzung der Maßnahmen ein hohes Restrisiko verbleibt. Nach
  dieser Einschätzung ist das nicht der Fall — vorbehaltlich der Bestätigung
  durch die/den Datenschutzbeauftragte/n.

## 10. Ergebnis und Freigabe

**Gesamteinschätzung:** Unter der Voraussetzung, dass die in Abschnitt 8
aufgeführten Maßnahmen — insbesondere M1, M3, M4, M5 und M10 — umgesetzt
werden, verbleibt ein **gering-mittleres Restrisiko** für die Rechte und
Freiheiten der betroffenen Personen. Ein hohes Risiko im Sinne des Art. 36
DSGVO wird nicht gesehen.

Gegenüber der DSFA des Erfassungsbogens:

- **Schwerer:** R1, R2, R6 und R8, weil der Meldekopf fremde Personendaten
  vieler Einheiten bündelt und Vollkopien weitergibt; die
  Erforderlichkeitsprüfung kommt zu „in der Regel erforderlich".
- **Neu:** R12 (Lagemonitor), R13 (Fremdbestand und Absenderkarte aus einer
  Erfassungsbogen-Sicherung), R14 (Anwesenheitsprotokoll), R15
  (Doppelbestand in der Übergangszeit), mit den Maßnahmen M10 bis M15.
- **Gleich:** die technisch erzwungenen Fristen über die geprüfte Uhr (R3,
  R10) — sie sind aus dem Erfassungsbogen übernommen und hier die wichtigste
  technische Entlastung.
- **Mit den Phasen fortzuschreiben:** Eingänge, wartender Link und
  Signaturprüfung (Phase 3), Schnellerfassung und Link zum Erfassungsbogen
  (Phase 4; beide fortgeschrieben 2026-10-25), Android-Hülle (Phase 5, fortgeschrieben 2026-10-25).

Diese Einschätzung ersetzt keine rechtliche Prüfung.

| Rolle | Name | Datum | Unterschrift |
| --- | --- | --- | --- |
| Verantwortlicher/Leitung | `[Name]` | | |
| Datenschutzbeauftragte/r | `[Name]` | | |
| Ersteller/in dieses Entwurfs | KI-gestützte Analyse, fachlich zu verantworten durch `[Name]` | 2026-10-25 | |

## Anhang: Herangezogene Quellen

- Vorlage: `docs/datenschutz-folgenabschaetzung.md` des Erfassungsbogens, Commit `441811c`
- `vendor/eeb-format/src/model.ts`, `vendor/eeb-format/src/datenschutzfrist.ts`, `vendor/eeb-format/src/signatur.ts` — Felder, Frist, Signatur
- `vendor/bos-meldekopf/src/einsaetze.ts`, `vendor/bos-meldekopf/src/papierkorb.ts` — Sammlung, Fristen, Papierkorb
- `src/app/datenschutz-uhr.ts`, `src/app/uhr-korrektur.ts`, `src/app/uhr-folgen.ts`, `src/app/papierkorb-frist.ts`, `src/app/aufraeum-hinweis.ts` — geprüfte Uhr und Fristen
- `src/app/eintrag-zeiten.ts`, `src/app/fassung-vorrang.ts`, `src/app/entfernte-meldungen.ts`, `src/app/letzter-einsatz.ts` — Zusätze der Führungsstelle, Entfernen
- `src/app/sicherung.ts`, `src/app/sicherung-datei.ts`, `src/app/daten-gruppe.tsx` — Datensicherung, Einspielen, Alle Daten löschen
- `src/app/geraete-schluessel.ts`, `src/app/hilfen.ts` (`qrErzeugen`), `src/app/absenderkarte.ts` — Schlüssel, Gegenzeichnen, Absenderkarte
- `src/app/vorlagen.ts`, `src/app/uebergabe-stand.ts`, `src/app/entwurf.ts`, `src/app/eingang/unlesbar.ts` — Fremd- und Restbestand
- `src/app/weitergabe/*`, `src/app/einsatz-ansicht.tsx` — Ausgabewege
- `src/app/lagemonitor*.ts(x)` — Lagemonitor
- `src/app/statistik.ts`, `src/app/adressen.ts`, `src/app/fusszeile.tsx`, `public/datenschutz.html`, `vite.config.ts` — Reichweitenmessung, Widerspruch, CSP
- `PRODUCT.md`, `docs/architektur.md`, `docs/funktionsumfang.md`, `docs/uebernahme-aus-erfassungsbogen.md` dieses Repositorys
- [Informationssicherheitskonzept](informationssicherheitskonzept.md) dieses Projekts
