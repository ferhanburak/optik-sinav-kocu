// Çalışma defteri (PDF): birikimli. Kapak → içindekiler → nerede duruyorsun → konular → hata analizi →
// hata tekrar testi (her tuzak için YENİ soru) → kelimeler → cep kartı → açıklamalı cevap anahtarı
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { LESSONS } from "../content";
import { AREAS, CURRICULUM, FAMILIES, LETTERS } from "../data/catalog";
import { POCKET } from "../data/pocket";
import type { Lesson, Mistake, Question, SessionRec } from "../types";
import { addDays, dayOf, diffDays, fmtDate, fmtShort, pct, today } from "./dates";
import { fam, famEntries, lightLabel, mistakeRef, pickBank, prepBank } from "./engine";
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

const CSS = `
*{box-sizing:border-box}body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1C2333;line-height:1.5;font-size:13px;margin:0;padding:28px}
h1,h2,h3{font-family:Georgia,serif;margin:0}h3{font-size:16px;margin:18px 0 6px;border-bottom:1px solid #e4dfd3;padding-bottom:4px}h4{margin:14px 0 4px;font-size:14px}p{margin:4px 0}
.cover{background:linear-gradient(160deg,#22304f,#2f4a70 55%,#8a5560);color:#fff;border-radius:14px;padding:56px 44px;min-height:900px;page-break-after:always}
.cover .k{letter-spacing:.2em;font-size:11px;opacity:.85}.cover h1{font-size:46px;margin:14px 0 8px}.cover .stats{display:flex;gap:10px;margin:44px 0}
.cover .stat{flex:1;border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.1);border-radius:8px;padding:10px}.cover .stat b{display:block;font-family:Georgia,serif;font-size:24px}
.cover .stat span{font-size:10px;letter-spacing:.08em;text-transform:uppercase}.cover ul{columns:2;list-style:"✦ ";padding-left:16px}.cover .q{font-family:Georgia,serif;font-style:italic;font-size:18px;margin-top:70px}
.sec{background:linear-gradient(90deg,#e6eef8,#fff);border-radius:10px;padding:14px 18px;margin:0 0 12px;display:flex;gap:16px;align-items:center;page-break-before:always}
.sec .no{font-family:Georgia,serif;font-size:32px;font-weight:700;color:#e0623c}.sec h2{font-size:22px}.sec small{color:#5E6678}
.toc td{border:0;border-bottom:1px dashed #ddd;padding:4px 6px}.toc td:first-child{color:#e0623c;font-weight:700;width:28px}.toc td:last-child{text-align:right;color:#5E6678}
table{border-collapse:collapse;width:100%;margin:8px 0}td,th{border-bottom:1px solid #e6e2d9;padding:6px 8px;text-align:left;vertical-align:top}th{background:#1f2536;color:#fff;font-size:12px}tr:nth-child(even) td{background:#faf7f0}
.cards{display:flex;flex-wrap:wrap;gap:8px}.card{flex:1 1 150px;background:#f8f5ee;border:1px solid #e9e3d6;border-radius:8px;padding:8px 10px}.card .l{font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#5E6678}
.card b{display:block;font-family:Georgia,serif;font-size:22px}.card small{color:#5E6678}
.bar{position:relative;background:#eee7da;border-radius:6px;height:16px;min-width:70px}.bar i{position:absolute;left:0;top:0;bottom:0;border-radius:6px}.bar span{position:relative;font-size:10px;font-weight:700;padding-left:6px;line-height:16px}
.box{border-radius:8px;padding:10px 14px;margin:10px 0;border-left:4px solid}.box h5{margin:0 0 4px;font-size:13px}.box ul,.box ol{margin:4px 0;padding-left:18px}
.ok{background:#e6f3ea;border-color:#2e8b57}.ok h5{color:#2e8b57}.bad{background:#fbe7e4;border-color:#c0452f}.bad h5{color:#c0452f}.info{background:#e6eff7;border-color:#2f6690}.info h5{color:#2f6690}
.warn{background:#fdf3dc;border-color:#c9952a}.warn h5{color:#8a6410}.note{background:#ebe9f8;border-color:#6b5bb5}.note h5{color:#6b5bb5}
.ex{border:1px solid #e4dfd3;border-radius:8px;padding:10px;margin:8px 0;page-break-inside:avoid}.ex .l{font-size:10px;letter-spacing:.08em;color:#e0623c;font-weight:700;text-transform:uppercase}
.ans{background:#e6f3ea;border-radius:6px;padding:6px 10px;margin-top:6px}.x{font-size:12px}.x::before{content:"× ";color:#c0452f;font-weight:700}
.opt b{color:#2f6690;margin-right:6px}.opt{display:inline-block;margin-right:14px}
.err{display:flex;gap:12px;border-bottom:1px dashed #ddd;padding:6px 0;page-break-inside:avoid}.err .d{width:70px;font-weight:700;font-size:12px}.err .d small{display:block;color:#5E6678;font-weight:400}
.you{color:#c0452f}.right{color:#2e8b57;font-weight:700}.tag{background:#c0452f;color:#fff;border-radius:8px;font-size:10px;padding:1px 6px;font-weight:700}
.hq{border-bottom:1px solid #e6e2d9;padding:8px 0;page-break-inside:avoid}.hno{background:#1f2536;color:#fff;border-radius:5px;padding:1px 6px;font-weight:700;font-size:11px}.src{background:#f3efe6;border-radius:8px;font-size:10px;padding:2px 6px;color:#5E6678}
.keys{display:flex;flex-wrap:wrap;gap:4px}.keys span{background:#f8f5ee;border-radius:5px;padding:2px 8px;width:19%}.keys b{color:#2f6690}
.pocket{columns:2;column-gap:12px;font-size:11.5px}.pocket .box{break-inside:avoid;margin:0 0 10px}.pocket td,.pocket th{padding:3px 5px;font-size:11px}code{background:#f3efe6;border-radius:3px;padding:0 3px}
.pass{background:#f8f5ee;border-left:3px solid #d9c9a8;padding:6px 10px;font-size:12px;margin:4px 0}
`;

