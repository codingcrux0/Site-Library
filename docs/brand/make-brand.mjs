// Re-makes the images from the sources in this folder. Run from the project root:  node docs/brand/make-brand.mjs
// Makes:  public/og-image.png (link preview, 1200x630), public/apple-touch-icon.png (phone home screen, 180x180),
//         public/favicon.ico (browser tab: 16, 32 and 48 px).   public/favicon.svg is simply a copy of logo.svg.
// Uses Google Chrome (already installed) to draw them, so there is nothing to install. The path below is the Mac one.
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const brand = resolve("docs/brand");
const tmp = mkdtempSync(join(tmpdir(), "brand-"));

// Draw an HTML file to a PNG. transparent = keep the corners see-through (needed for the rounded favicon).
function shoot(htmlPath, out, width, height, transparent = false) {
  execFileSync(CHROME, [
    "--headless=new", "--disable-gpu", "--hide-scrollbars", `--user-data-dir=${join(tmp, "profile")}`,
    ...(transparent ? ["--default-background-color=00000000"] : []),
    `--window-size=${width},${height}`, `--screenshot=${out}`, pathToFileURL(htmlPath).href,
  ], { stdio: "ignore" });
}

// A tiny page that shows one SVG at exactly size x size, with nothing around it.
function pageFor(svgFile, size) {
  const svg = readFileSync(join(brand, svgFile), "utf8");
  const file = join(tmp, `${svgFile}-${size}.html`);
  writeFileSync(file, `<!doctype html><style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
  return file;
}

copyFileSync(join(brand, "logo.svg"), resolve("public/favicon.svg"));
shoot(join(brand, "og-card.html"), resolve("public/og-image.png"), 1200, 630);
shoot(pageFor("apple-icon.svg", 180), resolve("public/apple-touch-icon.png"), 180, 180);

// favicon.ico = a small header + PNG pictures (browsers have accepted PNG inside .ico for years).
const sizes = [16, 32, 48];
const pngs = sizes.map((size) => {
  const out = join(tmp, `fav-${size}.png`);
  shoot(pageFor("logo.svg", size), out, size, size, true);
  return readFileSync(out);
});
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(1, 2); // type 1 = icon
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
sizes.forEach((size, i) => {
  const at = 6 + 16 * i;
  header.writeUInt8(size, at); // width
  header.writeUInt8(size, at + 1); // height
  header.writeUInt16LE(1, at + 4); // colour planes
  header.writeUInt16LE(32, at + 6); // bits per pixel
  header.writeUInt32LE(pngs[i].length, at + 8);
  header.writeUInt32LE(offset, at + 12);
  offset += pngs[i].length;
});
writeFileSync(resolve("public/favicon.ico"), Buffer.concat([header, ...pngs]));
console.log("Made: public/og-image.png, apple-touch-icon.png, favicon.ico, favicon.svg");
