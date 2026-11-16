// Web sürümü: src/content altındaki soru bankasını ve konu anlatımlarını web/optik.html içine gömer.
// Kullanım: node web/build.js
const fs = require("fs");
const path = require("path");
const src = path.join(__dirname, "..", "src", "content");
const page = path.join(__dirname, "optik.html");
const files = ["bank1.ts", "bank2.ts", "lessons1.ts", "lessons2.ts", "lessons3.ts"];
// TypeScript modülünü düz betiğe çevirir: import satırlarını ve tip açıklamalarını atar
const toScript = (s) => s.replace(/^import .*\r?\n/gm, "").replace(/^export const (\w+)(?::[^=]+)? = /gm, "const $1=");
const content = files.map((f) => toScript(fs.readFileSync(path.join(src, f), "utf8"))).join("\n");
const html = fs.readFileSync(page, "utf8");
if (!/\/\*CONTENT-START\*\/[\s\S]*?\/\*CONTENT-END\*\//.test(html)) throw new Error("İçerik işaretleri bulunamadı");
fs.writeFileSync(page, html.replace(/\/\*CONTENT-START\*\/[\s\S]*?\/\*CONTENT-END\*\//, () => "/*CONTENT-START*/\n" + content + "\n/*CONTENT-END*/"));
console.log("İçerik gömüldü:", files.join(", "), "·", content.length, "karakter");
