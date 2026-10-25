/**
 * Seiten-Fußzeile: Pflichtangaben (Impressum, Datenschutz als Dialoge),
 * Projektlinks, Anzeigemodus, Version und die Werkzeugzeile.
 *
 * Herkunft: Erfassungsbogen `src/app/fusszeile.tsx` (Commit f2b77f1), in
 * Phase 0 auf das gekürzt, was die leere App braucht. Die Gruppe „Daten"
 * (Datensicherung, Geräteschlüssel, Alle Daten löschen) steht seit Phase 2 in
 * daten-gruppe.tsx (Stand 441811c); der Blanko-Vordruck liegt in der
 * Einsatzansicht; die
 * Beispielbögen bleiben beim Erfassungsbogen (Übernahme-Doku, Abschnitt F).
 * Aufbau der Dialoge und der Gruppen wie dort (Audit Runde 2, R2-G3:
 * Zielmaß der Zeilen; R2-L6/R4-L2: Zweitschrift in gerechneten Tönen).
 */

import { Fragment, useRef, useState, type ChangeEvent, type ReactNode, type RefObject } from "react";
import { ERFASSUNGSBOGEN_URL, REPO_URL } from "./adressen";
import { AnzeigeSchalter } from "@bos/oberflaeche/anzeige-schalter";
import { nutzungsKanal, statistikAbgewaehlt, statistikAbwaehlen } from "./statistik";
import { WERKZEUGE, WERKZEUGE_TITEL } from "./werkzeuge";
import { DatenGruppe } from "./daten-gruppe";

const KONTAKT = "johannes.rudolph@thw-oldenburg.de";

function Dialog({ titel, dialogRef, klasse, onSchliessen, children }: {
  titel: string;
  dialogRef: RefObject<HTMLDialogElement | null>;
  klasse?: string;
  /** Feuert auch bei Esc und Backdrop-Schluss, nicht nur beim Knopf. */
  onSchliessen?: () => void;
  children: ReactNode;
}) {
  return (
    <dialog ref={dialogRef} aria-label={titel} className={klasse} onClose={onSchliessen}>
      <div className="kopfzeile">
        <h2>{titel}</h2>
        <button type="button" onClick={() => dialogRef.current?.close()}>Schließen</button>
      </div>
      {children}
    </dialog>
  );
}

/**
 * Impressum und Datenschutz stehen als eigene Bausteine, weil sie die einzigen
 * Teile der Fußzeile sind, die auf jeder Seite erreichbar bleiben müssen — auch
 * in einer schmalen Fußzeile, die den Rest weglässt.
 */
function Impressumsdialog({ dialogRef }: { dialogRef: RefObject<HTMLDialogElement | null> }) {
  return (
    <Dialog titel="Impressum" dialogRef={dialogRef}>
      <p><strong>Angaben gemäß § 5 DDG</strong></p>
      <p>
        Johannes Rudolph<br />
        Kniphauser Straße 16<br />
        26419 Schortens<br />
        Deutschland
      </p>
      <p><strong>Kontakt</strong></p>
      <p>E-Mail: <a href={`mailto:${KONTAKT}`}>{KONTAKT}</a></p>
      <p><strong>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</strong></p>
      <p>Johannes Rudolph</p>
    </Dialog>
  );
}

