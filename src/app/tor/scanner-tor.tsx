/**
 * Herkunft: neu in der Meldekopf-App.
 *
 * Kennzeichen im Scanner: Dieselbe Kamera, die die QR-Codes der Bögen liest (eingang/qr-scanner-web.tsx), liest auch
 * die Kennzeichen der Fahrzeuge dieser Sammlung. Ein Knopf, eine Ansicht: Hält der Helfer einen Bogen davor, wird er
 * aufgenommen; hält er ein Kennzeichen davor, erscheint das Fahrzeug mit „Fährt raus" und „Kommt zurück".
 *
 * Der Scanner gibt Videobild und Suchrahmen herein (`zusatz`), dieses Modul liest daraus in eigenem Takt
 * (kennzeichen-leser.ts) und gleicht nur gegen die Kennzeichen der Sammlung ab (kennzeichen-abgleich.ts). Gebucht wird
 * nie von selbst. Hat die Sammlung kein Fahrzeug mit Kennzeichen, lädt die Texterkennung gar nicht erst.
 */
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { suchAusschnitt } from "../eingang/kamera";
import { einsaetzeLaden } from "../einsaetze-lesen";
import { torFahrzeuge } from "./fahrzeug-stand";
import { erkennungAuswerten } from "./kennzeichen-abgleich";
import type { KennzeichenLeser } from "./kennzeichen-leser";
import { TorQuittung, TorTreffer, standText, useTorBuchung } from "./tor-treffer";
import "./tor.css";

/** Längste Kante des Bilds, das an die Texterkennung geht. */
const LESE_KANTE = 720;
/** Pause zwischen zwei Lesungen: Die Erkennung soll das Telefon nicht dauerhaft auslasten und dem QR-Decoder Luft lassen. */
const LESE_PAUSE_MS = 150;
/** So lange wird ein eben gebuchtes Kennzeichen, das noch im Bild steht, nicht wieder vorgeschlagen. */
const GEBUCHT_RUHE_MS = 8_000;