const lvl = (a: number) => (a >= 0.75 ? "#2e8b57" : a >= 0.55 ? "#c9952a" : "#c0452f");
const bar = (c: number, n: number) => (n ? `<div class="bar"><i style="width:${Math.max(8, pct(c, n))}%;background:${lvl(c / n)}"></i><span style="color:${c / n >= 0.55 ? "#fff" : "#1C2333"}">${c}/${n}</span></div>` : "—");
const box = (cls: string, title: string, body: string) => `<div class="box ${cls}"><h5>${title}</h5>${body}</div>`;
const list = (items: string[], ordered = false) => `<${ordered ? "ol" : "ul"}>${items.map((t) => `<li>${t}</li>`).join("")}</${ordered ? "ol" : "ul"}>`;
const opts = (o: string[]) => o.map((t, k) => `<span class="opt"><b>${LETTERS[k]}</b>${e(t)}</span>`).join("");

const KIND: Record<string, string> = { seviye: "Seviye testi", kisa: "Kısa set", telafi: "Telafi", tanima: "Tanıma", mock: "Deneme", oturum: "Oturum" };
const topicOf = (id?: string | null) => CURRICULUM.find((c) => c.id === id);
const sessionTitle = (s: SessionRec) => (s.kind === "oturum" || s.kind === "telafi" ? topicOf(s.topic)?.t || KIND[s.kind] : KIND[s.kind] || s.kind);

/** Defterin kapsadığı dönem: ilk oturumdan bugüne, 7 günlük haftalar */
export function defterSpan() {
  const first = S.sessions.map((s) => s.date).sort()[0] || today();
  const weekOf = (d: string) => Math.floor(Math.max(0, diffDays(first, d)) / 7) + 1;
  return { first, weekOf, weeks: weekOf(today()) };
}

