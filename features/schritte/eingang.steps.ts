/**
 * Schritte der Eingänge: Bogen-Link öffnen, QR-Code als Bild einlesen.
 *
 * Herkunft: Erfassungsbogen `features/schritte/bogen.steps.ts` (Commit
 * 441811c), „ich öffne einen geteilten Bogen-Link …" und „ich den gemerkten
 * QR-Code … einlese". Anders hier: Der Meldekopf zeigt keinen eigenen Bogen
 * mit QR-Code an, den sich der Schritt merken könnte. Das Bild entsteht
 * deshalb im Prüfstand mit derselben Bibliothek (qrcode), die im
 * Erfassungsbogen den Code auf das Display bringt.
 */
import { When, Given } from "@cucumber/cucumber";
import QRCode from "qrcode";
import { EEB_URL_PREFIX } from "../../vendor/eeb-format/src/codec";
import { V2_FRAGMENT } from "../fixtures";
import type { EebWelt } from "../support/welt";
import { dateiKnopf } from "./sammlung.steps";

Given("ich öffne einen geteilten Bogen-Link eines alten Bogens", async function (this: EebWelt) {
  await this.oeffneApp(V2_FRAGMENT);
});

When("ich den QR-Code des alten Bogens über {string} einlese", async function (this: EebWelt, beschriftung: string) {
  const bild = await QRCode.toBuffer(EEB_URL_PREFIX + V2_FRAGMENT, { errorCorrectionLevel: "M", margin: 4, scale: 6 });
  await dateiKnopf(this, beschriftung).setInputFiles({ name: "qr-code.png", mimeType: "image/png", buffer: bild });
});
