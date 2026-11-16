// Haftalık defter: son 7 günün konuları, hataları, hata tekrar testi, kelimeleri ve cep kartı → PDF
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { LESSONS } from "../content";
import { CURRICULUM, FAMILIES, LETTERS, TRICKS } from "../data/catalog";
import type { Lesson } from "../types";
import { addDays, dayOf, diffDays, fmtDate, fmtShort, today } from "./dates";
import { lightLabel } from "./engine";
import { S } from "./store";

const e = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
const inl = (s: string) => s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`(.+?)`/g, "<code>$1</code>");
function md(src?: string) {
  let out = "";
  let ul = false;
  for (const L of e(src || "").split(/\n/)) {
    const l = L.trim();
    if (/^[-•*] /.test(l)) {
      if (!ul) {
        out += "<ul>";
        ul = true;
      }
      out += "<li>" + inl(l.slice(2)) + "</li>";
      continue;
    }
    if (ul) {
      out += "</ul>";
      ul = false;
    }
    if (l) out += "<p>" + inl(l) + "</p>";
  }
  return ul ? out + "</ul>" : out;
}

export const weekTopics = () => {
  const ws = addDays(today(), -6);
  const ids = new Set(S.sessions.filter((s) => s.date >= ws && s.topic).map((s) => s.topic as string));
  return CURRICULUM.filter((c) => ids.has(c.id) && LESSONS[c.id]);
};