/** Konusu çalışılmış (oturumu olan) ve yerleşik anlatımı bulunan konular */
export const studiedTopics = () => {
  const ids = new Set(S.sessions.filter((s) => s.topic).map((s) => s.topic as string));
  return CURRICULUM.filter((c) => ids.has(c.id) && LESSONS[c.id]);
};

/** Hata tekrar testi: her hata için aynı aileden, o kullanıcının yanlış yapmadığı YENİ bir soru */
export function retestQuestions(max = 40): { q: Question; from: Mistake }[] {
  const missed = new Set(S.mistakes.map((m) => m.q));
  const used = new Set<string>();
  const out: { q: Question; from: Mistake }[] = [];
  for (const m of S.mistakes.slice().reverse()) {
    if (out.length >= max) break;
    const b = pickBank((x) => x.fam === m.fam && !missed.has(x.q) && (m.fam === "okuma" || !x.g), 1, used)[0];
    if (b) out.push({ q: prepBank(b), from: m });
  }
  return out.reverse();
}

function progressSection(): string {
  const { first, weekOf, weeks } = defterSpan();
  const ss = S.sessions.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
  const wk = [...Array(weeks)].map((_, i) => i + 1);
  const cards = wk
    .map((w) => {
      const list0 = ss.filter((s) => weekOf(s.date) === w);
      if (!list0.length) return "";
      const from = addDays(first, (w - 1) * 7);
      return `<h3>Hafta ${w} · ${fmtShort(from)} – ${fmtShort(addDays(from, 6))}</h3><div class="cards">${list0
        .map((s) => `<div class="card"><div class="l">${fmtShort(s.date)} · ${e(sessionTitle(s))}</div><b>${s.c}/${s.n}</b><small>%${s.p}${s.pf != null && s.pf !== s.p ? ` · sonunda %${s.pf}` : ""}${s.spq ? ` · ${s.spq} sn/soru` : ""}</small></div>`)
        .join("")}</div>`;
    })
    .join("");
  const wAvg = wk.map((w) => {
    const l = ss.filter((s) => weekOf(s.date) === w);
    return l.length ? pct(l.reduce((a, s) => a + s.c, 0), l.reduce((a, s) => a + s.n, 0)) : null;
  });
  const trend = wAvg.filter((x) => x !== null).length > 1 ? `<p>Haftalık ilk deneme ortalaması: ${wAvg.map((x, i) => (x === null ? null : `hafta ${i + 1} <b>%${x}</b>`)).filter(Boolean).join(" → ")}. Resmî skor ilk denemedir.</p>` : "";

  // Alan alan gelişim: satır = alan, sütun = hafta
  const cell = (fams: string[], w: number) => {
    const a = S.attempts.filter((x) => fams.includes(x.fam) && weekOf(dayOf(x.t)) === w);
    return bar(a.filter((x) => x.ok).length, a.length);
  };
  const areas = `<h3>Alan alan gelişim</h3><table><tr><th>Alan</th>${wk.map((w) => `<th>Hafta ${w}</th>`).join("")}</tr>${AREAS.map((a) => `<tr><td><b>${e(a.l)}</b></td>${wk.map((w) => `<td>${cell(a.f, w)}</td>`).join("")}</tr>`).join("")}</table>`;

  // Konular: ilk oturum → son oturum
  const tp = studiedTopics().map((t) => {
    const l = ss.filter((s) => s.topic === t.id);
    return `<tr><td><b>${e(t.t)}</b></td><td>${bar(l[0].c, l[0].n)}</td><td>${l.length > 1 ? bar(l[l.length - 1].c, l[l.length - 1].n) : "—"}</td><td>${t.f.map((f) => lightLabel(fam(f).light)).join(" · ")}</td></tr>`;
  });
  const topics = tp.length ? `<h3>Konular · ilk oturum → son durum</h3><table><tr><th>Konu</th><th>İlk oturum</th><th>Son oturum</th><th>Durum</th></tr>${tp.join("")}</table>` : "";

  // Özet kutuları
  const fe = famEntries();
  const good: string[] = [];
  fe.filter(([, f]) => f.light === "green" && f.wrong > 0).forEach(([k, f]) => good.push(`<b>Eski tuzak kapandı:</b> ${e(FAMILIES[k].n)} (${f.wrong} yanlıştan sonra üst üste ${f.streak} doğru).`));
  const clean = fe.filter(([, f]) => f.light === "green" && !f.wrong).map(([k]) => FAMILIES[k].n);
  if (clean.length) good.push(`<b>Sorunsuz hata türleri:</b> ${e(clean.join(", "))}.`);
  const recent = ss.filter((s) => s.date >= addDays(today(), -6));
  const best = recent.slice().sort((a, b) => b.p - a.p)[0];
  if (best) good.push(`<b>Haftanın en iyi oturumu:</b> ${fmtShort(best.date)} · ${e(sessionTitle(best))} ${best.c}/${best.n} (%${best.p}).`);
  const open: string[] = [];
  fe.filter(([, f]) => f.light === "red").slice(0, 3).forEach(([k, f]) => open.push(`<b>${e(FAMILIES[k].n)}:</b> ${f.wrong} yanlış, hâlâ açık. Kontrol: ${e(FAMILIES[k].tool)}`));
  const wr = S.attempts.filter((a) => a.t > Date.now() - 7 * 864e5 && !a.ok);
  const sure = wr.filter((a) => !a.u).length;
  if (wr.length >= 3 && sure / wr.length >= 0.6) open.push(`<b>Kontrol:</b> son 7 günün ${wr.length} yanlışının ${sure} tanesi emin olarak yapıldı. Bilgi var, kontrol eksik: soru tipi → etiket → şık.`);
  const timed = S.attempts.filter((a) => a.t > Date.now() - 7 * 864e5 && a.s);
  const spq = timed.length ? Math.round(timed.reduce((x, a) => x + a.s, 0) / timed.length) : null;
  if (spq && spq < 75) open.push(`<b>Hız:</b> soru başına ortalama ${spq} sn (hedef ≥75 sn).`);
  const red = fe.find(([, f]) => f.light === "red");
  const goal = red ? `<b>${e(FAMILIES[red[0]].n)}:</b> ${e(FAMILIES[red[0]].tool)} Hata tekrar testinde bu türden yeni sorular var; önce onları çöz.` : spq && spq < 75 ? "Her soruda etiketi yazmadan şıklara geçme; soru başına en az 75 sn." : "Bir deneme çöz ve 10 saniyelik kontrolü tam denemede uygula.";
  return `${cards}${trend}${areas}${topics}
${good.length ? box("ok", "🌱 Oturanlar", list(good)) : ""}${open.length ? box("bad", "🎯 Hâlâ açık olanlar", list(open, true)) : ""}${box("ok", "💡 Bu haftanın tek hedefi", `<p>${goal}</p>`)}`;
}

