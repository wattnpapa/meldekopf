/**
 * Herkunft: neu in der Meldekopf-App.
 *
 * Tor-Ansicht: Am Tor des Bereitstellungsraums vermerken, welches Fahrzeug rausfährt und welches zurückkommt.
 *
 * Der Helfer hält das Kennzeichen in den Rahmen oder tippt dessen letzte Zeichen. Die Kamera liest laufend mit
 * (kennzeichen-leser.ts) und gleicht nur gegen die Kennzeichen dieser Sammlung ab (kennzeichen-abgleich.ts). Ein
 * Treffer zeigt Fahrzeug und Einheit; gebucht wird erst mit „Fährt raus" oder „Kommt zurück". Die Tippsuche geht
 * immer: bei Nacht, Schmutz und Regen, ohne Kamera und auf Geräten, die die Texterkennung nicht ausführen.
 *
 * Die Stärke der Einheit bleibt unverändert (fahrzeug-stand.ts). Ein modaler Dialog über der Einsatzansicht, wie der
 * Scanner; Kamera und Rückgriffe (`kameraOeffnen`, `kameraRat`) sind dessen.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { Einsatzsammlung } from "@bos/meldekopf/einsaetze";
import { useModalesOverlay } from "@bos/oberflaeche/modal-overlay";
import { gemerkteKamera, type Kasten } from "../eingang/kamera";
import { kameraOeffnen, kameraRat, type KameraFehler } from "../eingang/qr-scanner-web";
import { SpeicherVollFehler, zeitKurz } from "../eintrag-zeiten";
import { fahrzeugBewegen, fahrzeugBewegungZurueck, fahrzeugName, torFahrzeuge, type BewegungVorher, type TorFahrzeug } from "./fahrzeug-stand";
import { erkennungAuswerten, torSuche } from "./kennzeichen-abgleich";
import type { KennzeichenLeser } from "./kennzeichen-leser";
import "./tor.css";

/** Breite des Bilds, das an die Texterkennung geht: genug für die Zeichen, klein genug für ein Bild in Bruchteilen einer Sekunde. */
const LESE_BREITE = 640;
/** Pause zwischen zwei Lesungen: Die Erkennung soll das Telefon nicht dauerhaft auslasten. */
const LESE_PAUSE_MS = 120;
/** So lange wird ein eben gebuchtes Kennzeichen, das noch im Bild steht, nicht wieder vorgeschlagen. */
const GEBUCHT_RUHE_MS = 8_000;
/** Mehr Zeilen zeigt die Liste nicht auf einmal; wer mehr hat, tippt. */
const LISTE_MAX = 40;

/**
 * Der Bildausschnitt unter dem Rahmen, in Pixeln des Kamerabilds, mit etwas Zugabe ringsum. Das Video liegt mit
 * `object-fit: cover` in seinem Kasten (gleichmäßig skaliert, mittig, Überstand beschnitten). Ohne brauchbare Maße das
 * ganze Bild.
 */
export function rahmenAusschnitt(
  video: { breite: number; hoehe: number },
  anzeige: Kasten,
  rahmen: Kasten | undefined,
  zugabe = 1.12,
): { x: number; y: number; breite: number; hoehe: number } {
  const ganz = { x: 0, y: 0, breite: video.breite, hoehe: video.hoehe };
  if (!rahmen || rahmen.width <= 0 || rahmen.height <= 0 || anzeige.width <= 0 || anzeige.height <= 0) return ganz;
  const massstab = Math.max(anzeige.width / video.breite, anzeige.height / video.hoehe);
  const versatzX = (video.breite - anzeige.width / massstab) / 2;
  const versatzY = (video.hoehe - anzeige.height / massstab) / 2;
  const mitteX = versatzX + (rahmen.x + rahmen.width / 2 - anzeige.x) / massstab;
  const mitteY = versatzY + (rahmen.y + rahmen.height / 2 - anzeige.y) / massstab;
  const b = (rahmen.width / massstab) * zugabe;
  const h = (rahmen.height / massstab) * zugabe;
  const x0 = Math.max(0, Math.floor(mitteX - b / 2));
  const y0 = Math.max(0, Math.floor(mitteY - h / 2));
  const x1 = Math.min(video.breite, Math.ceil(mitteX + b / 2));
  const y1 = Math.min(video.hoehe, Math.ceil(mitteY + h / 2));
  if (x1 - x0 < 1 || y1 - y0 < 1) return ganz;
  return { x: x0, y: y0, breite: x1 - x0, hoehe: y1 - y0 };
}