export default function ScannerTor({
  einsatzId,
  video,
  rahmen,
  kameraLaeuft,
  onGeaendert,
}: {
  einsatzId: string;
  video: RefObject<HTMLVideoElement | null>;
  rahmen: RefObject<HTMLDivElement | null>;
  kameraLaeuft: boolean;
  onGeaendert: () => void;
}) {
  const [stand, setStand] = useState(0);
  const fahrzeuge = useMemo(() => torFahrzeuge(einsaetzeLaden().find((s) => s.id === einsatzId) ?? { eintraege: [] }), [einsatzId, stand]);
  const fahrzeugeRef = useRef(fahrzeuge);
  fahrzeugeRef.current = fahrzeuge;
  const mitKennzeichen = fahrzeuge.some((f) => !f.schluessel.startsWith("#"));

  const [wahl, setWahl] = useState<{ einheitSchluessel: string; schluessel: string } | null>(null);
  const [mehrere, setMehrere] = useState<string[] | null>(null);
  const [gelesen, setGelesen] = useState("");
  const wahlRef = useRef(wahl);
  wahlRef.current = wahl;
  const gebucht = useRef<{ schluessel: string; bis: number } | null>(null);
  const buchung = useTorBuchung(einsatzId, (f) => {
    gebucht.current = f ? { schluessel: f.schluessel, bis: Date.now() + GEBUCHT_RUHE_MS } : null;
    setWahl(null);
    setMehrere(null);
    setStand((n) => n + 1);
    onGeaendert();
  });

  useEffect(() => {
    if (!kameraLaeuft || !mitKennzeichen) return;
    let aktiv = true;
    let leser: KennzeichenLeser | null = null;
    let uhr: ReturnType<typeof setTimeout> | undefined;
    /** Der vorige unsichere Treffer: Erst die zweite gleiche Lesung gilt. */
    let vorige = "";
    let leinwand: HTMLCanvasElement | null = null;
    let ctx: CanvasRenderingContext2D | null = null;

    function treffer(schluessel: string[]) {
      if (schluessel.length === 1 && gebucht.current && gebucht.current.schluessel === schluessel[0] && gebucht.current.bis > Date.now()) return;
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
        if (wahlRef.current) return;
        setMehrere(schluessel);
      }
      buchung.setFehler("");
      try {
        navigator.vibrate?.(60);
      } catch {
        /* Vibration ist Zugabe */
      }
    }

    async function lesen() {
      if (!aktiv) return;
      const v = video.current;
      if (v && leser && v.readyState >= v.HAVE_ENOUGH_DATA && v.videoWidth && document.visibilityState === "visible") {
        leinwand ??= document.createElement("canvas");
        ctx ??= leinwand.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          // Derselbe Ausschnitt wie für den QR-Code: der Suchrahmen mit etwas Zugabe.
          const a = suchAusschnitt({ breite: v.videoWidth, hoehe: v.videoHeight }, v.getBoundingClientRect(), rahmen.current?.getBoundingClientRect(), 1.15);
          const faktor = Math.min(1, LESE_KANTE / Math.max(a.breite, a.hoehe));
          leinwand.width = Math.max(1, Math.round(a.breite * faktor));
          leinwand.height = Math.max(1, Math.round(a.hoehe * faktor));
          ctx.drawImage(v, a.x, a.y, a.breite, a.hoehe, 0, 0, leinwand.width, leinwand.height);
          try {
            const text = await leser.lesen(leinwand);
            if (!aktiv) return;
            const e = erkennungAuswerten(text, fahrzeugeRef.current.map((f) => f.schluessel));
            const kennung = e.treffer.join("|");
            // Was die Kamera las, steht nur da, wenn es nach einem Kennzeichen aussieht: Der Rahmen zeigt meist einen QR-Code.
            const kurz = text.replace(/\s+/g, " ").trim();
            setGelesen(e.treffer.length > 0 ? kurz : "");
            // Wörtlich gelesen gilt sofort; eine unscharfe oder mehrdeutige Lesung erst, wenn die nächste dasselbe sagt.
            if (e.treffer.length > 0 && ((e.treffer.length === 1 && e.abstand === 0) || kennung === vorige)) treffer(e.treffer);
            vorige = kennung;
          } catch {
            /* ein misslungenes Bild ist kein Fehler, das nächste kommt */
          }
        }
      }
      if (aktiv) uhr = setTimeout(() => void lesen(), LESE_PAUSE_MS);
    }

    void (async () => {
      try {
        // Erst jetzt geladen: rund 7 MB, die nur braucht, wer Kennzeichen liest.
        const { kennzeichenLeserLaden } = await import("./kennzeichen-leser");
        const l = await kennzeichenLeserLaden();
        if (!aktiv) {
          l.beenden();
          return;
        }
        leser = l;
        void lesen();
      } catch {
        /* Dieses Gerät führt die Texterkennung nicht aus: Der Scanner liest weiter QR-Codes, Kennzeichen lassen sich tippen. */
      }
    })();

    return () => {
      aktiv = false;
      clearTimeout(uhr);
      leser?.beenden();
      setGelesen("");
    };
    // `buchung` wechselt mit jedem Zeichnen; der Effekt braucht nur seine stabile Fehler-Rücksetzung.
  }, [kameraLaeuft, mitKennzeichen, video, rahmen]);

  const gewaehlt = wahl ? (fahrzeuge.find((f) => f.einheitSchluessel === wahl.einheitSchluessel && f.schluessel === wahl.schluessel) ?? null) : null;
  const zurWahl = mehrere && !gewaehlt ? fahrzeuge.filter((f) => mehrere.includes(f.schluessel)) : [];
  if (!gewaehlt && zurWahl.length === 0 && !buchung.quittung && !buchung.fehler && !gelesen) return null;

  return (
    <div className="scanner-tor">
      {gelesen && !gewaehlt && zurWahl.length === 0 && <p className="scanner-tor-gelesen" role="status">Kennzeichen gelesen: {gelesen}</p>}
      {buchung.quittung && !gewaehlt && <TorQuittung text={buchung.quittung.text} onRueckgaengig={buchung.zuruecknehmen} />}
      {buchung.fehler && <p className="fehler" role="alert">{buchung.fehler}</p>}
      {gewaehlt && <TorTreffer fahrzeug={gewaehlt} onBuchen={(raus) => buchung.buchen(gewaehlt, raus)} onWeg={() => setWahl(null)} wegText="Nicht dieses Fahrzeug" />}
      {zurWahl.length > 0 && (
        <section className="tor-treffer" aria-label="Fahrzeug wählen">
          <p className="tor-mehrere">Die Kamera ist nicht sicher. Welches Fahrzeug ist es?</p>
          <ul className="tor-liste">
            {zurWahl.map((f) => (
              <li key={`${f.einheitSchluessel}|${f.schluessel}`}>
                <button type="button" onClick={() => { setWahl({ einheitSchluessel: f.einheitSchluessel, schluessel: f.schluessel }); setMehrere(null); }}>
                  <span className="tor-liste-kennzeichen">{f.kennzeichen}</span>
                  <span className="tor-liste-stand" data-unterwegs={f.unterwegsSeit != null ? "ja" : "nein"}>{standText(f)}</span>
                  <span className="tor-liste-wer">{[f.typ, f.einheit].filter(Boolean).join(" · ")}</span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="link" onClick={() => setMehrere(null)}>Keines davon</button>
        </section>
      )}
    </div>
  );
}
