// Soru bankasını ve konu anlatımlarını optik.html içine gömer. Kullanım: node content/build.js
const fs = require("fs");
const path = require("path");
const dir = __dirname;
const page = path.join(dir, "..", "optik.html");
const files = ["bank1.js", "bank2.js", "lessons1.js", "lessons2.js", "lessons3.js"];
const content = files.map(f => fs.readFileSync(path.join(dir, f), "utf8")).join("\n");
const html = fs.readFileSync(page, "utf8");
if (!/\/\*CONTENT-START\*\/[\s\S]*?\/\*CONTENT-END\*\//.test(html)) throw new Error("İçerik işaretleri bulunamadı");
fs.writeFileSync(page, html.replace(/\/\*CONTENT-START\*\/[\s\S]*?\/\*CONTENT-END\*\//, () => "/*CONTENT-START*/\n" + content + "\n/*CONTENT-END*/"));
console.log("İçerik gömüldü:", files.join(", "), "·", content.length, "karakter");
