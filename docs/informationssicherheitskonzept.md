# Informationssicherheitskonzept

**Meldekopf-App — Vorlage/Entwurf**
Grundlage: Repository `wattnpapa/meldekopf`, Stand 2026-10-25, Phase 2 — Version 0.1 (Entwurf)

> **Herkunft dieses Dokuments.** Übernommen aus der Vorlage des
> Erfassungsbogens (`docs/informationssicherheitskonzept.md` im Repository
> `wattnpapa/erfassungsbogen`, Commit `441811c`) und auf die Meldekopf-App
> zugeschnitten. Gliederung, Bewertungsschema und Maßnahmennummern folgen der
> Vorlage, damit eine Organisation, die beide Apps einsetzt, beide Konzepte
> nebeneinanderlegen kann. Was für den Meldekopf nicht zutrifft, ist gestrichen
> oder als „entfällt (Grund)" gekennzeichnet. Die Nachtragshistorie der
> Vorlage (Audit-Runden 2 bis 9 des Erfassungsbogens) ist nicht übernommen;
> ihre Ergebnisse stecken in den übernommenen Modulen und sind dort im
> Kopfkommentar je Datei begründet.
>
> **Stand 2026-10-25, Phase 2 („Sammlung lesen und zeigen").** Die technischen
> Aussagen wurden gegen den Zweig `claude/phase-2-sammlung` (Commit `1a1151c`)
> und die dort gepinnten Submodule geprüft. Ergänzungen und Abweichungen
> zwischen Begleitdokumenten und Code sind als *Prüfvermerk* gekennzeichnet;
> wo Doku und Code sich widersprechen, gilt der Code.
>
> **Wächst mit dem Code.** Die Eingänge (Kamera-Scan, USB-Handscanner,
> Bilderstapel, Datei/PDF, Link) sind seit Phase 3 live, die Schnellerfassung
> kommt mit Phase 4, die Android-Hülle mit Phase 5 (Reihenfolge in
> [uebernahme-aus-erfassungsbogen.md](uebernahme-aus-erfassungsbogen.md),
> Abschnitt G). Was noch fehlt, ist hier als **geplant** beschrieben, mit dem Ort, an dem
> sie im Code entstehen. Bei jeder dieser Phasen ist dieses Dokument
> nachzuziehen (`CLAUDE.md`, Tabelle „Begleitdokumente").

## Hinweis zu diesem Dokument

Dies ist eine KI-gestützt erstellte Entwurfsvorlage, keine geprüfte oder
freigegebene Fassung. Grundlage ist eine technische Analyse des öffentlich
einsehbaren Quellcodes des Repositorys `wattnpapa/meldekopf` (Stand siehe
Rahmendaten) samt der eingebundenen Submodule. Das Dokument ersetzt weder die
Bestellung und Mitwirkung einer/eines IT-Sicherheitsbeauftragten noch eine
formale Freigabe durch die Leitung der einsetzenden Organisation.

Die Anwendung hat keinen zentralen Betreiber: Es gibt keinen Server, keine
zentrale Datenhaltung und keine Nutzerkonten — jede Organisation
(THW-Ortsverband, Feuerwehr, Hilfsorganisation, Kommune …) setzt die App
eigenständig auf ihren eigenen Geräten ein, typischerweise auf einem Tablet
oder Notebook am Meldekopf, am Eingang eines Bereitstellungsraums oder im
ELW. Ein pauschales, für alle Organisationen gültiges Sicherheitskonzept kann
es daher nicht geben. Dieses Dokument ist deshalb bewusst als ausfüllbare
Vorlage angelegt: Textstellen in eckigen Klammern, z. B.
`[Name der einsetzenden Organisation]`, markieren durchgängig die Punkte, die
jede Organisation für sich selbst ergänzen oder bestätigen muss —
insbesondere organisatorische Zuständigkeiten, den konkreten
Geräte-/Rollout-Kontext und die endgültige Schutzbedarfsfeststellung.

Struktur und Terminologie orientieren sich an BSI-Standard 200-2
(IT-Grundschutz-Methodik): Strukturanalyse, Schutzbedarfsfeststellung,
Modellierung anhand einschlägiger Bausteine des IT-Grundschutz-Kompendiums,
IT-Grundschutz-Check (Ist-Soll-Vergleich) und ergänzende Risikoanalyse nach
BSI-Standard 200-3 für Zielobjekte mit erhöhtem Schutzbedarf. Es handelt sich
**nicht** um ein vollständiges, auditfähiges IT-Grundschutz-Profil — dafür
fehlen unter anderem die physische und organisatorische Umgebung jeder
einzelnen einsetzenden Organisation, die aus dem Quellcode allein nicht
ableitbar ist.

## 1. Zusammenfassung

Die Meldekopf-App ist eine Offline-first Web-/Desktop-Anwendung für
Meldeköpfe, Bereitstellungsräume und kleine Führungsstellen der BOS. Sie
sammelt die Erfassungsbögen eintreffender Einheiten unter einem Einsatz, zählt
Stärke und Sofortbedarf laufend zusammen, zeigt die Lage auf einem zweiten
Bildschirm (Lagemonitor) und gibt sie als Sammel-PDF, Lageblatt, CSV,
Excel-Liste oder Einsatz-Datei an die nächste Führungsstelle weiter. Sie ist
das mittlere Glied der Produktfamilie Erfassungsbogen, Meldekopf, S1-Control
und übernimmt die Einsatz-Sammlung, die bisher Teil des Erfassungsbogens war.

Die Architektur ist wie beim Erfassungsbogen serverlos: keine zentrale
Infrastruktur, jede Installation eigenständig, Daten wandern nur über einen
physisch/lokal begrenzten Kanal (QR-Code, Datei, Ausdruck, Nahfeld-Freigabe)
zwischen Geräten. Das eliminiert die klassische Server-Angriffsfläche,
verschiebt Vertraulichkeit und Verfügbarkeit aber fast vollständig auf das
einzelne Endgerät.

**Was beim Meldekopf anders ist als beim Erfassungsbogen:** Der
Erfassungsbogen hält vor allem die Daten der *eigenen* Einheit. Der Meldekopf
hält die Personendaten *vieler fremder* Einheiten (Namen, Funktionen,
Fahrerlaubnisse, Erreichbarkeiten), dazu Freitexte der Führungsstelle, über
die Dauer eines Einsatzes, also Stunden bis Tage, gesammelt auf einem Gerät.
Ein einzelnes Meldekopf-Tablet ist damit das Gerät mit dem größten
Datenbestand der ganzen Produktfamilie. Dazu kommen zwei Eigenheiten, die es
im Erfassungsbogen nur am Rand gibt: ein Lagemonitor, der auf einem Fernseher
im Raum für alle Umstehenden sichtbar ist, und eine Datensicherungsdatei, die
den gesamten Gerätebestand samt privatem Signaturschlüssel enthält.

Die technische Analyse zeigt dieselbe sorgfältige Grundhaltung wie beim
Erfassungsbogen, weil die Bausteine von dort übernommen sind: Electron ohne
Node im Renderer, eine restriktive Content-Security-Policy mit genau einem
Fremd-Host, eine Ed25519-Signaturkette, eine gedeckelte Dekomprimierung,
CSV-Formel-Abwehr, technisch erzwungene Lösch- und Anonymisierungsfristen mit
geprüfter Geräteuhr. Offen bleibt wie dort der unverschlüsselt abgelegte
private Signaturschlüssel. Neu bzw. schwerer zu gewichten sind die
Sichtbarkeit des Lagemonitors, die Datensicherungsdatei als Vollkopie und ein
unsichtbarer Restbestand (Vorlagen, Entwurf, Absenderkarte), der mit einer
eingespielten Datensicherung aus dem Erfassungsbogen auf das Gerät kommen
kann (Abschnitte 3.3, 7).

**Gesamteinschätzung dieses Entwurfs:** Unter der Voraussetzung, dass die in
Abschnitt 8 aufgeführten organisatorischen Maßnahmen (insbesondere
Geräteabsicherung, Aufstellung des Lagemonitors, Umgang mit
Sicherungsdateien und Sensibilisierung) umgesetzt werden, ist von einem für
den Einsatzzweck angemessenen Sicherheitsniveau auszugehen. Wegen des
gebündelten Fremdbestands liegt der Schutzbedarf für Vertraulichkeit über dem
des Erfassungsbogens (Abschnitt 4). Eine abschließende Bewertung obliegt
der/dem IT-Sicherheitsbeauftragten der jeweiligen Organisation.

## 2. Rahmendaten

| Feld | Angabe |
| --- | --- |
| Bezeichnung des Informationsverbunds | Meldekopf-App (App „Meldekopf", meldekopf.erfassungsbogen.app) |
| Verantwortlich für IT-Sicherheit | `[Name der einsetzenden Organisation, z. B. „THW-Ortsverband …", „Kreisfeuerwehrverband …"]` |
| IT-Sicherheitsbeauftragte/r | `[Name, Kontakt]` |
| Vertreten durch | `[Name, Funktion]` |
| Ersteller dieses Entwurfs | KI-gestützte Analyse des öffentlichen Quellcodes, auf Anforderung von `[Name]` |
| Grundlage | Repository `wattnpapa/meldekopf`, Zweig `claude/phase-2-sammlung`, Commit `1a1151c` (2026-10-25), inkl. der sechs Submodule unter `vendor/` (Abschnitt 3.6) |
| Herkunft der Vorlage | `docs/informationssicherheitskonzept.md` des Erfassungsbogens, Commit `441811c` |
| Geltungsbereich dieses Dokuments | Die Anwendung „Meldekopf" selbst (Client-Software) samt Lagemonitor-Fenster sowie ihre Build-, Auslieferungs- und Update-Kette. **Nicht enthalten:** die physische und organisatorische IT-Sicherheit der einsetzenden Organisation (Gebäude, Fahrzeuge, Netzwerk, sonstige Fachverfahren), die Erfassungsbogen-App (eigenes ISK) und S1-Control |
| Version dieses Dokuments | 0.1 (Entwurf), Phase 2 |
| Datum der Freigabe | `[Datum der Freigabe einfügen]` |
| Nächste Überprüfung | `[Datum, spätestens mit Phase 4 (Schnellerfassung), bei Versions-Update mit sicherheitsrelevanten Änderungen oder nach 12 Monaten]` |
| Anlass | Ersteinführung der App bei `[Organisation]` / Regelmäßige Überprüfung |

## 3. Strukturanalyse

### 3.1 Überblick über den Informationsverbund

Die Anwendung besteht ausschließlich aus Client-Software, die auf dem
Meldekopf-Gerät läuft. Es existiert kein Anwendungsserver, keine zentrale
Datenbank und keine Benutzerverwaltung. Ein Gerät führt eine oder mehrere
Einsatz-Sammlungen; eine Kopplung mehrerer Meldekopf-Geräte gibt es bewusst
nicht (ADR-008, Grenze zu S1-Control). Am Gerät kann ein zweiter Bildschirm
(Fernseher per Kabel) hängen, auf dem ein zweites Fenster derselben App die
Lage zeigt.

### 3.2 Zielobjekte: Anwendungen und Plattformen

| # | Zielobjekt | Beschreibung | Plattform(en) | Stand |
| --- | --- | --- | --- | --- |
| A1 | Web-App / PWA | Hauptauslieferungsform unter meldekopf.erfassungsbogen.app (GitHub Pages, Subdomain von erfassungsbogen.app); als Progressive Web App offlinefähig (Service Worker, Workbox) | Browser (Desktop/Mobil) | live |
| A1a | Lagemonitor-Fenster | Zweites Fenster derselben Herkunft (`?lagemonitor=<Einsatz>`), liest denselben `localStorage`, nur Anzeige; für einen am Gerät angeschlossenen Fernseher (`src/app/lagemonitor-ui.tsx`) | wie A1/A2 | live (Phase 2) |
| A2 | Desktop-App | Electron-Hülle um dieselbe Web-App; Auslieferung über GitHub Releases mit Auto-Update (`electron-updater`) | Windows (x64, arm64), Linux (deb, pacman); macOS still | Hülle vorhanden, Release-Jobs `build-win`/`build-linux` aktiv, unsigniert |
| A3 | Android-App | Capacitor-Hülle um dieselbe Web-App | Android | **geplant, Phase 5** (`android/` fehlt, Job `build-android` mit `if: false`) |
| A4 | iOS-App | Capacitor-Hülle | iOS | **folgt dem Stand des Erfassungsbogens**, derzeit nicht vorhanden |

> *Prüfvermerk zu A2:* Der macOS-Build ist in `release.yml` wie im
> Erfassungsbogen per `if: false` stillgelegt (Job `build-mac`). Die Jobs
> `build-win` und `build-linux` laufen bei jedem Push auf `main` und tragen
> keine Signier-Secrets; die Windows-Installer sind damit unsigniert. Die
> Funktionsumfang-Doku nennt die Electron-Hülle „Release-Build ungeprüft bis
> Phase 5" — ausgeliefert wird sie trotzdem schon. Beim Rollout ist das zu
> berücksichtigen (M5).

Alle Auslieferungsformen teilen sich denselben Anwendungscode (`dist/` aus
dem Vite-Build); es gibt keine serverseitige Variante.

> *Entfällt gegenüber der Vorlage:* die zweite Webfassung als GitLab Pages auf
> dem Open-CoDE-Spiegel. Für den Meldekopf gibt es (noch) keinen Spiegel und
> keine `.gitlab-ci.yml`; Webfassung ist allein GitHub Pages.

### 3.3 Zielobjekte: Daten

Alle Nutzdaten liegen im `localStorage` des Geräts unter dem Präfix `eeb.`,
mit **denselben Schlüsseln wie im Erfassungsbogen** (ADR-007), damit
Datensicherung und Einsatz-Datei zwischen beiden Apps ohne Übersetzung
wandern. Die Spalte „Vorlage" nennt die Kennung desselben Zielobjekts im ISK
des Erfassungsbogens.

| # | Zielobjekt | Beschreibung | Speicherort | Vorlage |
| --- | --- | --- | --- | --- |
| D1 | Entwurf der Schnellerfassung | **Geplant, Phase 4:** angefangene Erfassung einer Einheit ohne Bogen (`Entwurf.fremd`, an die Ziel-Sammlung gebunden). **Heute:** Ein eigener Bogen, eine Erfassung und der Rückholplatz können nur über eine eingespielte Datensicherung des Erfassungsbogens auf das Gerät kommen; die App zeigt sie nicht an, erhält sie unverändert, wendet beim Lesen die Datenschutzfrist an (`entwurf.ts`) und nennt sie in den Rückfragen von „Sicherung einspielen" und „Alle Daten löschen". Personendaten möglich | `eeb.entwurf.v1`, `eeb.entwurf.ersetzt.v1` | D1 (reduziert) |
| D2 | Einsatz-Sammlungen | **Kernbestand dieser App.** Alle Meldungen (Bögen) fremder Einheiten je Einsatz mit allen Fassungen (Historie), empfangenem Rohpayload (`herkunft`) und Signaturnachweis samt Absenderkarte des Senders (`signatur`); Papierkorb als Markierung `geloeschtAm` in derselben Liste. Personendaten vieler Einheiten über die Dauer des Einsatzes. Datenschutzfrist, Papierkorbfrist und Aufräumfrist (5.5) | `eeb.einsaetze.v1` (`@bos/meldekopf/einsaetze`) | D2 |
| D2a | Uhrstand für alle Fristen | Zuletzt akzeptierter Zeitpunkt der Geräteuhr, ggf. unbestätigter Sprung; ein Abstand von mehr als 60 Tagen zum letzten Start (vor oder zurück) hält alle Fristen an, bis „Geräteuhr stimmt" bestätigt ist (`datenschutz-uhr.ts`, `uhr-korrektur.ts`, `uhr-folgen.ts`, `uhr-warnung.tsx`); keine Personendaten | `eeb.uhr.v1`; reist in der Sicherung mit, wird beim Einspielen nicht übernommen | D2a |
| D2b | Export-Stand je Sammlung und Format | Je Format (Sammel-PDF, Übersichts-CSV, Alle-Daten-CSV, Excel) Kennungen, Zeitpunkt und Zustand je Einheit als Prüfsummen — Grundlage für „Nur neue seit dem letzten Export"; reist im Umschlag von Sammel-PDF und Einsatz-Datei (`staende`) mit; keine Personendaten (`weitergabe/export-stand.ts`). `eeb.export-stand.v1` ist die Vorgängerfassung und wird nicht übernommen | `eeb.export-stand.v2` | D2b |
| D2c | Zusatzfelder je Meldung | Eintreff- und Abrückzeit, Auftrag/Notiz der Führungsstelle (**Freitext, kann Personenbezug enthalten**), `vermerke` (Protokoll jeder Handlung der Führungsstelle mit Uhrzeit, Vorwerte eines Auftrags inklusive), `ersetztDurch`/`ersetztAm`, `nummer`, `vomPapier` (`eintrag-zeiten.ts`, `fassung-vorrang.ts`). Nicht von der Datenschutzfrist erfasst; fallen mit der Meldung bzw. Sammlung | am Eintrag in `eeb.einsaetze.v1` | D2c |
| D2d | Zuletzt offene Sammlung | Kennung und Zeitpunkt, 12 Stunden gültig (`letzter-einsatz.ts`); keine Personendaten | `eeb.letzterEinsatz.v1` | D2d |
| D2e | Entfernte Meldungen | Kennungen vor Ort entfernter Einträge je Sammlung, damit ein späterer Import nachfragt (`entfernte-meldungen.ts`); keine Personendaten | `eeb.entfernt.v1` | D2e |
| D2f | Zeitpunkt der letzten Sicherung | Grundlage der Erinnerung nach drei Tagen (`sicherung.ts`); keine Personendaten | `eeb.sicherung.zuletzt.v1` | D2f |
| D2g | Nachricht über aufgeräumte Sammlungen | Name, Zeitraum, Zahl der Einheiten und Meldungen einer nach 90 Tagen Ruhe gelöschten Sammlung, bis „Verstanden" (`aufraeum-hinweis.ts`); Sammlungsname als Freitext, keine Personendaten | `eeb.aufgeraeumt.v1` | D2g |
| D2h | Lageblatt-Stand | Zeitpunkt, Kennungen, Zustand je Einheit als Prüfsummen (`weitergabe/export-stand.ts`) | `eeb.lageblatt-stand.v1` | D2h |
| D2i | Weitergabe-Stand | Zeitpunkt und Kennungen der letzten Weitergabe der ganzen Sammlung, Prüfsummen, letzte Übernahme per Import; kein Auftragstext | `eeb.weitergabe-stand.v1` | D2i |
| D2j | Kenntnis-Stand | Zeitpunkt der letzten Kenntnisnahme und Kennungen der Meldungen; je Gerät | `eeb.kenntnis-stand.v1` | D2j |
| D2k | Haken einer Musterung | **Entfällt** (keine Vorlagen, keine Musterung in dieser App; ADR-006) | — | D2k |
| D2l | Beiseitegelegter, unlesbarer Entwurf | Text eines unlesbaren Entwurfs mit Ursache; **kann Personendaten enthalten**, die die Datenschutzfrist nicht erreicht; fällt nach 90 Tagen selbst weg (`entwurf.ts`). Heute nur über eine eingespielte Sicherung erreichbar | `eeb.entwurf.beschaedigt.v1` | D2l |
| D2m | Merker im Sitzungsspeicher | (a) **Live:** Eingaben des Papier-Abgleichs je Sammlung (Nummer, Zeiten, Status, Zug, Notiz) bis Tab-Ende, Übernehmen oder Verwerfen (`papier-abgleich-entwurf.ts`). (b) `eeb.abgleich.fortsetzen`: wird beim Start nur entfernt; der Fensterabgleich, der ihn setzt, ist noch nicht eingebunden. (c) **Live seit Phase 3:** wartender Link einer eingegangenen Meldung (`eeb.wartet.fragment`, enthält den Bogen samt Personendaten, `eingang/wartender-link.ts`), bis die Rückfrage „Wohin damit?“ beantwortet ist. **Geplant, Phase 4:** Rückweg von „Vorbelegung entfernen" (`eeb.vorbelegung.rueckweg`, `vorbelegung-rueckweg.ts` noch nicht übernommen). Nicht in der Datensicherung; „Alle Daten löschen" leert alle `eeb.`-Einträge des Sitzungsspeichers | `sessionStorage` des Tabs (`eeb.papierabgleich.v1.<Einsatz>` u. a.) | D2m |
| D2n | Einsatzbeginn, Funkrufname, Helligkeit für den Lagemonitor | Von Hand gesetzter Beginn je Einsatz, optionaler Funkrufname der eigenen Führungsstelle (Freitext bis 60 Zeichen), Helligkeitsstufe (`lagemonitor-beginn.ts`, `lagemonitor-ui.tsx`); reisen als `lage` im Umschlag von Sammel-PDF und Einsatz-Datei; keine Personennamen vorgesehen | `eeb.lagebeginn.v1`, `eeb.lagefunkruf.v1`, `eeb.lagestufe.v1` | D2n |
| D2o | Beiseitegelegter unlesbarer Bestand | Unlesbare Sammlungen, Meldungen, Gesamttexte (und aus einer Erfassungsbogen-Sicherung Vorlagen, Absenderkarte) unverändert; **kann Personendaten enthalten**; 90 Tage ab Beiseitelegen nach der geprüften Uhr, eigener Weg „Beiseitegelegtes entfernen…" (`eingang/unlesbar.ts`, `eingang/unlesbar-aufraeumen.ts`) | `eeb.unlesbar.v1` | D2o (Runde 7/8) |
| D2p | Fremdbestand aus einer Erfassungsbogen-Sicherung | **Neu gegenüber der Vorlage.** Vorlagen („Meine Vorlagen" mit ganzer Mannschaft, Namen, Funktionen, Erreichbarkeiten), Übergabe-Stand des eigenen Bogens, ggf. Haken einer Musterung. Die App hat dafür keine Oberfläche; `vorlagen.ts` und `uebergabe-stand.ts` sind reine Datenmodule, damit eine eingespielte Sicherung nichts verliert. Vorlagen haben keine Datenschutzfrist (wie im Erfassungsbogen), nur die Papierkorbfrist von 30 Tagen. Genannt werden sie in den Rückfragen „Sicherung einspielen" und „Alle Daten löschen" | `eeb.vorlagen.v1`, `eeb.musterung.v1` (falls vorhanden), am Entwurf `uebergabe` | — |
| D2q | Einstellungen | Anzeigemodus (`eeb.anzeigemodus.v1`, Altschlüssel `eeb.feldmodus.v1` nur lesend), Karten-/Tabellensicht (`eeb.einheiten-ansicht`), Widerspruch gegen die Reichweitenmessung (`skipgc`, **ohne** `eeb.`-Präfix: nicht in der Sicherung, überlebt „Alle Daten löschen" bewusst), kurzlebige Speicherprobe (`eeb.speicherprobe`); keine Personendaten | `localStorage` | — |
| D3 | Absenderkarte | **Als Sender entfällt sie** (keine Oberfläche zum Anlegen). Empfangene Absenderkarten anderer Geräte stehen im Signaturnachweis der Meldungen (D2). Eine **eigene** Karte kann nur aus einer eingespielten Erfassungsbogen-Sicherung stammen; beim Signieren wird sie seit 2026-10-25 nicht mehr verwendet (Prüfvermerk unten) | `eeb.absenderkarte.v1` | D3 (reduziert) |
| D4 | Privater Geräteschlüssel | Ed25519-Schlüssel zum Signieren und Gegenzeichnen der QR-Codes in Einzel- und Sammel-PDF; wird beim ersten PDF erzeugt (`geraete-schluessel.ts`); **unverschlüsselt als Hex**; lässt er sich nicht speichern, nur im Arbeitsspeicher der Sitzung | `eeb.geraeteschluessel.v1` | D4 |
| D5 | Transportdaten | **Ausgehend (live):** QR-Codes je Bogen in Einzel- und Sammel-PDF (signiert bzw. gegengezeichnet). **Eingehend (live seit Phase 3):** QR-Payload aus Kamera, Handscanner, Bild, Link-Fragment, JSON-Datei, PDF, Einsatz-Datei (`src/app/eingang/`, Weiche in `eingang/aufnahme.tsx`) | transient bzw. Datei | D5 |
| D6 | Ausgaben | Sammel-PDF (mit eingebettetem Bogen-JSON und eingebetteter Sammlung samt Export-Ständen und Lage-Angaben), Lageblatt (A4 quer, Aushang), Blanko-Vordruck (ohne Gerätedaten), Übersichts-CSV, CSV mit allen Daten, Excel-Liste „Oldenburg", Einsatz-Datei (JSON-Umschlag) | außerhalb der App (Papier, Dateisystem, Empfänger) | D6 |
| D7 | Datensicherungsdatei | **Neu als eigenes Zielobjekt.** Alle `eeb.*`-Einträge des Geräts als eine JSON-Datei (`eeb-sicherung-JJJJ-MM-TT.json`): alle Sammlungen samt Papierkorb, D2p, D3 und **der private Geräteschlüssel D4** (`sicherung.ts`, `sicherung-datei.ts`, `daten-gruppe.tsx`). Die Oberfläche weist darauf hin („enthält den privaten Signaturschlüssel und ggf. Personendaten") | Datei, Ablage durch den Nutzer | (in der Vorlage nur in DSFA 5.7) |

> *Prüfvermerk zu D4:* Bestätigt — `src/app/geraete-schluessel.ts` legt den
> privaten Schlüssel als Hex im `localStorage` ab. Der Kopfkommentar sagt
> zusätzlich, er „verlässt das Gerät nie (nicht in QR/URL/Datei)". Das stimmt
> für QR und Link, **nicht** für die Datei: Die Datensicherung (D7) enthält ihn,
> was `sicherung.ts` im eigenen Kopfkommentar ausdrücklich sagt. Es gilt der
> Code; die Aussage im Kopfkommentar ist zu eng (Kommentar ist aus dem
> Erfassungsbogen übernommen).

> *Prüfvermerk zu D3 (Widerspruch Doku ↔ Code):* `docs/architektur.md`
> Kap. 8.2 sagt, `eeb.absenderkarte.v1` „als Sender" bleibe beim
> Erfassungsbogen und der Meldekopf zeige nur empfangene Absenderkarten an.
> Im Code liest `qrErzeugen` (`src/app/hilfen.ts`) die Absenderkarte des Geräts
> bei jedem Signieren und Gegenzeichnen; die Sammel-PDF und das Einzel-PDF
> einer Meldung (`weitergabe/pdf.ts`) rufen es auf. Liegt nach dem Einspielen
> einer Erfassungsbogen-Sicherung dort eine Karte, reisen Name, E-Mail und
> Telefon der damaligen Absenderperson mitsigniert in jedem QR-Code, den der
> Meldekopf erzeugt — ohne dass die App die Karte anzeigt oder einzeln löschen
> lässt. Es gilt der Code; Maßnahme M11.
>
> *Erledigt 2026-10-25:* Der Meldekopf signiert ohne Absenderkarte (`hilfen.ts`,
> Test in `hilfen.test.ts`); die Karte eines ursprünglichen Absenders bleibt in
> dessen Stufe.

> *Prüfvermerk zu Kap. 8.2 der Architektur (Speicherschlüssel):* Die Tabelle
> dort weicht vom Code ab. (1) `eeb.einsaetze-papierkorb.v1` gibt es nicht; der
> Papierkorb ist die Markierung `geloeschtAm` in `eeb.einsaetze.v1`
> (`@bos/meldekopf/papierkorb`). (2) `eeb.signieren.v1` („Schalter, ob signiert
> wird") kommt im Code nicht vor; signiert wird immer
> (`geraete-schluessel.ts`: „immer aktiv"). (3) `eeb.offline-zusatz.v1` und
> `offline-bereit.ts` sind noch nicht übernommen. (4) `eeb.entwurf.ersetzt.v1`,
> `eeb.vorlagen.v1` und `eeb.absenderkarte.v1` stehen unter „Nicht
> übernommen", werden aber von `entwurf.ts`, `vorlagen.ts`, `absenderkarte.ts`,
> `sicherung.ts` und `uhr-folgen.ts` gelesen und teils geschrieben (D1, D2p,
> D3). (5) `eeb.einheiten-ansicht` und `eeb.speicherprobe` fehlen dort. (6)
> `eeb.wartet.fragment` steht dort als `sessionStorage`-Schlüssel, das Modul
> `wartender-link.ts` war noch nicht übernommen (seit Phase 3 live). Für dieses
> Dokument gilt der Code (Tabelle oben).
>
> *Erledigt 2026-10-25:* Kap. 8.2 der Architektur nach (1), (2), (5) und (6)
> korrigiert, Vorlagen als Datenmodul der Datensicherung vermerkt; offen bleibt
> die Absenderkarte (siehe dort, zu entscheiden).

### 3.4 Zielobjekte: Kommunikationsverbindungen

| # | Zielobjekt | Ziel | Zweck | Absicherung | Stand |
| --- | --- | --- | --- | --- | --- |
| K1 | Geräte-zu-Geräte-Übergabe | Kein Netzwerk — ausgehend: Sammel-PDF, Einsatz-Datei, CSV, Excel, Ausdruck; eingehend: Datensicherung, Kamera-Scan, USB-Handscanner, Bilderstapel, Datei/PDF, Link (AirDrop, Quick Share, Messenger), Einsatz-Import vom zweiten Meldekopf-Gerät | Aufnahme von Bögen, Weitergabe der Lage an Stab, Ablösung und S1-Control | Physisch/lokal begrenzter Kanal; Ed25519-Signatur und Gegenzeichnung der QR-Codes | live (eingehend seit Phase 3) |
| K2 | GoatCounter-Reichweitenmessung | `https://meldekopf.goatcounter.com/count` (eigene Site dieser App, Host in `src/app/adressen.ts`) | Anonyme Nutzungsstatistik, ein Treffer je Start | Cookielos, kein Fremdcode (kein `count.js` von `gc.zgo.at`), nur Pfad (Nutzungskanal), Titel und im Browser Referrer; nie `location.search` oder Fragment (`statistik.ts`); Widerspruch per Kästchen im Datenschutzdialog (`skipgc`) | live |
| K3 | GitHub-Releases-Abfrage | GitHub-Release-Assets dieses Repositorys | Prüfung auf neue Version (nur Electron, `electron-updater`) | HTTPS; Pakete unsigniert (siehe 6.4) | live (Desktop) |
| K4 | Lagemonitor-Fenster | Zweites Fenster derselben Herkunft am selben Gerät | Anzeige der Lage auf einem zweiten Bildschirm | Kein Netz; `window.open` bzw. in Electron eigenes Fenster mit denselben Härtungen; Datenweg `localStorage` + `storage`-Ereignis | live |
| K5 | Link zum Erfassungsbogen | `https://erfassungsbogen.app/#<Payload>&rueck=meldekopf` und zurück | „Im Erfassungsbogen öffnen“ in der Rückfrage zu einem empfangenen Bogen (ohne `rueck=`); „Vollständig erfassen" (Bogen im Erfassungsbogen weiterführen und zurückgeben) | Payload im Fragment, verlässt das Gerät nicht über das Netz; nach Ablauf der Datenschutzfrist ohne Personendaten; Seitenabruf des Erfassungsbogens wie dort beschrieben | „Im Erfassungsbogen öffnen“ live seit Phase 3; Rückweg **geplant, Phase 4** (ADR-006) |

Es existieren keine weiteren Netzwerkverbindungen der eigentlichen
Sammlungs-Funktion — durch die Content-Security-Policy technisch erzwungen
(5.3). Die Links in Fußzeile und Textseiten (Erfassungsbogen, GitHub,
Produktfamilie) öffnen auf Klick eine fremde Seite, laden aber nichts in die
App.

> *Prüfvermerk zu K2:* `docs/architektur.md` Kap. 3.2 nennt „ein Treffer je
> Kaltstart". `statistikStarten()` läuft in `main.tsx` vor der Weiche zum
> Lagemonitor; jedes Öffnen eines Lagemonitor-Fensters zählt deshalb einen
> weiteren Treffer (Pfad und Titel wie das Hauptfenster). Datenschutzrechtlich
> ohne neuen Inhalt, aber die Zählung ist „je Fensterstart", nicht „je
> Kaltstart". Es gilt der Code.
>
> *Erledigt 2026-10-25:* Das Lagemonitor-Fenster zählt nicht mehr
> (`main.tsx`: `statistikStarten()` nur ohne Lagemonitor-Kennung).

### 3.5 Zielobjekte: IT-Systeme (Endgeräte)

Die Endgeräte selbst (Tablets, Notebooks, Desktop-PCs im ELW) sind Zielobjekte
im Sinne der Strukturanalyse, liegen aber außerhalb des Einflussbereichs der
Software und sind durch die einsetzende Organisation zu erfassen und
abzusichern (Geräteverwaltung, Bildschirmsperre, Festplattenverschlüsselung,
Betriebssystem-Updates).

**Neu gegenüber der Vorlage:** der **zweite Bildschirm** (Fernseher, Beamer,
Monitor), auf dem der Lagemonitor läuft. Er speichert nichts, zeigt aber
Einsatzname, Einsatzort, Einheitsnamen, Organisationen, Heimatorte,
Funkrufnamen, Stärken und Bewegungen (Eingetroffen, Abgerückt, Wieder da) für
jeden im Raum oder am Fahrzeug lesbar. Seine Aufstellung ist eine
organisatorische Entscheidung (M12).

### 3.6 Zielobjekte: Build-, Auslieferungs- und Update-Kette

| # | Zielobjekt | Beschreibung |
| --- | --- | --- |
| B1 | Quellcode-Repository | `wattnpapa/meldekopf`, öffentlich auf GitHub, samt sechs Submodulen unter `vendor/`: `eeb-format` (`eb58ad6`), `bos-meldekopf` (`59a986c`), `bos-vokabulare` (`2f94a46`), `bos-taktische-zeichen` (`cb9c227`), `bos-eeb-satz` (`c9ae5b2`), `bos-oberflaeche` (`acd5273`). Die vier ersten teilt die App mit dem Erfassungsbogen; `bos-eeb-satz` (Ausgabe ohne Oberfläche) und `bos-oberflaeche` (Dialoge, Anzeigemodi, Bausteine) sind seit Phase 1 neu. Änderungen am Kern nur im jeweiligen Repo, hier per gepinntem Commit (ADR-003) |
| B2 | CI/CD-Pipeline | GitHub Actions: `ci.yml` (Kern-Kopien-Prüfung, Typprüfung, Tests, Build, Bundle-Budget, SBOM, `npm audit`, E2E) auf allen Zweigen; `release.yml` bei Push auf `main`: `prepare` → `check` → `build-pages`/`deploy-pages`, `build-win`, `build-linux` → `release`; `build-mac` und `build-android` mit `if: false` |
| B3 | Abhängigkeiten (Software-Lieferkette) | npm-Pakete gemäß `package-lock.json`, gepinnt; Submodule über `file:` |
| B4 | Code-Signing-Material | macOS-Zertifikat und Apple-API-Schlüssel sowie Android-Keystore als CI-Secrets vorgesehen; beide Jobs stillgelegt. Windows und Linux ohne Signierung |
| B5 | Auto-Update-Kanal | `electron-updater` gegen die GitHub Releases dieses Repositorys (eigener Kanal `latest-arm64` für Windows auf ARM) |

> *Prüfvermerk zu B1 (Widerspruch Doku ↔ Code):* `docs/architektur.md`
> Kap. 8.6 nennt für `bos-eeb-satz` den Pin `3c4f75b`. Gepinnt ist
> `c9ae5b2` („pako: peerDependency auf ^2.1.0 || ^3"), einen Commit später. Es
> gilt der Code.
>
> *Erledigt 2026-10-25:* Kap. 8.6 nennt `c9ae5b2`.

> *Entfällt gegenüber der Vorlage:* der Quellcode-Spiegel nach Open CoDE
> (`spiegel-opencode.yml`, `.gitlab-ci.yml`) samt Deploy-Key; beides gibt es in
> diesem Repository nicht.

## 4. Schutzbedarfsfeststellung

Bewertung je Grundwert (Vertraulichkeit, Integrität, Verfügbarkeit) nach dem
dreistufigen BSI-Schema *normal – hoch – sehr hoch*. Die Einstufung geht vom
typischen BOS-Einsatzkontext aus; die endgültige, organisationsspezifische
Einstufung obliegt der einsetzenden Organisation.

| Zielobjekt | Vertraulichkeit | Integrität | Verfügbarkeit | Begründung |
| --- | --- | --- | --- | --- |
| D2 Einsatz-Sammlungen (mit D2c) | **Hoch** (neu bewertet; Vorlage: Normal) | Hoch | Hoch | Einzelne Datensätze haben normalen Schutzbedarf (keine Art.-9-Daten). Der Meldekopf bündelt aber die Personal- und Kontaktdaten aller eintreffenden Einheiten eines Einsatzes, oft mehrere Organisationen, über Tage, dazu Freitexte der Führungsstelle (**Kumulationseffekt**). Falsche Stärke- oder Bedarfszahlen führen zu Fehlentscheidungen der Einsatzleitung; die Sammlung ist am Meldekopf die einzige aktuelle Lage. |
| D1, D2l, D2o, D2p Fremd- und Restbestand | Hoch | Normal | Normal | Kann vollständige Mannschaftslisten (Vorlagen) und unlesbare Personendaten enthalten, ist aber in der App nicht sichtbar — Risiko des Vergessens (R11). |
| D2m Sitzungsspeicher | Normal | Normal | Normal | Kurzlebig, an den Tab gebunden: Papier-Abgleich und seit Phase 3 der wartende Link (ein ganzer Bogen bis zur Antwort auf die Rückfrage). Neu bewertet: bleibt Normal, weil derselbe Bogen ohnehin im Link-Verlauf des Browsers bzw. in der Nachricht steht, aus der er kam, und der Eintrag mit dem Tab endet. |
| D2n, D2q, übrige Stände (D2a, D2b, D2d–D2j) | Normal | Hoch (D2a, D2b) / Normal | Normal | Keine Personendaten; der Uhrstand (D2a) steuert alle Löschungen, der Export-Stand (D2b) entscheidet, was der Stab bekommt. |
| D3 Absenderkarte | Normal | Normal | Normal | Nur aus eingespielter Sicherung; wird seit 2026-10-25 nicht mehr mitgesendet, liegt aber unsichtbar weiter (R11). |
| D4 Privater Geräteschlüssel | Hoch | Hoch | Normal | Kompromittierung erlaubt Signieren und Gegenzeichnen im Namen dieses Meldekopf-Geräts — beim Meldekopf wiegt das schwerer als bei einer Einheit, weil seine Gegenzeichnung die Weitergabe aller Bögen bezeugt. |
| D5 Transportdaten | Normal | Hoch | Normal | Transportformat; Integrität ist der Zweck der Signatur. |
| D6 Ausgaben | **Hoch** (Sammel-PDF, Einsatz-Datei, CSV alle Daten, Excel) / Normal (Lageblatt, Übersichts-CSV) | Hoch | Normal | Eine Sammel-PDF oder Einsatz-Datei ist eine **Vollkopie der Sammlung** mit allen Personendaten aller Einheiten; einmal erzeugt, außerhalb der Kontrolle der App. Das Lageblatt hängt als Aushang an der Wand (Funkrufname, Rückrufnummer mit Initial und Nachname). |
| D7 Datensicherungsdatei | **Hoch** | Hoch | Hoch | Vollkopie des Gerätebestands **einschließlich privatem Schlüssel**; ohne sie ist das Gerät ein Single Point of Failure. |
| A1–A2, A1a Anwendung selbst | — | Hoch | Hoch | Manipulierte App-Instanzen gefährden die Integrität der Lage; Ausfall am Meldekopf behindert die Einsatzabwicklung. |
| A1a/Zweiter Bildschirm | Normal | Normal | Normal | Keine Personennamen; Einsatzlage und Einheiten aber für Umstehende sichtbar (R9). |
| K1 Übergabe | Normal | Hoch | Normal | Integrität der übertragenen Lage ist zentral. |
| K2 GoatCounter | Normal | — | — | Keine Inhalte; Metadaten bei Dritten (DSFA 5.8). |
| B1–B5 Build-/Update-Kette | — | Hoch | Normal | Kompromittierte Build- oder Update-Kette verteilt manipulierte Software an alle Nutzer (Supply-Chain-Risiko); sechs Submodule erweitern die Kette. |

**Vererbungsprinzip:** Der hohe Integritätsschutzbedarf der Lage (D2)
vererbt sich auf alle Zielobjekte, die sie verarbeiten, ausgeben oder
übertragen (K1, D5, D6, D7), auf die Anwendung selbst (A1–A2) und deren
Auslieferungskette (B1–B5). Der hohe Vertraulichkeitsschutzbedarf von D2
vererbt sich auf das Endgerät (3.5) sowie auf D6 und D7.

## 5. Modellierung: eingesetzte Sicherheitsmaßnahmen laut Quellcode

### 5.1 Anwendungsarchitektur und Rechtevergabe (Electron-Desktop)

Der Electron-Hauptprozess (`electron/main.js`, aus dem Erfassungsbogen
übernommen, Commit `f2b77f1`) ist gehärtet:

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` — der
  Renderer hat keinen Zugriff auf Node.js- oder Electron-APIs; es gibt kein
  Preload-Skript.
- **Minimale Rechtevergabe:** Der Permission-Handler erlaubt ausschließlich
  `media` (Kamera, seit Phase 3 für den QR-Scan) und Zwischenablage
  (`clipboard-read`, `clipboard-sanitized-write`); alles andere wird
  abgelehnt.
- **Kontrollierte externe Links:** `setWindowOpenHandler` und `will-navigate`
  öffnen fremde URLs im System-Standardbrowser. Einzige Ausnahme ist das
  Lagemonitor-Fenster (Adresse mit `?lagemonitor=`): Es wird mit denselben
  Einstellungen (`contextIsolation`, `sandbox`, kein Node) geöffnet; jede
  andere interne Adresse bleibt abgelehnt.
- `hardenedRuntime: true` für macOS-Builds (`package.json`, Feld `build`).

> *Prüfvermerk:* Alle Punkte im Code bestätigt. Zwei Abweichungen von
> Begleittexten: (1) `docs/architektur.md` Kap. 8.3 nennt „Berechtigungen nur
> Kamera"; der Code erlaubt zusätzlich die Zwischenablage. (2) Der
> Kopfkommentar von `electron/main.js` sagt, der Lagemonitor-Fensterweg
> „greift ab Phase 5"; seit Phase 2 öffnet die Einsatzansicht den Lagemonitor
> bereits (`lagemonitorOeffnen`, `main.tsx`), der Weg ist also aktiv. Es gilt
> der Code.

### 5.2 Kryptografische Herkunfts- und Integritätsprüfung

Bögen tragen eine optionale Ed25519-Signatur des sendenden Geräts
(`vendor/eeb-format/src/signatur.ts`). Das Modell ist Trust-on-First-Use,
kein PKI-Aufbau: Die Signatur bestätigt, dass ein Bogen unverändert vom
Inhaber eines lokal erzeugten Schlüssels stammt, nicht die Identität einer
Person. Mehrstufige Weitergaben bilden eine Signaturkette (`EEB2C`,
`MAX_STUFEN = 32`).

Der Meldekopf ist in dieser Kette die **mittlere Stufe**:

- **Gegenzeichnen (live):** Einzel-PDF und Sammel-PDF erzeugen je Bogen einen
  QR-Code (`qrErzeugen`, `src/app/hilfen.ts`). Ist der Bogen seit dem Empfang
  unverändert und liegt der empfangene Payload (`herkunft`) vor, wird dieser
  gegengezeichnet: Die Original-Signatur der Einheit bleibt prüfbar, der
  Meldekopf bezeugt nur die Weitergabe. Sonst signiert der Meldekopf selbst.
  Der Geräteschlüssel wird dabei bei Bedarf erzeugt.
- **Prüfen eingehender Signaturen (live seit Phase 3):** Jeder Eingang prüft
  die Signatur beim Empfang (`signaturVonPayload`/`signaturVonText` in
  `eingang/aufnahme.tsx`) und legt den Nachweis an der Meldung ab; die Karte
  zeigt das Siegel-Etikett (`einsaetze-ui.tsx`). Der PDF-Weg der Vorlage (QR
  der PDF statt eingebettetem JSON übernehmen, R2-W6) liegt in
  `eingang/pdf-qr.ts`.
- Nach Ablauf der Datenschutzfrist entfernt der Kern mit den Personendaten
  auch `herkunft` und `signatur` einer Meldung (`eintragNachFrist`); ab dann
  ist der Bogen nicht mehr gegenzeichenbar, sondern wird selbst signiert.

### 5.3 Content-Security-Policy

Der Produktions-Build setzt eine restriktive CSP als `<meta>` (`vite.config.ts`,
Plugin `eeb-csp`, Host aus `src/app/adressen.ts`):

```
default-src 'self' file:; base-uri 'none'; object-src 'none'; form-action 'none';
script-src 'self' file: 'wasm-unsafe-eval' 'sha256-…' …;
style-src 'self' file: 'unsafe-inline';
img-src 'self' file: data: blob: https://meldekopf.goatcounter.com;
font-src 'self' file: data:;
frame-src 'self' file: blob:;
connect-src 'self' file: https://meldekopf.goatcounter.com
```

- `connect-src`/`img-src` sind auf genau einen fremden Host begrenzt — jede
  Datenausleitung an eine andere Herkunft ist technisch unterbunden. Der Host
  ist eine eigene GoatCounter-Site, nicht die des Erfassungsbogens.
- `script-src` ohne `'unsafe-inline'`: Die Inline-Blöcke der `index.html`
  werden beim Bauen gehasht und einzeln freigegeben; findet das Plugin keinen
  Block, bricht der Build ab, statt ohne wirksame Policy auszuliefern.
- `'wasm-unsafe-eval'` erlaubt nur das Kompilieren von WebAssembly aus der
  eigenen Herkunft; nötig für den QR-Decoder ZXing (seit Phase 3 im Kamera-Scan).
- `frame-src blob:` für die PDF-Vorschau im eingebetteten Rahmen.
- `style-src 'unsafe-inline'` bleibt bewusst (React setzt `style`-Attribute;
  Design-Token und Schrift liegen inline).

> *Prüfvermerk:* Die CSP gilt nur im Build, nicht im Vite-Dev-Server. Die
> Abhängigkeit `pdfmake` ist auf 0.3.11 gehalten, weil 0.3.13 einen Worker aus
> `blob:` startet, den diese CSP (ohne `worker-src`, Rückfall auf
> `script-src`) verbietet (Commit `1a1151c`). Ein Update von `pdfmake` ist
> damit sicherheitsrelevant: Es darf die Policy nicht aufweichen.

### 5.4 Schutz bei Datenausgabe

Die Ausgabewege sind seit Phase 2 live (`src/app/einsatz-ansicht.tsx`,
`src/app/weitergabe/*`); die Fassungen stammen unverändert aus dem
Erfassungsbogen (`441811c`) mit allen dort in den Audit-Runden 2 bis 9
eingeführten Kennzeichnungen (Nachtrag, Sollstärke nicht gemeldet,
Umschrift, Nr., Kopfzeilen).

- **CSV-Schreiber** (`@bos/eeb-satz/csv`): Werte, die mit `=` `+` `-` `@` oder
  Tab/CR beginnen, bekommen ein führendes `'` (`FORMEL_START`) — Abwehr gegen
  CSV-Formel-Injection. Gilt für die **Übersichts-CSV**
  (`weitergabe/einsatz-csv.ts`, eine Zeile je Einheit, mit Auftrag/Notiz,
  Bemerkung der Einheit, Hinweisen) und die **CSV mit allen Daten**
  (`weitergabe/bogen-csv.ts`, Langformat mit je einer Zeile je Person und
  Fahrzeug, also allen Namen und Erreichbarkeiten).
- **XLSX-Schreiber** (`@bos/eeb-satz/xlsx`): `&`/`<`-Escaping; die
  **Excel-Liste „Oldenburg"** (`weitergabe/oldenburg-xlsx.ts`) schreibt
  Freitexte als `inlineStr` (nie als Formel ausgewertet); Summen nur über die
  in die Lage zählenden Einheiten.
- **Sammel-PDF** (`weitergabe/pdf.ts`, `weitergabe/pdf-dokument.ts`): Lageblatt
  als Seite 1, dahinter jeder Bogen mit Kasten „Stand am Meldekopf" und
  QR-Code (gegengezeichnet, 5.2); eingebettet sind alle Bögen als JSON **und
  die ganze Sammlung** samt Export-Ständen (D2b) und Lage-Angaben (D2n). Die
  Sammel-PDF ist damit eine Vollkopie, die eine leere Ablösung vollständig
  befüllt. Der Teilexport heißt `…nachtrag-seit-…` und trägt
  `nachtragSeit` im Umschlag.
- **Lageblatt** (A4 quer): eine Zeile je Einheit mit Zug, Bedarf,
  Funkrufname und **Rückrufnummer der Führungskraft** (Initial, Nachname,
  Nummer) und Bemerkung der Einheit (gekürzt) — gedacht für Wand und
  Klemmbrett. Aushangort ist eine organisatorische Entscheidung (M9).
- **Einsatz-Datei** (`weitergabe/einsatz-transport.ts`, `einsatzDateiInhalt`):
  JSON-Umschlag mit Sammlung, Export-Ständen und Lage-Angaben für S1-Control
  und die Ablösung; ohne Verschlüsselung, ohne Signatur.
- **Blanko-Vordruck** (`weitergabe/blanko.ts`): enthält keine Daten des
  Geräts.
- **Export-Stand je Format** (`weitergabe/export-stand.ts`): „Nur neue seit
  dem letzten Export" verkleinert, was den Empfänger erreicht; ein
  abgebrochenes Teilen verbucht nichts.

Wohin Ausdruck und Datei gelangen, entscheidet der Nutzer; die App hat darauf
keinen Einfluss (DSFA 5.8, 6.3).

> *Entfällt gegenüber der Vorlage:* „Vorlage teilen" (QR, Link, JSON-Datei
> `eeb-vorlage-*.json`), Einzel-PDF des eigenen Bogens als Absender, Übergabe
> des eigenen Bogens per QR/Link/Nahbereich. Diese Wege hat nur der
> Erfassungsbogen. Das Einzel-PDF einer *empfangenen* Meldung („Bogen
> anzeigen") gibt es hier weiterhin (`meldungPdfAnzeigen`).

### 5.5 Datensparsamkeit und Löschung

- **Datenschutzfrist** (`@bos/eeb-format/datenschutzfrist`,
  `@bos/meldekopf/einsaetze` `fristBereinigt`): 90 Tage nach `stand` eines
  Bogens entfernt der Kern beim Lesen Namen, Funktionen,
  Zusatzqualifikationen, Fahrerlaubnisse, Kontakte und den Freitext
  „Sonstiges", bei Meldungen auch Rohpayload und Signaturnachweis. Ausgenommen
  sind Bögen mit dem Haken „Übung". Gilt für jede Meldung jeder Sammlung und
  für einen Entwurf aus einer eingespielten Sicherung. **Nicht** erfasst sind
  die Zusätze der Führungsstelle (D2c: Notiz, Vermerke) — sie fallen erst mit
  der Meldung bzw. Sammlung.
- **Aufräumfrist ruhender Sammlungen** (`@bos/meldekopf/einsaetze`): 90 Tage
  ohne Änderung, dann endgültig gelöscht; Ankündigung ab Tag 60; Nachricht
  danach (D2g).
- **Papierkorb** (`@bos/meldekopf/papierkorb`, `papierkorb-frist.ts`):
  gelöschte Sammlungen 30 Tage wiederherstellbar, Datum und Restzeit
  angezeigt; „Wiederherstellen" setzt die Aufräumfrist neu
  (`weitergabe/einsatz-wiederherstellen.ts`).
- **Geprüfte Geräteuhr** (`datenschutz-uhr.ts`, `uhr-korrektur.ts`,
  `uhr-folgen.ts`, `uhr-warnung.tsx`): Alle drei Fristen rechnen mit ihr. Ein
  Sprung von mehr als 60 Tagen gegenüber dem letzten Start, vor oder zurück,
  wird **nie durch Zeitablauf** bestätigt, sondern nur durch „Geräteuhr
  stimmt" nach einer Rückfrage, die die Folgen in Zahlen nennt. Bis dahin
  löscht und anonymisiert die App nichts. Die Hülle `uhr-korrektur.ts`
  verschiebt dafür die Zeitstempel, die der Kern mit `Date.now()` prüft.
- **Meldung entfernen** (`einheitEntfernen`, `eintrag-zeiten.ts`): nimmt die
  Einheit mit allen Fassungen heraus; „Rückgängig" nur im Arbeitsspeicher,
  bewusst kein dauerhafter Papierkorb für fremde Personendaten; Kennungen in
  `eeb.entfernt.v1` (D2e).
- **Sicherung einspielen** (`sicherung.ts`, `daten-gruppe.tsx`): prüft die
  Datei vorher, nennt beide Bestände (Sammlungen, Vorlagen, Entwurf,
  Rückholplatz, Absenderkarte, Geräteschlüssel mit Kurzform, Beiseitegelegtes,
  was sofort unter die Fristen fiele), verlangt einen Haken, sobald etwas
  verloren geht, und ersetzt dann alle `eeb.*`-Einträge; der Uhrstand des
  Geräts bleibt.
- **Alle Daten löschen**: entfernt alle `eeb.*`-Einträge in `localStorage` und
  `sessionStorage`, auch Papierkorb und Geräteschlüssel; nennt vorher
  Sammlungen ohne jeden Export (dort ist das Gerät die einzige Kopie). Der
  Widerspruch gegen die Reichweitenmessung (`skipgc`) bleibt bewusst stehen.
- **Beiseitegelegter Bestand** (D2l, D2o): wird nicht überschrieben, fällt nach
  90 Tagen weg, eigener Löschweg.
- **Verfügbarkeit** (`speicher-browser.ts`, `speicher-schonend.ts`,
  `speicher-warnung.tsx`): Die Web-App bittet um dauerhaften Speicher
  (`navigator.storage.persist`), sobald Wertvolles vorliegt; Lesen schreibt
  nur, wenn eine Frist etwas bereinigt hat; voller oder gesperrter Speicher
  wird gemeldet; Erinnerung an eine Sicherung nach drei Tagen.
- **Fehlerfänger** (`@bos/oberflaeche/fehlerfaenger`, Wege aus `main.tsx`):
  fängt Abstürze der Ansicht ab und bietet „Daten sichern" und „Alle Daten
  löschen".
- **Schema-Migration** (`@bos/eeb-format/model`): alte Bögen und Sammlungen
  (ab Schema 2, `eeb.einsaetze.v1` aus dem Erfassungsbogen) bleiben lesbar.

> *Prüfvermerk zur Übung:* `docs/funktionsumfang.md` (Zeile „Übung") sagt,
> für einen als Übung gekennzeichneten Bogen **oder Einsatz** greife die
> Datenschutzfrist nicht. Im Kern entscheidet allein der Haken `uebung` am
> Bogen (`datenschutzfristEnde`); eine Sammlung der Art „Übung" nimmt ihre
> Meldungen nicht von der Frist aus. Es gilt der Code; für die Bewertung ist
> das die strengere Lesart.

> *Entfällt gegenüber der Vorlage:* Rückholplatz des eigenen Bogens und
> Fensterabgleich des Entwurfs als Bedienweg, Musterung, Vorlagen-Papierkorb
> als Bedienweg, Absenderkarte als Opt-in-Eingabe. Die Module liegen teils als
> Datenmodule vor (D1, D2p, D3), ohne Oberfläche.

### 5.6 Update-Mechanismus

`electron-updater` prüft bei jedem Start der Desktop-Variante gegen die
neuesten GitHub Releases dieses Repositorys, lädt Updates im Hintergrund und
bietet einen Neustart an; Fehler (kein Netz, kein Release, unsignierter
Build) werden still ignoriert, um den Offline-Start nicht zu blockieren. Die
Web-App zeigt einen Service-Worker-Banner (`aktualisierung.tsx`).

### 5.7 Lagemonitor (neu gegenüber der Vorlage)

Der Lagemonitor (`lagemonitor-ui.tsx`, `lagemonitor.ts`,
`lagemonitor-beginn.ts`) ist ein zweites Fenster derselben App ohne eigene
Datenhaltung. Er zeigt Zusammenzählungen und **keine Personennamen**:
Funkrufname der Führungsstelle, Einsatzname und -ort, DTG, Dauer, Stärke,
Bewegungen (Einheitsname, Art, Zeit) und aufklappbar die Einheitentabelle
(Organisation, Heimatort, Funkrufname des ersten Fahrzeugs, Einheitentyp,
Stärke). Er hält den Bildschirm wach (Wake Lock), liest bei jedem
`storage`-Ereignis und alle fünf Sekunden neu, zeigt „ÜBUNG – keine
Echtlage" und kennt die Stufen hell, dunkel, gedimmt.

Sicherheitsrelevant ist die **Sichtbarkeit für Umstehende**: Ein Fernseher im
Raum oder im ELW zeigt die Lage jedem, der vorbeikommt, auch Presse,
Betroffenen oder Schaulustigen. Die App begrenzt den Inhalt auf das, was eine
Lagekarte ohnehin zeigt; Einheitsnamen sind Freitext der Einheit und
könnten im Einzelfall einen Personennamen tragen („Fachberater Meyer").
Organisatorisch zu regeln (M12).

## 6. IT-Grundschutz-Check (Ist-Soll-Vergleich)

Auswahl der einschlägigen Bausteine, soweit aus dem Quellcode bewertbar.
Bausteine mit organisatorischem Schwerpunkt (ORP, INF) sind nicht Gegenstand
dieses Dokuments.

### 6.1 APP.1.4 Mobile Anwendungen (Client) / APP.1.1 Client-Anwendungen allgemein

| Anforderung (sinngemäß) | Status | Fundstelle/Anmerkung |
| --- | --- | --- |
| Minimale Rechtevergabe der Anwendung | Erfüllt | `electron/main.js`: nur `media`, `clipboard-*`; Android-Rechte folgen mit Phase 5 |
| Sichere Speicherung sensibler Daten auf dem Endgerät | Teilweise erfüllt | Fachdaten in `localStorage`; privater Schlüssel unverschlüsselt (6.3); Fremdbestand D2p/D3 ohne Oberfläche (R11) |
| Deaktivierung nicht benötigter Schnittstellen | Erfüllt | CSP: genau ein Fremd-Host; kein Fremdcode |
| Sichere Update-Mechanismen | Teilweise erfüllt | `electron-updater` vorhanden, Pakete unsigniert (6.4) |
| Zusage „offline bereit" entspricht dem Gerätezustand | Teilweise erfüllt | Service Worker mit zweistufigem Vorrat (Phase 0); Fortschrittsanzeige und die Neuregistrierung bei abgebrochenem Erstladen (`offline-bereit.ts`, `offline-vorrat.ts`) sind noch nicht übernommen (funktionsumfang.md: „offen, Phase 2") |
| Anzeige auf zusätzlichem Bildschirm ohne Personendaten | Erfüllt (technisch) | Lagemonitor ohne Personennamen (5.7); Aufstellung organisatorisch (M12) |

### 6.2 SYS.2.1 Allgemeiner Client / CON.10 Entwicklung von Webanwendungen

| Anforderung (sinngemäß) | Status | Fundstelle/Anmerkung |
| --- | --- | --- |
| Content-Security-Policy | Erfüllt (Skript) / bewusster Rest (Style) | 5.3 |
| Eingabevalidierung / Schutz vor Injection | Erfüllt (Ausgabewege) | CSV-Formel-Abwehr, XLSX-Escaping (5.4) |
| Robustheit gegenüber fehlerhaften/böswilligen Eingabedaten | Erfüllt | QR-Payload über `inflateRawBegrenzt` (`MAX_ENTPACKT = 4 MiB`, `src/app/hilfen.ts`, als `browserKompressor` in allen Eingängen); PDF-Ströme mit Deckel 32 MiB je Strom und 64 MiB je PDF, Bilder höchstens 2000 × 2000 Punkte (`@bos/eeb-satz` `pdf-stroeme`, `pdf-bilder`, seit `42ddbea`/`c937411`; im Erfassungsbogen ohne diesen Deckel); `sicherungParsen` prüft Format und Version; `einsaetze-lesen.ts`, `bogen-pruefung.ts`, `eingang/unlesbar.ts` prüfen beim Lesen und legen Unlesbares beiseite |
| Fangnetz bei Abstürzen der Ansicht | Erfüllt | Fehlerfänger aus `@bos/oberflaeche` mit Sichern und Löschen |
| Kontextisolation bei hybriden Apps | Erfüllt | `contextIsolation`, `sandbox`, kein Preload; Lagemonitor-Fenster gleich gehärtet |

### 6.3 CON.8 Software-Entwicklung / Kryptokonzept

| Anforderung (sinngemäß) | Status | Fundstelle/Anmerkung |
| --- | --- | --- |
| Dokumentiertes Schlüsselkonzept | Erfüllt | Trust-Modell in `docs/datenmodell.md` des Erfassungsbogens und in `geraete-schluessel.ts`; im Meldekopf selbst kein eigenes Datenmodell-Dokument |
| Schutz privater Schlüssel gegen unbefugten Zugriff | Nicht erfüllt | Klartext-Hex im `localStorage`; zusätzlich in jeder Datensicherungsdatei (D7) |
| Sichere kryptografische Verfahren | Erfüllt | Ed25519 (`@noble/ed25519`) |
| Schlüsselwechsel bei Kompromittierungsverdacht möglich | Erfüllt | „Geräteschlüssel neu erzeugen…" in der Datensicherung der Fußzeile (`daten-gruppe.tsx`): Rückfrage, Angebot einer Sicherung vorher, dann neues Paar und Neuladen. Kein Widerruf des alten Schlüssels (TOFU) |

### 6.4 OPS.1.1.6 Software-Tests und Freigaben / Software-Lieferkette

| Anforderung (sinngemäß) | Status | Fundstelle/Anmerkung |
| --- | --- | --- |
| Automatisierte Tests vor Veröffentlichung | Erfüllt | `ci.yml` und Stufe `check` in `release.yml`: Kern-Kopien, Typprüfung, Vitest, Build, Bundle-Budget, Cucumber/Playwright gegen den Build. Ein Lint-Schritt, den `docs/architektur.md` Kap. 7 für `check` nennt, steht in `ci.yml` nicht |
| Signierte/verifizierbare Auslieferungspakete | Nicht erfüllt | Windows und Linux unsigniert; macOS und Android stillgelegt |
| Versionierte, nachvollziehbare Abhängigkeiten | Erfüllt | `package-lock.json`; sechs Submodule mit gepinnten Commits; CI-Gate `kern-kopien` gegen Kopien von Kern-Code |
| Regelmäßige Prüfung auf Schwachstellen (SCA) | Erfüllt | `.github/dependabot.yml` (wöchentlich, `@bos/*` ausgenommen); `npm audit --omit=dev --audit-level=high` blockierend, `npm audit` über alles als Hinweis |
| Stückliste der ausgelieferten Software (SBOM) | Erfüllt | `npm run sbom` (CycloneDX), im CI als Artefakt, im Release als Asset |
| Dokumentierter Meldeweg für Schwachstellen | **Offen** (neu bewertet; Vorlage: Erfüllt) | Im Repository gibt es keine `SECURITY.md`; der Meldeweg des Erfassungsbogens deckt dieses Repository und die zwei neuen Submodule nicht ab (M13) |

## 7. Ergänzende Risikoanalyse (BSI-Standard 200-3, Auswahl)

| # | Gefährdung | Betroffenes Zielobjekt | Eintrittswahrscheinlichkeit | Schadenshöhe | Gesamt |
| --- | --- | --- | --- | --- | --- |
| R1 | Verlust/Diebstahl eines Meldekopf-Geräts mit ungesperrtem Zugriff | D2 und alle lokalen Daten | Mittel (Tablet am Eingang, auf der Motorhaube, im ELW) | **Sehr hoch** (neu bewertet; Vorlage: Hoch): Personendaten aller Einheiten eines Einsatzes, Freitexte, Schlüssel | **Hoch** |
| R2 | ~~Dekomprimierungs-Angriff über präparierte Importdatei~~ — **behoben**: QR-Payload über `inflateRawBegrenzt`, PDF-Ströme und -Bilder mit eigenem Deckel (Phase 3, siehe 6.2) | A1–A2 | Niedrig | Mittel | Sehr niedrig |
| R3 | Diebstahl/Auslesen des privaten Signaturschlüssels — vom Gerät **oder aus einer Datensicherungsdatei** | D4, D7, K1 | Niedrig-Mittel (neu: jede Sicherungsdatei trägt ihn) | Mittel (Gegenzeichnen im Namen des Meldekopfs) | Mittel |
| R4 | Cross-Site-Scripting trotz CSP; Restrisiko über `style-src 'unsafe-inline'` | A1 | Niedrig | Hoch (Zugriff auf den gesamten `localStorage` des Tabs = alle Sammlungen) | Niedrig |
| R5 | Kompromittierte oder manipulierte Build-/Update-Kette, auch über eines der sechs Submodule | B1–B5, A2 | Niedrig | Hoch | Mittel-Hoch |
| R6 | Fehlende Signaturprüfung durch den Meldekopf beim Empfang | K1, D2 | Mittel | Mittel | Niedrig-Mittel — Prüfung beim Empfang live seit Phase 3; Restrisiko: ein unsignierter oder fremd signierter Bogen wird trotzdem aufgenommen, nur gekennzeichnet (M6) |
| R7 | Ausfall der Anwendung oder des Geräts im Einsatz (Defekt, Akku, Absturz, geräumter Browser-Speicher) | A1–A2, D2 | Mittel | **Sehr hoch** (die laufende Lage hängt an einem Gerät) | **Hoch** (begrenzt durch Lageblatt, Sammel-PDF und Papier-Abgleich als Rückfallebene) |
| R8 | ~~Fehlende SCA~~ — **erledigt** (Dependabot, `npm audit`, SBOM) | B3 | Mittel | Mittel | Niedrig |
| R9 | **Neu:** Einsicht Unbefugter in die Lage über den Lagemonitor (Fernseher im Raum, am Fahrzeug, Foto davon) | A1a, Zweiter Bildschirm | Hoch (bestimmungsgemäß sichtbar) | Niedrig-Mittel (keine Personennamen; Einsatzstärke und Kräfte erkennbar) | Mittel |
| R10 | **Neu:** Sicherungsdatei, Sammel-PDF oder Einsatz-Datei gelangt an einen falschen Ort (Messenger, Cloud, offener USB-Stick) | D6, D7 | Mittel | Hoch (Vollkopie aller Personendaten; bei D7 mit Schlüssel) | **Hoch** |
| R11 | **Neu:** Unsichtbarer Fremdbestand aus einer eingespielten Erfassungsbogen-Sicherung (Vorlagen, Entwurf, Absenderkarte) bleibt unbemerkt liegen; die Absenderkarte reiste bis 2026-10-25 ungefragt in jedem neu erzeugten QR-Code mit (behoben) | D1, D2p, D3, D5 | Mittel (ADR-007 empfiehlt die Sicherung als Übernahmeweg) | Mittel | Mittel |
| R12 | **Neu:** Bestand des Erfassungsbogens bleibt nach der Übernahme auf dem alten Gerät/der alten Herkunft liegen (zwei Kopien) | D2 | Mittel (Übergangszeit, ADR-007) | Mittel | Mittel |

**Höchste Einzelrisiken:** R1 (Geräteverlust), R7 (Ausfall) und R10
(Vollkopien außer Haus) — primär organisatorisch. R5 liegt beim
Projektbetreiber. R11 ist technisch verursacht und durch die App selbst zu
mindern.

## 8. Maßnahmenplan

| # | Bezug | Maßnahme | Art | Verantwortlich | Priorität |
| --- | --- | --- | --- | --- | --- |
| M1 | R1 | Verbindliche Bildschirmsperre (PIN/Biometrie) am Meldekopf-Gerät; Geräteverschlüsselung (BitLocker/FileVault/Android); Meldekopf-Gerät nicht unbeaufsichtigt entsperrt lassen; nach dem Einsatz Sammlungen exportieren und auf dem Gerät löschen | Organisatorisch/technisch | `[Organisation/IT-Verantwortliche/r]` | Hoch |
| M2 | R2 | Erledigt (Phase 3 geprüft): QR-Eingänge über `inflateRawBegrenzt`; die PDF-Ströme liefen ungedeckelt über `pako.inflate` und haben seitdem einen eigenen Deckel in `@bos/eeb-satz`. Bei jedem neuen Eingang erneut prüfen | Technisch | `[Projektbetreiber/Maintainer]` | Erledigt |
| M3 | R3 | Bis zu einer verschlüsselten Ablage: Geräteabsicherung (M1); Sicherungsdateien wie Schlüssel behandeln (M10); bei Verdacht „Geräteschlüssel neu erzeugen…" und neue Kurzform an Stab und Ablösung geben; Zuständigkeit festlegen | Organisatorisch (technische Grundlage vorhanden) | `[Organisation]` | Mittel |
| M4 | R4 | `style-src 'unsafe-inline'` bewusst belassen; `pdfmake`-Updates gegen die CSP prüfen (5.3) | Technisch | `[Projektbetreiber/Maintainer]` | Niedrig |
| M5 | R5 | Nur Pakete aus dem offiziellen GitHub-Release dieses Repositorys einsetzen, Prüfsummen dokumentieren; bevorzugt die PWA von meldekopf.erfassungsbogen.app; Signierung der Windows-Pakete als Projektziel | Organisatorisch/technisch | `[Organisation]` / `[Projektbetreiber]` | Hoch |
| M6 | R6 | Dienstanweisung, Siegel an der Karte zu beachten, besonders bei mehrstufiger Weitergabe | Organisatorisch | `[Organisation/Meldekopf-Verantwortliche/r]` | Mittel |
| M7 | R7 | Papier als Rückfallebene: Lageblatt in festen Abständen drucken, Blanko-Vordrucke vorhalten; Ladezustand, Netzteil, Zusatzakku; regelmäßig Datensicherung oder Sammel-PDF auf zweitem Medium; Web-App: dauerhaften Speicher bestätigen oder als PWA installieren | Organisatorisch | `[Organisation/Einsatzleitung]` | Hoch |
| M8 | R8 | Erledigt beim Projekt; für die Organisation: neue Versionen mind. halbjährlich auf sicherheitsrelevante Änderungen prüfen | Organisatorisch | `[Organisation]` | Mittel |
| M9 | Alle | Sensibilisierung des Meldekopf-Personals: Gerätesperre, Lageblatt als Aushang (Rückrufnummern), Umgang mit Sammel-PDF/Einsatz-Datei/Sicherungsdatei, Meldung bei Geräteverlust | Organisatorisch/personell | `[Organisation/Ausbildungsverantwortliche/r]` | Hoch |
| M10 | R3, R10 | Ablageorte für Sammel-PDF, Einsatz-Datei, CSV/Excel und **Datensicherungsdateien** festlegen (keine privaten Messenger, keine ungeregelte Cloud); Sicherungsdateien nach dem Einsatz löschen | Organisatorisch | `[Organisation/Datenschutzbeauftragte/r]` | Hoch |
| M11 | R11 | Für die Übernahme aus dem Erfassungsbogen bevorzugt die **Einsatz-Datei** statt der Datensicherung nutzen („Einsatz importieren…“, seit Phase 3); wird eine Sicherung eingespielt, die Rückfrage lesen (Vorlagen, Entwurf, Absenderkarte) und ein reines Erfassungsbogen-Gerät nicht als Quelle nehmen. **Technisch (Projekt):** Absenderkarte beim Signieren nicht verwenden — erledigt 2026-10-25; offen: Vorlagen beim Einspielen wahlweise weglassen | Organisatorisch / technisch (Weiterentwicklung) | `[Organisation]` / `[Projektbetreiber]` | Mittel |
| M12 | R9 | Aufstellung des Lagemonitors festlegen: nicht zur Straße/zum Publikum, im ELW Tür beachten; abschalten oder „gedimmt" bei Publikumsverkehr; Fotografierverbot im Bereich, wo üblich; Einheitsnamen ohne Personennamen erfassen | Organisatorisch | `[Organisation/Einsatzleitung]` | Mittel |
| M13 | 6.4 | `SECURITY.md` mit Meldeweg für dieses Repository und die Submodule `bos-eeb-satz`, `bos-oberflaeche` anlegen | Technisch/organisatorisch | `[Projektbetreiber/Maintainer]` | Mittel |
| M14 | R12 | Nach erfolgreicher Übernahme in den Meldekopf die Sammlung im Erfassungsbogen und die verwendete Sicherungsdatei löschen | Organisatorisch | `[Organisation]` | Mittel |
| M15 | — | Diesen Entwurf durch die/den IT-Sicherheitsbeauftragte/n prüfen und freigeben lassen, insbesondere Abschnitt 4; mit jeder Phase (3, 4, 5) fortschreiben | Organisatorisch | `[IT-Sicherheitsbeauftragte/r]` | Hoch |

> *Entfällt gegenüber der Vorlage:* nichts aus M1 bis M10 der Vorlage
> entfällt ganz; M2 und M6 sind auf den Phasenstand angepasst, M10 der Vorlage
> (Freigabe) heißt hier M15.

## 9. Restrisikobetrachtung

Unter der Voraussetzung, dass die organisatorischen Maßnahmen M1, M5, M7, M9,
M10 und M12 umgesetzt werden, verbleibt nach Einschätzung dieses Entwurfs ein
**mittleres Restrisiko** — eine Stufe über dem des Erfassungsbogens, weil das
Meldekopf-Gerät und seine Ausgaben die Personendaten vieler Einheiten bündeln.
Die verbleibenden technischen Schwachstellen (R3 Schlüsselablage, R5
unsignierte Pakete, R11 Fremdbestand) liegen im Verantwortungsbereich der
Software-Weiterentwicklung und sind durch die einsetzende Organisation nicht
direkt behebbar.

Diese Einschätzung ersetzt keine rechtliche oder technische Prüfung.

## 10. Fortschreibung

Dieses Konzept ist zu überprüfen und fortzuschreiben:

- mit jeder Übernahme-Phase: Phase 3 (Eingänge: Signaturprüfung, wartender
  Link, Dekompressionsdeckel, Kamera; fortgeschrieben 2026-10-25), Phase 4 (Schnellerfassung, Entwurf,
  Link zum Erfassungsbogen), Phase 5 (Android, Release-Signierung),
- bei jeder App-Version mit sicherheitsrelevanten Änderungen (CSP,
  Schlüsselverwaltung, Update-Mechanismus, neue Speicherorte, neue Hosts),
- bei wesentlichen Änderungen des Einsatzkontexts oder Geräteumfangs der
  einsetzenden Organisation,
- mindestens jedoch einmal jährlich.

## 11. Ergebnis und Freigabe

| Rolle | Name | Datum | Unterschrift |
| --- | --- | --- | --- |
| IT-Sicherheitsbeauftragte/r | `[Name]` | | |
| Verantwortlich/Leitung | `[Name]` | | |
| Ersteller/in dieses Entwurfs | KI-gestützte Analyse, fachlich zu verantworten durch `[Name]` | 2026-10-25 | |

## Anhang: Herangezogene Quellen

Dieses Sicherheitskonzept stützt sich ausschließlich auf öffentlich
einsehbaren Quellcode und dessen Kommentare/Dokumentation:

- Vorlage: `docs/informationssicherheitskonzept.md` des Erfassungsbogens, Commit `441811c`
- `electron/main.js`, `package.json` (Feld `build`) — Electron-Härtung, Rechte, Lagemonitor-Fenster
- `vite.config.ts`, `src/app/adressen.ts` — Content-Security-Policy, Domain, Zähl-Host
- `src/app/statistik.ts`, `src/app/fusszeile.tsx`, `public/datenschutz.html` — Reichweitenmessung, Widerspruch
- `src/app/geraete-schluessel.ts`, `src/app/hilfen.ts` (`qrErzeugen`), `vendor/eeb-format/src/signatur.ts` — Schlüssel, Signatur, Gegenzeichnung
- `src/app/sicherung.ts`, `src/app/sicherung-datei.ts`, `src/app/daten-gruppe.tsx` — Datensicherung, Einspielen, Alle Daten löschen
- `src/app/datenschutz-uhr.ts`, `src/app/uhr-korrektur.ts`, `src/app/uhr-folgen.ts`, `src/app/papierkorb-frist.ts`, `src/app/aufraeum-hinweis.ts`, `vendor/bos-meldekopf/src/einsaetze.ts`, `vendor/bos-meldekopf/src/papierkorb.ts`, `vendor/eeb-format/src/datenschutzfrist.ts` — Fristen und geprüfte Uhr
- `src/app/weitergabe/*`, `vendor/bos-eeb-satz/src/csv.ts`, `vendor/bos-eeb-satz/src/xlsx.ts` — Ausgabewege und ihre Absicherung
- `src/app/lagemonitor*.ts(x)` — Lagemonitor
- `src/app/entwurf.ts`, `src/app/vorlagen.ts`, `src/app/uebergabe-stand.ts`, `src/app/absenderkarte.ts`, `src/app/eingang/unlesbar.ts` — Fremd- und Restbestand
- `.github/workflows/ci.yml`, `.github/workflows/release.yml`, `.github/dependabot.yml`, `.gitmodules` — CI/CD, Lieferkette
- `PRODUCT.md`, `docs/architektur.md`, `docs/funktionsumfang.md`, `docs/uebernahme-aus-erfassungsbogen.md` dieses Repositorys
- [Datenschutz-Folgenabschätzung](datenschutz-folgenabschaetzung.md) dieses Projekts