function lessonSection(title: string, d: Lesson, fams: string[]): string {
  const att = S.attempts.filter((a) => fams.includes(a.fam));
  const mine = S.mistakes.filter((m) => fams.includes(m.fam));
  const intro = att.length ? `<p>Bu konunun hata türlerinden <b>${att.length}</b> soru çözdün; ilk denemede <b>%${pct(att.filter((a) => a.ok).length, att.length)}</b>. Durum: ${fams.map((f) => `${e(FAMILIES[f].n)} <b>${lightLabel(fam(f).light)}</b>`).join(" · ")}.</p>` : "";
  const parts = (d.parts || [])
    .map(
      (p, i) =>
        `<h3>${i + 1}. ${e(p.baslik)}</h3>${md(p.anlatim)}${p.tablo && p.tablo.cols ? `<table><tr>${p.tablo.cols.map((c) => `<th>${e(c)}</th>`).join("")}</tr>${(p.tablo.rows || []).map((r) => `<tr>${r.map((c) => `<td>${inl(e(c))}</td>`).join("")}</tr>`).join("")}</table>` : ""}${p.tatbikat ? `<h4>Hızlı tatbikat (cevaplar yanında)</h4><p>Her satırı önce sağdaki sütunları kapatıp kendin dene.</p><table><tr>${p.tatbikat.cols.map((c) => `<th>${e(c)}</th>`).join("")}</tr>${p.tatbikat.rows.map((r) => `<tr>${r.map((c) => `<td>${e(c)}</td>`).join("")}</tr>`).join("")}</table>` : ""}${(p.kutular || []).map((b) => box(b.tur === "tuzak" ? "warn" : "info", b.tur === "tuzak" ? "⚠️ Tuzak" : b.tur === "puf" ? "💡 Püf" : "📌 Kural", md(b.metin))).join("")}${(p.ornekler || [])
          .map((x, j) => `<div class="ex"><div class="l">Örnek ${j + 1}</div><p>${e(x.q)}</p><p>${opts(x.o || [])}</p><div class="ans"><b>✅ Cevap: ${LETTERS[+x.a]}) ${e((x.o || [])[+x.a])}</b><p>${inl(e(x.neden))}</p>${(x.celdiriciler || []).map((t, k) => (t && k !== +x.a ? `<div class="x"><b>${e((x.o || [])[k])}:</b> ${e(t)}</div>` : "")).join("")}</div></div>`)
          .join("")}`,
    )
    .join("");
  const errs = mine.length ? box("bad", `🎯 Senin bu kuraldaki hataların (${mine.length})`, list(mine.slice(-8).map((m) => `<b>${mistakeRef(m)}:</b> ${e(m.ua != null ? m.o[m.ua] : "boş")} → <b>${e(m.o[m.a])}</b>${m.diag ? ` <i>(${e(m.diag)})</i>` : ""}`))) : "";
  return `${intro}${d.mantik ? box("info", "📌 Adım kutusu", md(d.mantik)) : ""}${(d.kontrol || []).length ? box("info", "Kontrol listesi", list(d.kontrol!.map((t) => inl(e(t))), true)) : ""}${parts}${(d.tuzaklar || []).length ? box("warn", "⚠️ Sık tuzaklar", list(d.tuzaklar!.map((t) => inl(e(t))))) : ""}${errs}${(d.hatirlanacaklar || []).length ? box("note", "✍️ Hatırlanacaklar", list(d.hatirlanacaklar!.map((t) => inl(e(t))), true)) : ""}`;
}

