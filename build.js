// Baut dist/ aus src/. Aufruf: node build.js
const fs = require("fs");
const path = require("path");
const here = __dirname;
const src = (f) => fs.readFileSync(path.join(here, "src", f), "utf8");
const has = (f) => fs.existsSync(path.join(here, "src", f));
const out = path.join(here, "dist");
fs.mkdirSync(out, { recursive: true });

const seo = JSON.parse(src("seo.json"));
const css = ["tokens.css", "base.css", "motion.css", "responsive.css"].filter(has).map(src).join("\n\n");
// Messhaken: mit #mess in der Adresse laeuft rAF ueber setTimeout und stoppt die CPU-Zeit je Bild (window.__mess.cost).
// Funktioniert auch in verdeckten Tabs, wo Chrome keine echten rAF-Frames liefert.
// Im Messmodus gilt der Tab als sichtbar, sonst zeichnen die Schleifen (zu Recht) nichts.
const messHaken = `if(location.hash==="#mess"){(function(){var c=[];window.__mess={cost:c};try{Object.defineProperty(document,"hidden",{get:function(){return false;}});Object.defineProperty(document,"visibilityState",{get:function(){return "visible";}});}catch(e){}window.requestAnimationFrame=function(cb){return setTimeout(function(){var a=performance.now();cb(a);c.push(performance.now()-a);},0);};})();}`;
const js = [messHaken].concat(["particles.js", "motion.js"].filter(has).map(src)).join("\n\n");
const sections = ["10-nav.html", "20-hero.html", "30-leistungen.html", "40-ablauf.html", "50-pakete.html", "60-person.html", "70-faq.html", "80-kontakt.html", "90-footer.html"].filter(has).map(src).join("\n\n");

function page(title, desc, body, canonicalPath, extraHead) {
  const head = src("00-head.html")
    .replace(/\{\{TITLE\}\}/g, title)
    .replace(/\{\{DESC\}\}/g, desc)
    .replace(/\{\{CANONICAL\}\}/g, seo.baseUrl + canonicalPath);
  return `<!doctype html>
<html lang="de-CH">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${head}
${extraHead || ""}
<style>
${css}
</style>
</head>
<body>
${body}
<script>
${js}
</script>
</body>
</html>
`;
}

const ld = `<script type="application/ld+json">${JSON.stringify(seo.jsonLd)}</script>`;
const write = (f, s) => { const p = path.join(out, f); fs.writeFileSync(p + ".tmp", s, "utf8"); fs.renameSync(p + ".tmp", p); };

write("index.html", page(seo.title, seo.description, sections, "/", ld));
for (const sub of ["impressum", "datenschutz"]) {
  if (!has(sub + ".html")) continue;
  const body = (has("10-nav.html") ? src("10-nav.html") : "") + "\n" + src(sub + ".html") + "\n" + (has("90-footer.html") ? src("90-footer.html") : "");
  const t = sub === "impressum" ? "Impressum" : "Datenschutz";
  write(sub + ".html", page(t + " – " + seo.siteName, t + " von " + seo.siteName + ".", body, "/" + sub + ".html", '<meta name="robots" content="noindex,follow">'));
}
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${["/", "/impressum.html", "/datenschutz.html"].map(u => `  <url><loc>${seo.baseUrl}${u}</loc><lastmod>${seo.lastmod}</lastmod></url>`).join("\n")}
</urlset>
`);
write("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${seo.baseUrl}/sitemap.xml\n`);
// Statische Dateien (Bilder fuer og:image usw.) aus src/assets nach dist/assets kopieren
const assetsSrc = path.join(here, "src", "assets");
if (fs.existsSync(assetsSrc)) {
  const assetsOut = path.join(out, "assets");
  fs.mkdirSync(assetsOut, { recursive: true });
  for (const f of fs.readdirSync(assetsSrc)) fs.copyFileSync(path.join(assetsSrc, f), path.join(assetsOut, f));
}
// Dateien, die unveraendert ins Wurzelverzeichnis gehoeren (z. B. Google-Bestaetigungsdatei) aus src/root
const rootSrc = path.join(here, "src", "root");
if (fs.existsSync(rootSrc)) {
  for (const f of fs.readdirSync(rootSrc)) fs.copyFileSync(path.join(rootSrc, f), path.join(out, f));
}
console.log("gebaut:", fs.readdirSync(out).join(", "));
