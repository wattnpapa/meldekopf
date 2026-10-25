// Rendert die App-Icons aus den SVG-Mastern in public/.
// Herkunft: Erfassungsbogen `scripts/render-icons.mjs` (Commit f2b77f1), seit
// Phase 5 samt Android-Launcher-Icons. Neu: die Splash-Bilder der Android-App
// (dort steht noch das Capacitor-Standardlogo) aus dem App-Icon.
// Aufruf: npm run icons
import { Resvg } from "@resvg/resvg-js";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const wurzel = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// [Quelle, Kantenlänge px, Ziel]
// icon-square.svg: vollflächig, ohne vorgerundete Ecken — Master für
// iOS/Android (die Systeme maskieren selbst) und maskable-PWA-Icons.
// icon.svg: mit gerundeten Ecken — Favicon und PWA "any".
const auftraege = [
  ["public/icon-square.svg", 1024, "public/icons/icon-1024.png"],
  // Electron: electron-builder erzeugt daraus icns/ico für macOS/Windows/Linux.
  ["public/icon.svg", 1024, "build/icon.png"],
  ["public/icon-square.svg", 512, "public/icons/maskable-512.png"],
  ["public/icon-square.svg", 192, "public/icons/maskable-192.png"],
  ["public/icon-square.svg", 180, "public/apple-touch-icon.png"],
  ["public/icon.svg", 512, "public/icons/icon-512.png"],
  ["public/icon.svg", 192, "public/icons/icon-192.png"],
  ["public/icon.svg", 64, "public/icons/icon-64.png"],
  ["public/icon.svg", 32, "public/icons/icon-32.png"],
];

// Android-Launcher-Icons direkt in die Ressourcen-Ordner der Plattform.
// icon-foreground.svg: transparenter Adaptive-Icon-Foreground (Safe-Zone),
// der Hintergrund-Verlauf liegt als Drawable in res/drawable/.
// icon.svg/icon-round.svg: Legacy-Icons für ältere Launcher.
const androidRes = "android/app/src/main/res";
const androidDichten = [
  ["mdpi", 48, 108],
  ["hdpi", 72, 162],
  ["xhdpi", 96, 216],
  ["xxhdpi", 144, 324],
  ["xxxhdpi", 192, 432],
];
for (const [dichte, launcherPx, foregroundPx] of androidDichten) {
  auftraege.push(
    ["public/icon.svg", launcherPx, `${androidRes}/mipmap-${dichte}/ic_launcher.png`],
    ["public/icon-round.svg", launcherPx, `${androidRes}/mipmap-${dichte}/ic_launcher_round.png`],
    ["public/icon-foreground.svg", foregroundPx, `${androidRes}/mipmap-${dichte}/ic_launcher_foreground.png`],
  );
}

for (const [quelle, groesse, ziel] of auftraege) {
  const svg = readFileSync(resolve(wurzel, quelle));
  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: groesse },
  }).render().asPng();
  const zielPfad = resolve(wurzel, ziel);
  mkdirSync(dirname(zielPfad), { recursive: true });
  writeFileSync(zielPfad, png);
  console.log(`${ziel} (${groesse}×${groesse}, ${(png.length / 1024).toFixed(1)} KiB)`);
}

// Splash der Android-App: das Icon mittig auf weißem Grund, ein Fünftel der
// kürzeren Kante groß. Maße wie die Capacitor-Vorlage (hoch und quer je Dichte).
const splashMasse = [
  ["drawable", 480, 320],
  ["drawable-land-mdpi", 480, 320],
  ["drawable-land-hdpi", 800, 480],
  ["drawable-land-xhdpi", 1280, 720],
  ["drawable-land-xxhdpi", 1600, 960],
  ["drawable-land-xxxhdpi", 1920, 1280],
  ["drawable-port-mdpi", 320, 480],
  ["drawable-port-hdpi", 480, 800],
  ["drawable-port-xhdpi", 720, 1280],
  ["drawable-port-xxhdpi", 960, 1600],
  ["drawable-port-xxxhdpi", 1280, 1920],
];
const icon = readFileSync(resolve(wurzel, "public/icon.svg"), "utf8");
const iconInhalt = icon.slice(icon.indexOf(">", icon.indexOf("<svg")) + 1, icon.lastIndexOf("</svg>"));
for (const [ordner, breite, hoehe] of splashMasse) {
  const kante = Math.round(Math.min(breite, hoehe) / 5);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${breite}" height="${hoehe}" viewBox="0 0 ${breite} ${hoehe}">` +
    `<rect width="${breite}" height="${hoehe}" fill="#ffffff"/>` +
    `<svg x="${(breite - kante) / 2}" y="${(hoehe - kante) / 2}" width="${kante}" height="${kante}" viewBox="0 0 512 512">${iconInhalt}</svg>` +
    `</svg>`;
  const png = new Resvg(svg).render().asPng();
  const ziel = `${androidRes}/${ordner}/splash.png`;
  writeFileSync(resolve(wurzel, ziel), png);
  console.log(`${ziel} (${breite}×${hoehe}, ${(png.length / 1024).toFixed(1)} KiB)`);
}