function mistakesSection(): string {
  const ids = [...new Set(S.mistakes.map((m) => m.fam))].filter((k) => FAMILIES[k]).sort((a, b) => S.mistakes.filter((m) => m.fam === b).length - S.mistakes.filter((m) => m.fam === a).length);
  if (!ids.length) return "<p>Henüz hata yok.</p>";
  const closed = famEntries().filter(([, f]) => f.light === "green" && f.wrong > 0).map(([k, f]) => `${FAMILIES[k].n} (${f.wrong} kez kaçtı, şimdi üst üste ${f.streak} doğru)`);
  return (
    (closed.length ? box("ok", "🌱 Kapanan tuzaklar", `<p>${e(closed.join(" · "))}</p>`) : "") +
    ids
      .map((k, gi) => {
        const ms = S.mistakes.filter((m) => m.fam === k);
        return `<h3>${LETTERS[gi] || gi + 1} · ${e(FAMILIES[k].n)} (${ms.length})</h3>${ms
          .map((m, i) => `<div class="err"><div class="d">${fmtShort(dayOf(m.t))}<small>${e(m.ref || "")}${m.un ? " ★" : ""}</small></div><div>Sen: <span class="you">${e(m.ua != null ? m.o[m.ua] : "boş")}</span> → Doğrusu: <span class="right">${e(m.o[m.a])}</span> ${i ? '<span class="tag">tekrar</span>' : ""}<br>${inl(e(m.tip || m.x))}${m.diag ? `<br><i>Teşhisin: ${e(m.diag)}</i>` : ""}</div></div>`)
          .join("")}`;
      })
      .join("")
  );
}

