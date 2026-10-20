/* Builds dist/pixiemap-standalone.html: one file with CSS, JS, data and images
   inlined, for sharing on a flash disk, a pitch laptop, or an offline demo.
   Usage: npm run build:standalone                                            */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = p => readFileSync(resolve(root, p), "utf8");
const b64  = p => readFileSync(resolve(root, p)).toString("base64");

let html = read("index.html");

// inline the stylesheet
html = html.replace('<link rel="stylesheet" href="assets/css/styles.css">',
  "<style>\n" + read("assets/css/styles.css") + "\n</style>");

// inline data + application scripts in their existing order
const scripts = [
  "data/makueni-wards.js", "data/seed-orchards.js",
  "assets/js/config.js", "assets/js/state.js", "assets/js/map.js", "assets/js/charts.js",
  "assets/js/ai.js", "assets/js/mapimage.js", "assets/js/reports.js", "assets/js/views-farmer.js",
  "assets/js/views-county.js", "assets/js/app.js"
];
for (const s of scripts) {
  html = html.replace(`<script src="${s}"></script>`, `<script>\n${read(s)}\n</script>`);
}

// inline the photographs
for (const img of ["assets/img/orchard-hero.jpg", "assets/img/bloom-hero.jpg"]) {
  html = html.split(img).join(`data:image/jpeg;base64,${b64(img)}`);
}
for (const png of ["assets/img/makueni-logo.png", "assets/img/icha.png",
                   "assets/img/kenya-red-cross.png", "assets/img/british-red-cross.png"]) {
  html = html.split(png).join(`data:image/png;base64,${b64(png)}`);
}

mkdirSync(resolve(root, "dist"), { recursive: true });
writeFileSync(resolve(root, "dist/pixiemap-standalone.html"), html);
console.log("dist/pixiemap-standalone.html —", (html.length / 1024).toFixed(0), "KB");
