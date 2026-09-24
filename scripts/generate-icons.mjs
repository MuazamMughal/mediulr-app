// One-off/regeneratable icon generator for Mediulr's "M" mark.
// Run with: node scripts/generate-icons.mjs
import { Resvg } from "@resvg/resvg-js";
import { writeFileSync, mkdirSync } from "fs";

const ORANGE = "#EA7A3D";
const WHITE = "#FFFFFF";

// A bold, geometric "M" drawn as a single rounded stroke — a zigzag, not a font,
// so rendering is identical regardless of what fonts are installed on the machine.
function mGlyphPath({ stroke = WHITE, strokeWidth = 15 } = {}) {
  return `<polyline points="22,76 22,26 50,58 78,26 78,76" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" />`;
}

function svg({ size = 100, background, glyphStroke = WHITE, strokeWidth = 15, includeGlyph = true }) {
  const bg = background ? `<rect width="100" height="100" fill="${background}" />` : "";
  const glyph = includeGlyph ? mGlyphPath({ stroke: glyphStroke, strokeWidth }) : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}">
    ${bg}
    ${glyph}
  </svg>`;
}

function render(svgString, outputSize, path) {
  const resvg = new Resvg(svgString, { fitTo: { mode: "width", value: outputSize } });
  const png = resvg.render().asPng();
  writeFileSync(path, png);
  console.log(`wrote ${path} (${outputSize}x${outputSize})`);
}

mkdirSync("assets", { recursive: true });

// Main app icon + splash image: full-bleed orange square, white M. iOS/Android mask the corners themselves.
render(svg({ size: 1024, background: ORANGE }), 1024, "assets/icon.png");
render(svg({ size: 1024, background: ORANGE }), 1024, "assets/splash-icon.png");

// Android adaptive icon: separate background/foreground layers so the OS can animate/mask them independently.
// Background is solid color ONLY — the M lives exclusively in the foreground layer.
render(svg({ size: 512, background: ORANGE, includeGlyph: false }), 512, "assets/android-icon-background.png");
// Foreground: M only, transparent bg, drawn smaller (safe zone) so it isn't clipped by the adaptive mask.
render(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="512" height="512">
    <polyline points="30,68 30,32 50,54 70,32 70,68" fill="none" stroke="${WHITE}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" />
  </svg>`,
  512,
  "assets/android-icon-foreground.png"
);
// Monochrome: same mark, transparent bg — Android tints this to a single color itself (themed icons).
render(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="432" height="432">
    <polyline points="30,68 30,32 50,54 70,32 70,68" fill="none" stroke="${WHITE}" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" />
  </svg>`,
  432,
  "assets/android-icon-monochrome.png"
);

// Favicon: small, so a slightly thicker stroke reads better at tiny sizes.
render(svg({ size: 48, background: ORANGE, strokeWidth: 17 }), 48, "assets/favicon.png");