export function defterHTML(): string {
  const ws = addDays(today(), -6);
  const topics = weekTopics();
  const ms = S.mistakes.filter((m) => dayOf(m.t) >= ws);
  const vs = S.vocab.filter((v) => v.day >= ws);
  const L = LETTERS;
  const css = `body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:760px;margin:24px auto;padding:0 16px;color:#1C2333;line-height:1.55}h1,h2,h3{font-family:Georgia,serif}h2{border-bottom:2px solid #C8325A;padding-bottom:4px;margin-top:36px;page-break-before:always}h2.first{page-break-before:auto}.box{border-radius:8px;padding:8px 12px;margin:8px 0}.kural{background:#E6EBFB}.tuzak{background:#FBE3E0}.puf{background:#FDF5D3}.hatirla{background:#DFF3E8}table{border-collapse:collapse;width:100%;margin:8px 0}td,th{border:1px solid #ccc;padding:5px 7px;font-size:13px;text-align:left;vertical-align:top}.q{margin:10px 0;padding:8px 0;border-bottom:1px dashed #ccc}.key{font-size:12px;color:#555}`;
  const lesson = (title: string, d: Lesson) =>
    `<h3>${e(title)}</h3>${d.mantik ? `<div class="box kural"><b>Adım kutusu</b>${md(d.mantik)}</div>` : ""}${(d.parts || [])
      .map(
        (p, i) =>
          `<h4>${i + 1}. ${e(p.baslik)}</h4>${md(p.anlatim)}${p.tablo && p.tablo.cols ? `<table><tr>${p.tablo.cols.map((c) => `<th>${e(c)}</th>`).join("")}</tr>${(p.tablo.rows || []).map((r) => `<tr>${r.map((c) => `<td>${e(c)}</td>`).join("")}</tr>`).join("")}</table>` : ""}${(p.kutular || []).map((b) => `<div class="box ${e(b.tur)}">${md(b.metin)}</div>`).join("")}${(p.ornekler || []).map((x) => `<div class="q"><b>Örnek:</b> ${e(x.q)}<br>${(x.o || []).map((o, k) => `${L[k]}) ${e(o)}`).join(" · ")}<br><b>Cevap ${L[+x.a]}:</b> ${e(x.neden)}</div>`).join("")}`,
      )
      .join("")}${(d.tuzaklar || []).length ? `<div class="box tuzak"><b>Tuzaklar</b><ul>${d.tuzaklar!.map((t) => `<li>${e(t)}</li>`).join("")}</ul></div>` : ""}${(d.hatirlanacaklar || []).length ? `<div class="box hatirla"><b>Hatırlanacaklar</b><ol>${d.hatirlanacaklar!.map((t) => `<li>${e(t)}</li>`).join("")}</ol></div>` : ""}`;
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>YDS Çalışma Defteri ${fmtShort(ws)} – ${fmtShort(today())}</title><style>${css}</style></head><body>
<h1>YDS Çalışma Defteri</h1><p>${fmtDate(ws)} – ${fmtDate(today())} · sınava ${diffDays(today(), S.profile.examDate)} gün · ${topics.length} konu · ${ms.length} hata · ${vs.length} kelime</p>
<h2 class="first">İlerleme</h2><table><tr><th>Tarih</th><th>Tür</th><th>İlk deneme</th><th>Sonunda</th><th>sn/soru</th></tr>${S.sessions.filter((s) => s.date >= ws).map((s) => `<tr><td>${s.date}</td><td>${e(s.kind)}</td><td>${s.c}/${s.n}</td><td>${s.cf ?? "-"}/${s.n}</td><td>${s.spq ?? "-"}</td></tr>`).join("")}</table>
<table><tr><th>Hata ailesi</th><th>Durum</th><th>Yanlış</th><th>Kontrol</th></tr>${Object.entries(S.fams).filter(([k]) => FAMILIES[k]).map(([k, f]) => `<tr><td>${e(FAMILIES[k].n)}</td><td>${lightLabel(f.light)}</td><td>${f.wrong}</td><td>${e(FAMILIES[k].tool)}</td></tr>`).join("")}</table>
<h2>Konu anlatımları</h2>${topics.map((t) => lesson(t.t, LESSONS[t.id])).join("") || "<p>Bu hafta konu çalışılmadı.</p>"}
<h2>Senin hataların</h2>${ms.map((m, i) => `<div class="q"><b>${i + 1}.</b> [${e(FAMILIES[m.fam]?.n)}] ${m.p ? `<i>${e(m.p.slice(0, 300))}…</i><br>` : ""}${e(m.q)}<br>${m.o.map((o, k) => `${L[k]}) ${e(o)}`).join(" · ")}<br>Senin cevabın: ${m.ua != null ? L[m.ua] : "boş"} ❌ · Doğrusu: ${L[m.a]} ✅<br>Neden: ${e(m.x)}${m.tip ? `<br>💡 ${e(m.tip)}` : ""}${m.diag ? `<br>Teşhisin: ${e(m.diag)}` : ""}</div>`).join("") || "<p>Bu hafta hata yok.</p>"}
<h2>Hata tekrar testi</h2><p>Bu hafta kaçırdığın soruların aynısı; cevaplar en sondaki anahtarda.</p>${ms.map((m, i) => `<div class="q"><b>${i + 1}.</b> ${e(m.q)}<br>${m.o.map((o, k) => `${L[k]}) ${e(o)}`).join(" · ")}</div>`).join("")}
<h2>Kelimeler</h2><table><tr><th>Kelime</th><th>Anlam</th><th>Örnek</th></tr>${vs.map((v) => `<tr><td>${v.prep ? "🔹 " : ""}${e(v.w)}</td><td>${e(v.m)}</td><td>${e(v.ex)}</td></tr>`).join("")}</table>
<h2>Cep kartı</h2><table>${TRICKS.map(([a, b]) => `<tr><td><b>${e(a)}</b></td><td>${e(b)}</td></tr>`).join("")}</table>
<h2>Cevap anahtarı</h2><p class="key">${ms.map((m, i) => `${i + 1}-${L[m.a]}`).join(" · ") || "-"}</p>
</body></html>`;
}

/** PDF oluşturur ve paylaşım menüsünü açar */
export async function shareDefter(): Promise<boolean> {
  const { uri } = await Print.printToFileAsync({ html: defterHTML() });
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "YDS haftalık defter", UTI: "com.adobe.pdf" });
  return true;
}