type KameraLage =
  | { art: "aus" }
  | { art: "startet" }
  | { art: "laeuft" }
  | { art: "fehler"; fehler: KameraFehler }
  /** Die Kamera ginge, die Texterkennung nicht (altes Gerät, Desktop-App). */
  | { art: "ohne-erkennung" };

function standText(f: TorFahrzeug): string {
  if (f.unterwegsSeit != null) return `unterwegs seit ${zeitKurz(f.unterwegsSeit)}`;
  if (f.zurueckAm != null) return `zurück seit ${zeitKurz(f.zurueckAm)}`;
  return "im Bereitstellungsraum";
}

export default function TorAnsicht({ einsatz, onGeaendert, onSchliessen }: { einsatz: Einsatzsammlung; onGeaendert: () => void; onSchliessen: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useModalesOverlay(dialogRef, { onSchliessen });
  const videoRef = useRef<HTMLVideoElement>(null);
  const rahmenRef = useRef<HTMLDivElement>(null);
  const eingabeRef = useRef<HTMLInputElement>(null);

  const fahrzeuge = useMemo(() => torFahrzeuge(einsatz), [einsatz]);
  const fahrzeugeRef = useRef(fahrzeuge);
  fahrzeugeRef.current = fahrzeuge;

  const [kameraAn, setKameraAn] = useState(true);
  const [versuch, setVersuch] = useState(0);
  const [kamera, setKamera] = useState<KameraLage>({ art: "startet" });
  const [gelesen, setGelesen] = useState("");
  const [eingabe, setEingabe] = useState("");
  /** Das gewählte Fahrzeug (Treffer der Kamera oder Tipp in der Liste): Einheit und Schlüssel. */
  const [wahl, setWahl] = useState<{ einheitSchluessel: string; schluessel: string } | null>(null);
  /** Die Kamera hat etwas gelesen, das auf mehrere Fahrzeuge passt: Diese stehen zur Wahl. */
  const [mehrere, setMehrere] = useState<string[] | null>(null);
  const [quittung, setQuittung] = useState<{ text: string; vorher: BewegungVorher } | null>(null);
  const [fehler, setFehler] = useState("");
  const [blitz, setBlitz] = useState(false);
  /** Eben gebuchtes Kennzeichen: bleibt es im Bild, schlägt die Kamera es nicht gleich wieder vor. */
  const gebucht = useRef<{ schluessel: string; bis: number } | null>(null);
  const wahlRef = useRef(wahl);
  wahlRef.current = wahl;

  useEffect(() => {
    if (!kameraAn) {
      setKamera({ art: "aus" });
      return;
    }
    let aktiv = true;
    let stream: MediaStream | null = null;
    let leser: KennzeichenLeser | null = null;
    let uhr: ReturnType<typeof setTimeout> | undefined;
    /** Der vorige unsichere Treffer: Erst die zweite gleiche Lesung gilt. */
    let vorige = "";
    // Die Zeichenfläche entsteht erst mit dem ersten Bild: Ohne Kamera braucht sie niemand.
    let leinwand: HTMLCanvasElement | null = null;
    let ctx: CanvasRenderingContext2D | null = null;
    setKamera({ art: "startet" });
    setGelesen("");

    function treffer(schluessel: string[]) {
      const jetzt = Date.now();
      if (schluessel.length === 1 && gebucht.current && gebucht.current.schluessel === schluessel[0] && gebucht.current.bis > jetzt) return;
      const passend = fahrzeugeRef.current.filter((f) => schluessel.includes(f.schluessel));
      if (passend.length === 0) return;
      if (passend.length === 1) {
        const f = passend[0]!;
        const schon = wahlRef.current;
        if (schon && schon.schluessel === f.schluessel && schon.einheitSchluessel === f.einheitSchluessel) return;
        setMehrere(null);
        setWahl({ einheitSchluessel: f.einheitSchluessel, schluessel: f.schluessel });
      } else {
        // Dasselbe Kennzeichen an zwei Einheiten oder zwei ähnliche Kennzeichen: Der Helfer wählt.
        setWahl(null);
        setMehrere(schluessel);
      }
      setEingabe("");
      setFehler("");
      setBlitz(true);
      setTimeout(() => setBlitz(false), 350);
      try {
        navigator.vibrate?.(60);
      } catch {
        /* Vibration ist Zugabe */
      }
    }

    async function lesen() {
      if (!aktiv) return;
      const video = videoRef.current;
      if (video && leser && video.readyState >= video.HAVE_ENOUGH_DATA && video.videoWidth && document.visibilityState === "visible") {
        leinwand ??= document.createElement("canvas");
        ctx ??= leinwand.getContext("2d", { willReadFrequently: true });
      }
      if (video && leinwand && ctx && leser && video.readyState >= video.HAVE_ENOUGH_DATA && video.videoWidth && document.visibilityState === "visible") {
        const a = rahmenAusschnitt({ breite: video.videoWidth, hoehe: video.videoHeight }, video.getBoundingClientRect(), rahmenRef.current?.getBoundingClientRect());
        const faktor = Math.min(1, LESE_BREITE / a.breite);
        leinwand.width = Math.max(1, Math.round(a.breite * faktor));
        leinwand.height = Math.max(1, Math.round(a.hoehe * faktor));
        ctx.drawImage(video, a.x, a.y, a.breite, a.hoehe, 0, 0, leinwand.width, leinwand.height);
        try {
          const text = await leser.lesen(leinwand);
          if (!aktiv) return;
          const kurz = text.replace(/\s+/g, " ").trim();
          setGelesen(kurz);
          const e = erkennungAuswerten(text, fahrzeugeRef.current.map((f) => f.schluessel));
          const kennung = e.treffer.join("|");
          // Wörtlich gelesen gilt sofort; eine unscharfe oder mehrdeutige Lesung erst, wenn die nächste dasselbe sagt.
          if (e.treffer.length > 0 && ((e.treffer.length === 1 && e.abstand === 0) || kennung === vorige)) treffer(e.treffer);
          vorige = kennung;
        } catch {
          /* ein misslungenes Bild ist kein Fehler, das nächste kommt */
        }
      }
      if (aktiv) uhr = setTimeout(() => void lesen(), LESE_PAUSE_MS);
    }

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setKamera({
          art: "fehler",
          fehler: {
            text:
              window.isSecureContext === false
                ? "Ohne gesicherte Verbindung (https) geben Browser die Kamera nicht frei."
                : "Dieser Browser gibt die Kamera für Webseiten nicht frei.",
          },
        });
        return;
      }
      try {
        stream = await kameraOeffnen(gemerkteKamera());
      } catch (err) {
        if (aktiv) setKamera({ art: "fehler", fehler: kameraRat(err) });
        return;
      }
      if (!aktiv) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play().catch(() => undefined);
      }
      try {
        // Erst jetzt geladen: rund 7 MB, die nur braucht, wer am Tor die Kamera nutzt.
        const { kennzeichenLeserLaden } = await import("./kennzeichen-leser");
        const l = await kennzeichenLeserLaden();
        if (!aktiv) {
          l.beenden();
          return;
        }
        leser = l;
      } catch {
        if (aktiv) {
          stream.getTracks().forEach((t) => t.stop());
          setKamera({ art: "ohne-erkennung" });
        }
        return;
      }
      setKamera({ art: "laeuft" });
      void lesen();
    })();

    return () => {
      aktiv = false;
      clearTimeout(uhr);
      stream?.getTracks().forEach((t) => t.stop());
      leser?.beenden();
    };
  }, [kameraAn, versuch]);

  const gewaehlt = wahl ? (fahrzeuge.find((f) => f.einheitSchluessel === wahl.einheitSchluessel && f.schluessel === wahl.schluessel) ?? null) : null;
  const liste = mehrere ? fahrzeuge.filter((f) => mehrere.includes(f.schluessel)) : torSuche(eingabe, fahrzeuge);
  const unterwegs = fahrzeuge.filter((f) => f.unterwegsSeit != null).length;

  function buchen(f: TorFahrzeug, raus: boolean) {
    setFehler("");
    try {
      const vorher = fahrzeugBewegen(einsatz.id, f.eintragId, f.schluessel, raus);
      if (!vorher) {
        setFehler("Dieses Fahrzeug steht nicht mehr in der Sammlung. Bitte neu suchen.");
        setWahl(null);
        onGeaendert();
        return;
      }
      gebucht.current = { schluessel: f.schluessel, bis: Date.now() + GEBUCHT_RUHE_MS };
      setQuittung({ text: `${fahrzeugName(f)} (${f.einheit}) ${raus ? "fährt raus" : "ist zurück"} · ${zeitKurz(vorher.vermerk.zeit)}`, vorher });
      setWahl(null);
      setMehrere(null);
      setEingabe("");
      onGeaendert();
    } catch (e) {
      setFehler(e instanceof SpeicherVollFehler ? e.message : "Die Bewegung ließ sich nicht speichern.");
    }
  }

  function zuruecknehmen() {
    if (!quittung) return;
    try {
      fahrzeugBewegungZurueck(quittung.vorher);
      gebucht.current = null;
      setQuittung(null);
      onGeaendert();
    } catch (e) {
      setFehler(e instanceof SpeicherVollFehler ? e.message : "Das Zurücknehmen ließ sich nicht speichern.");
    }
  }

  const mitBild = kameraAn && (kamera.art === "startet" || kamera.art === "laeuft");

  return (
    <dialog ref={dialogRef} className="tor" tabIndex={-1} aria-labelledby="tor-titel" data-zurueck="eigen">
      <header className="tor-kopf">
        <div>
          <h1 id="tor-titel">Tor: Fahrzeuge raus und rein</h1>
          <p className="tor-zahl" role="status">
            {fahrzeuge.length === 0
              ? "Keine Fahrzeuge in dieser Sammlung"
              : `${unterwegs} von ${fahrzeuge.length} ${fahrzeuge.length === 1 ? "Fahrzeug" : "Fahrzeugen"} unterwegs`}
          </p>
        </div>
        <button type="button" onClick={onSchliessen}>Schließen</button>
      </header>

      {mitBild && (
        <div className="tor-kamera">
          <video ref={videoRef} playsInline muted />
          <div className={`tor-rahmen${blitz ? " erkannt" : ""}`} ref={rahmenRef} aria-hidden="true" />
        </div>
      )}
      <div className="tor-kamera-zeile">
        <p role="status">
          {kamera.art === "startet" && "Kamera und Erkennung starten …"}
          {kamera.art === "laeuft" && (gelesen ? `Gelesen: ${gelesen}` : "Kennzeichen in den Rahmen halten")}
          {kamera.art === "aus" && "Kamera ist aus. Kennzeichen unten eintippen."}
          {kamera.art === "ohne-erkennung" && "Die Kennzeichen-Erkennung läuft auf diesem Gerät nicht. Kennzeichen unten eintippen."}
          {kamera.art === "fehler" && `${kamera.fehler.text} Kennzeichen unten eintippen.`}
        </p>
        {kamera.art === "fehler" || kamera.art === "ohne-erkennung" ? (
          kamera.art === "fehler" && <button type="button" onClick={() => setVersuch((n) => n + 1)}>Kamera erneut versuchen</button>
        ) : (
          <button type="button" onClick={() => setKameraAn((an) => !an)}>{kameraAn ? "Kamera aus" : "Kamera ein"}</button>
        )}
      </div>
      {kamera.art === "fehler" && kamera.fehler.schritte && (
        <ul className="tor-schritte">
          {kamera.fehler.schritte.map((s) => <li key={s}>{s}</li>)}
        </ul>
      )}

      {quittung && (
        <p className="tor-quittung" role="status">
          <span>✓ {quittung.text}</span>
          <button type="button" onClick={zuruecknehmen}>Rückgängig</button>
        </p>
      )}
      {fehler && <p className="fehler" role="alert">{fehler}</p>}

      {gewaehlt && (
        <section className="tor-treffer" aria-label="Gewähltes Fahrzeug">
          <p className="tor-kennzeichen">{gewaehlt.kennzeichen || fahrzeugName(gewaehlt)}</p>
          <p className="tor-fahrzeug">
            {[gewaehlt.typ, gewaehlt.einheit, gewaehlt.funkruf].filter(Boolean).join(" · ")}
          </p>
          <p className="tor-stand" data-unterwegs={gewaehlt.unterwegsSeit != null ? "ja" : "nein"}>Jetzt: {standText(gewaehlt)}</p>
          <div className="tor-knoepfe">
            <button type="button" className={gewaehlt.unterwegsSeit == null ? "primaer" : ""} onClick={() => buchen(gewaehlt, true)}>
              Fährt raus
            </button>
            <button type="button" className={gewaehlt.unterwegsSeit != null ? "primaer" : ""} onClick={() => buchen(gewaehlt, false)}>
              Kommt zurück
            </button>
          </div>
          <button type="button" className="link" onClick={() => setWahl(null)}>Anderes Fahrzeug</button>
        </section>
      )}

      {!gewaehlt && fahrzeuge.length > 0 && (
        <section className="tor-suche">
          {mehrere ? (
            <p className="tor-mehrere" role="status">
              Die Kamera ist nicht sicher. Welches Fahrzeug ist es?{" "}
              <button type="button" className="link" onClick={() => setMehrere(null)}>Alle zeigen</button>
            </p>
          ) : (
            <label className="tor-eingabe">
              <span>Kennzeichen, Einheit oder Funkrufname</span>
              <input
                ref={eingabeRef}
                type="search"
                placeholder="letzte Zeichen genügen, z. B. 234"
                value={eingabe}
                onChange={(e) => setEingabe(e.target.value)}
                autoCapitalize="characters"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                enterKeyHint="search"
              />
            </label>
          )}
          {liste.length === 0 ? (
            <p className="hinweis" role="status">Kein Fahrzeug dieser Sammlung passt zu „{eingabe.trim()}“.</p>
          ) : (
            <ul className="tor-liste">
              {liste.slice(0, LISTE_MAX).map((f) => (
                <li key={`${f.einheitSchluessel}|${f.schluessel}`}>
                  <button type="button" onClick={() => { setWahl({ einheitSchluessel: f.einheitSchluessel, schluessel: f.schluessel }); setMehrere(null); }}>
                    <span className="tor-liste-kennzeichen">{f.kennzeichen || "ohne Kennzeichen"}</span>
                    <span className="tor-liste-wer">{[f.typ, f.einheit].filter(Boolean).join(" · ")}</span>
                    <span className="tor-liste-stand" data-unterwegs={f.unterwegsSeit != null ? "ja" : "nein"}>{standText(f)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {liste.length > LISTE_MAX && <p className="hinweis">{liste.length - LISTE_MAX} weitere. Tippen grenzt die Liste ein.</p>}
        </section>
      )}
      {fahrzeuge.length === 0 && (
        <p className="hinweis">Am Tor stehen die Fahrzeuge der anwesenden Einheiten, sobald deren Bögen Fahrzeuge nennen.</p>
      )}
      <p className="hinweis tor-fuss">Die Stärke der Einheit bleibt unverändert. Jede Bewegung steht mit Uhrzeit im Verlauf der Einheit. Das Kamerabild bleibt auf diesem Gerät und wird nicht gespeichert.</p>
    </dialog>
  );
}
