import {execFileSync} from 'node:child_process';
import {mkdirSync, mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';

/*
 * Draws the Arcoin home-screen icons and writes them into apps/web/public.
 *
 * Run it with `node apps/web/scripts/make-icons.mjs` whenever the mark changes. The mark is drawn here as
 * SVG rather than kept as a binary somewhere, so the navy, the lime and the geometry stay the single set of
 * numbers the rest of the app uses — and so the next person can change the icon without a design tool.
 *
 * The A is drawn as three mitred strokes instead of set in Montserrat: the icon has to regenerate on any
 * machine, and a webfont the studio does not have installed locally would silently fall back to Helvetica.
 * The proportions below are Montserrat ExtraBold's — a geometric apex, a crossbar a third of the way up.
 */

const PUBLIC_DIR = path.join(import.meta.dirname, '..', 'public');
const ICONS_DIR = path.join(PUBLIC_DIR, 'icons');

// docs/STITCH-PROMPTS.md Part 1, and the same values as globals.css.
const NAVY_800 = '#0B2545';
const NAVY_900 = '#081C33';
const NAVY_DEEP = '#050F1E';
const LIME_500 = '#A3E635';
const PAPER = '#FFFFFF';

const A_STROKE = 17;
const BAR_STROKE = 14;

/*
 * What the mark actually covers, once the strokes are drawn: the A from x 0 to 74 and the lime square out
 * to 101, as the top bar sets it — a square and a wordmark. At 192px the wordmark itself would be six
 * pixels tall, so the icon carries the A alone and the square becomes its full stop.
 *
 * `top` is above the apex's own y of 10 because a mitred join runs the point past the vertex by
 * half the stroke over sin(half the angle between the legs) — 25 units here. Measure the box from the ink,
 * not from the path, or the A sits against the top edge and Android's circular mask shaves it.
 */
const BOX = {left: 0, top: -16, width: 102, height: 117};

/**
 * One icon as SVG. `inset` is the share of the canvas left empty around the mark: Android masks a maskable
 * icon to any shape it likes and only guarantees the middle 80%, so that variant draws the mark smaller on
 * the same full-bleed navy.
 */
function iconSvg(size, inset) {
  const scale = (size * (1 - inset * 2)) / Math.max(BOX.width, BOX.height);
  const x = (size - BOX.width * scale) / 2 - BOX.left * scale;
  const y = (size - BOX.height * scale) / 2 - BOX.top * scale;
  // The blueprint's two grids, at the icon's scale: a fine one in pale blue-grey, a coarse one in lime.
  const fine = grid(size, size / 16, '#C9D6E5', 0.05, 1);
  const coarse = grid(size, size / 4, LIME_500, 0.07, 1.5);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <radialGradient id="ground" cx="0.72" cy="0.28" r="0.85">
      <stop offset="0" stop-color="${NAVY_800}"/>
      <stop offset="0.55" stop-color="${NAVY_900}"/>
      <stop offset="1" stop-color="${NAVY_DEEP}"/>
    </radialGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#ground)"/>
${fine}
${coarse}
  <g transform="translate(${round(x)} ${round(y)}) scale(${round(scale, 4)})">
    <path d="M8 92 L37 10 L66 92" fill="none" stroke="${PAPER}" stroke-width="${A_STROKE}" stroke-linejoin="miter" stroke-miterlimit="6"/>
    <path d="M19 67 H55" fill="none" stroke="${PAPER}" stroke-width="${BAR_STROKE}"/>
    <rect x="79" y="70" width="22" height="22" rx="4" fill="${LIME_500}"/>
  </g>
</svg>
`;
}

/** The blueprint's grid: plain lines, because a pattern fill renders differently in each converter. */
function grid(size, step, colour, opacity, width) {
  const lines = [];
  for (let at = step; at < size; at += step) {
    lines.push(`<path d="M${round(at)} 0 V${size}"/>`, `<path d="M0 ${round(at)} H${size}"/>`);
  }
  return `  <g stroke="${colour}" stroke-opacity="${opacity}" stroke-width="${width}" fill="none">${lines.join('')}</g>`;
}

function round(value, places = 2) {
  return Number(value.toFixed(places));
}

/**
 * Rasterises with whatever the machine has. librsvg first (it is what Homebrew installs with
 * `brew install librsvg`), then sharp, then ImageMagick.
 */
function rasterise(svgPath, pngPath, size) {
  for (const [command, args] of [
    ['rsvg-convert', ['-w', String(size), '-h', String(size), '-o', pngPath, svgPath]],
    ['magick', [`${svgPath}`, '-resize', `${size}x${size}`, pngPath]],
    ['convert', [`${svgPath}`, '-resize', `${size}x${size}`, pngPath]],
  ]) {
    try {
      execFileSync(command, args, {stdio: 'pipe'});
      return command;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  throw new Error(
    'No SVG rasteriser found. Install one of librsvg (`brew install librsvg`) or ImageMagick, then run this again.',
  );
}

const FILES = [
  // `purpose: any` — the icon as drawn, for Android's launcher and the Chrome install card.
  {name: 'icons/icon-192.png', size: 192, inset: 0.12},
  {name: 'icons/icon-512.png', size: 512, inset: 0.12},
  // `purpose: maskable` — Android crops this to a circle or a squircle, so the mark pulls further in.
  {name: 'icons/icon-maskable-512.png', size: 512, inset: 0.2},
  // iOS looks for /apple-touch-icon.png by convention when no <link rel="apple-touch-icon"> says otherwise,
  // and applies its own rounded mask — so this one is full bleed too, at the size iOS asks for.
  {name: 'apple-touch-icon.png', size: 180, inset: 0.12},
];

mkdirSync(ICONS_DIR, {recursive: true});
const work = mkdtempSync(path.join(tmpdir(), 'arcoin-icons-'));

for (const {name, size, inset} of FILES) {
  const svgPath = path.join(work, `${path.basename(name, '.png')}.svg`);
  const pngPath = path.join(PUBLIC_DIR, name);
  writeFileSync(svgPath, iconSvg(size, inset));
  const by = rasterise(svgPath, pngPath, size);
  console.log(`${name}  ${size}x${size}  (${by})`);
}