function pocketSection(): string {
  return `<div class="pocket">${POCKET.map((b) => `<div class="box ${b.warn ? "warn" : "info"}"><h5>${b.warn ? "⚠️" : "📌"} ${e(b.t)}</h5>${b.items ? list(b.items.map((t) => inl(e(t))), !b.warn) : ""}${b.table ? `<table><tr>${b.table.cols.map((c) => `<th>${e(c)}</th>`).join("")}</tr>${b.table.rows.map((r) => `<tr>${r.map((c, i) => `<td>${i ? e(c) : "<b>" + e(c) + "</b>"}</td>`).join("")}</tr>`).join("")}</table>` : ""}${b.foot ? `<p>${inl(e(b.foot))}</p>` : ""}</div>`).join("")}</div>`;
}

export function defterHTML(): string {
  const { first, weeks } = defterSpan();
  const p = S.profile;
  const topics = studiedTopics();
  const retest = retestQuestions();
  const left = diffDays(today(), p.examDate);
  const exN = topics.reduce((a, t) => a + LESSONS[t.id].parts.reduce((b, x) => b + (x.ornekler || []).length, 0), 0);
  const days = [...new Set(S.vocab.map((v) => v.day))].sort();

  const secs: { t: string; d: string; h: string }[] = [
    { t: "Nerede duruyorsun?", d: `${S.sessions.length} oturumun skorları · hafta 1–${weeks}`, h: progressSection() },
    ...topics.map((t) => ({ t: t.t, d: t.f.map((f) => FAMILIES[f].n).join(" · "), h: lessonSection(t.t, LESSONS[t.id], t.f) })),
    { t: "Hata analizi", d: "türüne göre gruplanmış bütün hatalar", h: mistakesSection() },
    {
      t: "Hata tekrar testi",
      d: "her tuzak için yeni bir soru",
      h: retest.length
        ? `<p>Şimdiye kadar yanlış yaptığın her tuzak için <b>yeni</b> bir soru. Aynı hatayı tekrar yapıyor musun, burada görürsün. Cevaplar en sonda.</p>${retest.map(({ q, from }, i) => `<div class="hq"><span class="hno">H${i + 1}</span> <span class="src">${mistakeRef(from)} · ${e(FAMILIES[q.fam].n)}</span>${q.p ? `<div class="pass">${e(q.p)}</div>` : ""}<p>${e(q.q).replace(/\n/g, "<br>")}</p><p>${opts(q.o)}</p></div>`).join("")}`
        : "<p>Henüz tekrar edilecek hata yok.</p>",
    },
    {
      t: "Kelime listesi",
      d: days.length ? `${fmtShort(days[0])} – ${fmtShort(days[days.length - 1])}, güne göre` : "henüz kelime yok",
      h: days.map((d) => `<h3>${fmtDate(d)}${S.sessions.find((s) => s.date === d && s.topic) ? " · " + e(topicOf(S.sessions.find((s) => s.date === d && s.topic)!.topic)?.t) : ""}</h3><table><tr><th>Kelime / kalıp</th><th>Anlam</th><th>Örnek</th></tr>${S.vocab.filter((v) => v.day === d).map((v) => `<tr><td><b>${v.prep ? "◆ " : ""}${e(v.w)}</b></td><td>${e(v.m)}</td><td><i>${e(v.ex)}</i></td></tr>`).join("")}</table>`).join("") || "<p>Henüz kelime yok.</p>",
    },
    { t: "Cep kartı", d: "tek bakışta bütün kurallar", h: pocketSection() },
    {
      t: "Cevap anahtarı",
      d: "kısa açıklamalarla",
      h: retest.length ? `<h3>Hata tekrar testi</h3><div class="keys">${retest.map(({ q }, i) => `<span><b>H${i + 1}</b> ${LETTERS[q.a]}</span>`).join("")}</div>${retest.map(({ q }, i) => `<p><b>H${i + 1} → ${LETTERS[q.a]}) ${e(q.o[q.a])}:</b> ${inl(e(q.tip || q.x))}</p>`).join("")}` : "<p>—</p>",
    },
  ];

  const cover = `<div class="cover"><div class="k">YDS · KİŞİSEL ÇALIŞMA DEFTERİ</div><h1>YDS Çalışma Defteri</h1><p style="font-size:16px">Konu anlatımların, çözümlü örnekler, hata analizin ve hata tekrar testin. Adım adım, tekrar edilebilir.</p>
<div class="stats"><div class="stat"><span>Sınav</span><b>${p.examSet ? fmtShort(p.examDate) : "—"}</b></div><div class="stat"><span>Hedef</span><b>${p.target}+</b></div><div class="stat"><span>Sınava kalan</span><b>${p.examSet && left >= 0 ? left + " gün" : "—"}</b><span>${fmtShort(today())} itibarıyla</span></div></div>
<div class="k">BU DEFTERDE</div><ul><li>${topics.length} konu bölümü, ${exN} çözümlü örnek</li><li>${S.mistakes.length} hatanın türüne göre analizi</li><li>${retest.length} soruluk hata tekrar testi</li><li>${S.vocab.length} kelime ve kalıp</li><li>Cep kartı</li><li>Açıklamalı cevap anahtarı</li></ul>
<p class="q">“${famEntries().some(([, f]) => f.light === "red") ? "Aynı tuzağa ikinci kez düşmemek, yeni konu öğrenmekten hızlı puan getirir." : "Bilgi sende. Her boşlukta 10 saniyelik kontrol: soru tipi → etiket → şık."}”</p>
<p style="margin-top:60px;font-size:12px">Hafta ${weeks} · ${fmtDate(first)} – ${fmtDate(today())} · Cevap anahtarı en sonda</p></div>`;
  const toc = `<h2>İçindekiler</h2><table class="toc">${secs.map((s, i) => `<tr><td>${i + 1}</td><td><b>${e(s.t)}</b></td><td>${e(s.d)}</td></tr>`).join("")}</table>
<h2 style="margin-top:18px">Bu defter nasıl kullanılır?</h2><div class="cards"><div class="card"><b style="font-size:13px">1 · Önce konuyu oku</b><small>Her bölüm kuralın mantığıyla başlar, sonra çözümlü örnekler gelir.</small></div><div class="card"><b style="font-size:13px">2 · Hata analizine bak</b><small>Hatalar türüne göre gruplu; “tekrar” rozeti aynı tuzağa yeniden düştüğünü gösterir.</small></div><div class="card"><b style="font-size:13px">3 · Hata tekrar testi</b><small>Her tuzak için yeni soru. Süre tut: soru başına ~75 sn, önce etiketi yaz.</small></div><div class="card"><b style="font-size:13px">4 · Cep kartı</b><small>Akşam tekrarında ya da sınav sabahı ona bak.</small></div></div>`;
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>YDS Çalışma Defteri · ${fmtShort(today())}</title><style>${CSS}</style></head><body>${cover}${toc}
${secs.map((s, i) => `<div class="sec"><span class="no">${i + 1}</span><div><h2>${e(s.t)}</h2><small>${e(s.d)}</small></div></div>${s.h}`).join("")}
</body></html>`;
}

/** PDF oluşturur ve paylaşım menüsünü açar */
export async function shareDefter(): Promise<boolean> {
  const { uri } = await Print.printToFileAsync({ html: defterHTML() });
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "YDS çalışma defteri", UTI: "com.adobe.pdf" });
  return true;
}