function Datenschutzdialog({ dialogRef }: { dialogRef: RefObject<HTMLDialogElement | null> }) {
  const [statistikAus, setStatistikAus] = useState(() => statistikAbgewaehlt());

  function statistikUmschalten(ereignis: ChangeEvent<HTMLInputElement>) {
    const aus = ereignis.target.checked;
    setStatistikAus(aus);
    statistikAbwaehlen(aus);
  }

  return (
    <Dialog titel="Datenschutz" dialogRef={dialogRef}>
      <h3>1. Verantwortlicher</h3>
      <p>
        Johannes Rudolph<br />
        E-Mail: <a href={`mailto:${KONTAKT}`}>{KONTAKT}</a>
      </p>
      <h3>2. Verarbeitung beim Aufruf der Website</h3>
      <p>
        Die Website wird über GitHub Pages (GitHub Inc.) ausgeliefert. Dabei verarbeitet
        GitHub technisch notwendige Verbindungsdaten (z.&nbsp;B. IP-Adresse) in
        Server-Logs zur Bereitstellung und Absicherung des Dienstes. Details:{" "}
        <a href="https://docs.github.com/site-policy/privacy-policies/github-privacy-statement"
          target="_blank" rel="noopener noreferrer">GitHub Privacy Statement</a>.
      </p>
      <h3>3. Daten in der App</h3>
      <p>
        Alles, was in der App erfasst oder aufgenommen wird, verarbeitet sie
        ausschließlich lokal auf dem eigenen Gerät. Es findet keine Übertragung an
        einen Server statt. Eine Weitergabe erfolgt nur, wenn Nutzende selbst eine
        Datei, ein PDF oder einen QR-Code erzeugen und teilen.
      </p>
      <h3>4. Speicherung im Endgerät und Reichweitenmessung</h3>
      <p>
        Es werden keine Cookies gesetzt. Die App speichert ihre Einstellungen im
        lokalen Speicher (localStorage) des Geräts: die gewählte Anzeige
        (Standard, Feld, Dunkel, Nacht) und einen Widerspruch gegen die
        Reichweitenmessung. Dort liegen auch die Einsatz-Sammlungen mit den
        Bögen der gemeldeten Einheiten, darin Namen, Funktionen und Kontaktdaten
        von Einsatzkräften, dazu ein Signaturschlüssel dieses Geräts.
      </p>
      <p>
        Fristen: 90 Tage nach der letzten Änderung eines Bogens werden die
        Personenangaben darin anonymisiert überschrieben (Übungsbögen
        ausgenommen); eine
        Sammlung, die 90 Tage nicht geändert wurde, wird gelöscht; gelöschte
        Sammlungen liegen 30 Tage im Papierkorb. Maßgeblich ist die geprüfte
        Uhr des Geräts. Sofort löschen lässt sich alles über „Alle Daten löschen"
        in der Fußzeile.
      </p>
      <p>
        Diese Einträge sind für den ausdrücklich gewünschten Dienst technisch
        erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG); eine Einwilligung ist dafür
        nicht nötig. Sie verlassen das Gerät nicht: es gibt keine Übertragung
        an einen Server, keinen Zugriff durch Dritte und keine Kennung zur
        Wiedererkennung. Gelöscht werden sie durch Löschen der Websitedaten im
        Browser.
      </p>
      <p>
        Zur Reichweitenmessung wird{" "}
        <a href="https://www.goatcounter.com/" target="_blank" rel="noopener noreferrer">
          GoatCounter
        </a>{" "}
        eingesetzt: beim Start wird einmalig ein Zählimpuls gesendet. Übertragen
        werden nur Zeitpunkt und Nutzungsart ({nutzungsKanal().titel}) sowie – im
        Browser – die verweisende Seite. Die IP-Adresse wird nicht gespeichert, es
        entsteht keine geräteübergreifende Kennung. Inhalte der App werden nicht
        übertragen. Ohne Internetverbindung unterbleibt der Impuls.
        Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO.
      </p>
      <label className="inline">
        <input type="checkbox" checked={statistikAus} onChange={statistikUmschalten} />
        Nicht mitzählen (gilt ab dem nächsten Start)
      </label>
      <h3>5. Betroffenenrechte</h3>
      <p>
        Nach Art. 15–21 DSGVO bestehen Rechte auf Auskunft, Berichtigung, Löschung,
        Einschränkung der Verarbeitung und Widerspruch. Anfragen bitte an die oben
        genannte E-Mail-Adresse. Der Reichweitenmessung wird über das Kästchen in
        Abschnitt 4 widersprochen.
      </p>
    </Dialog>
  );
}

export function Fusszeile() {
  const impressum = useRef<HTMLDialogElement>(null);
  const datenschutz = useRef<HTMLDialogElement>(null);

  return (
    <footer className="seite">
      {/* Nach Zweck gruppiert statt als eine Reihe gleich gewichteter Links:
          „was tut der Eintrag" ist die einzige Ordnung, die hier etwas
          Wahres über den Inhalt aussagt. Der Anzeige-Umschalter ist ein
          Bedienelement und kein Link — er bekommt eine eigene, benannte
          Spalte statt zwischen den Links zu stehen. */}
      <div className="fuss-gruppen">
        <DatenGruppe Dialog={Dialog} />
        <nav className="fuss-gruppe" aria-label="Rechtliches">
          <span className="fuss-titel">Rechtliches</span>
          <button type="button" className="link" onClick={() => impressum.current?.showModal()}>Impressum</button>
          <button type="button" className="link" onClick={() => datenschutz.current?.showModal()}>Datenschutz</button>
        </nav>
        <nav className="fuss-gruppe" aria-label="Projekt">
          <span className="fuss-titel">Projekt</span>
          <a href={ERFASSUNGSBOGEN_URL} target="_blank" rel="noopener noreferrer">Erfassungsbogen</a>
          <a href={`mailto:${KONTAKT}`}>Kontakt</a>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer">Open Source auf GitHub</a>
        </nav>
        <div className="fuss-gruppe">
          <span className="fuss-titel">Ansicht</span>
          <AnzeigeSchalter />
        </div>
      </div>
      <p className="fuss-marke">
        Meldekopf · Version {__APP_VERSION__} · EUPL-1.2
      </p>

      <Impressumsdialog dialogRef={impressum} />
      <Datenschutzdialog dialogRef={datenschutz} />

      <Werkzeugzeile />
    </footer>
  );
}

/**
 * Letzte Zeile jeder Fußzeile: die Werkzeuge desselben Autors (werkzeuge.ts).
 * Der Mittelpunkt steht als eigenes, verborgenes Element zwischen den Links —
 * nicht unterstrichen, nicht angetippt, nicht vorgelesen.
 */
function Werkzeugzeile() {
  return (
    <nav className="fuss-werkzeuge" aria-label={WERKZEUGE_TITEL}>
      {WERKZEUGE.map((w, i) => (
        <Fragment key={w.href}>
          {i > 0 && <span aria-hidden="true">·</span>}
          <a href={w.href} target="_blank" rel="noopener noreferrer">{w.label}</a>
        </Fragment>
      ))}
    </nav>
  );
}
