// Koçluk motoru: hata aileleri, gizli tekrarlar, soru seçimi, oturum özeti, karar notu
import { BANK_ALL, LESSONS } from "../content";
import { CURRICULUM, FAMILIES, LABELS, LIGHT_LABEL, LIGHT_ORDER, MOCK_LAYOUT, SECTIONS, TANIMA_GOAL, type MockMode } from "../data/catalog";
import { VOCAB_BANK } from "../data/vocab";
import type { Attempt, BankQ, CardState, Decision, FamState, Light, Mistake, Question, Topic, VocabItem } from "../types";
import { addDays, dayOf, dow, fmtShort, pct, shuffle, today, uid } from "./dates";
import { S, save } from "./store";

/* ---------- Aileler ---------- */
export function fam(id: string): FamState {
  return S.fams[id] || { light: "none", wrong: 0, streak: 0, ok: 0, n: 0, last: 0, due: null, note: "" };
}

/** 🟢 = üst üste 2 doğru · yanlış: 🟢→🟡, aksi halde 🔴 · yoklama: 🔴 +1, 🟡 +2, 🟢 +7 gün */
export function famUpdate(id: string, ok: boolean, unsure: boolean): { before: Light; after: Light } | null {
  if (!FAMILIES[id]) return null;
  const f = { ...fam(id) };
  const before = f.light;
  f.n++;
  f.last = Date.now();
  if (ok && !unsure) {
    f.ok++;
    f.streak++;
    if (f.streak >= 2) f.light = "green";
    else if (f.light === "none" || f.light === "red") f.light = "yellow";
  } else if (ok && unsure) {
    f.ok++;
    if (f.light === "none") f.light = "yellow";
  } else {
    f.wrong++;
    f.streak = 0;
    f.light = f.light === "green" ? "yellow" : "red";
  }
  f.due = addDays(today(), f.light === "red" ? 1 : f.light === "yellow" ? 2 : 7);
  S.fams[id] = f;
  return { before, after: f.light };
}

export const famEntries = () =>
  Object.entries(S.fams)
    .filter(([k]) => FAMILIES[k])
    .sort((a, b) => LIGHT_ORDER[a[1].light] - LIGHT_ORDER[b[1].light] || b[1].wrong - a[1].wrong);

export function dueFams(): string[] {
  return famEntries()
    .filter(([, f]) => f.light !== "none" && (!f.due || f.due <= today()))
    .map(([id]) => id);
}

export const famsKnown = () => Object.entries(S.fams).filter(([k, f]) => FAMILIES[k] && f.n > 0).length;
export const unknownFams = () => Object.keys(FAMILIES).filter((k) => !(S.fams[k] && S.fams[k].n > 0));
export const lightLabel = (l: string) => LIGHT_LABEL[l] || LIGHT_LABEL.none;

export function lastMistakeOf(f: string): Mistake | null {
  for (let i = S.mistakes.length - 1; i >= 0; i--) if (S.mistakes[i].fam === f) return S.mistakes[i];
  return null;
}

/* ---------- Konular ---------- */
export function activeTopic(): Topic | null {
  const t = S.topics.find((x) => x.status === "aktif");
  return t ? CURRICULUM.find((c) => c.id === t.id) || null : null;
}

export function advanceTopic(): Topic | null {
  const i = S.topics.findIndex((x) => x.status === "aktif");
  if (i < 0) return null;
  S.topics[i].status = "tamam";
  const n = S.topics.slice(i + 1).find((t) => t.status === "bekliyor"); // atlanan konular geçilir
  if (n) {
    n.status = "aktif";
    return CURRICULUM.find((c) => c.id === n.id) || null;
  }
  return null;
}

export function jumpTopic(id: string) {
  const i = S.topics.findIndex((t) => t.id === id);
  if (i < 0) return;
  S.topics.forEach((t, j) => {
    if (t.status === "aktif") t.status = j < i ? "tamam" : "bekliyor";
  });
  S.topics[i].status = "aktif";
  save();
}

export const topicStatus = (id: string) => (S.topics.find((t) => t.id === id) || { status: "bekliyor" }).status;
export const hasLesson = (id: string) => !!LESSONS[id];

/* ---------- Günler ---------- */
export const sessionsOn = (d: string) => S.sessions.filter((s) => s.date === d);

export function streakDays(): number {
  const days = new Set(S.sessions.map((s) => s.date));
  let d = today();
  let n = 0;
  if (!days.has(d)) d = addDays(d, -1);
  while (days.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

/** Dün çalışma günüydü ve oturum yoksa (ya da atlandıysa) bugün telafi günü */
export function isTelafi(): boolean {
  const y = addDays(today(), -1);
  if (!S.onboarded || !S.profile.days.includes(dow(y))) return false;
  if (S.skips.includes(y)) return true;
  const first = S.sessions.map((s) => s.date).sort()[0];
  return !!first && first < y && !sessionsOn(y).length;
}

export function checkTanimaDone(): boolean {
  if (S.tanima && famsKnown() >= TANIMA_GOAL) {
    S.tanima = false;
    save();
    return true;
  }
  return false;
}

/* ---------- Soru bankası ---------- */
export function prepBank(x: BankQ): Question {
  const fixed = x.sec === "bozan" || !!x.g;
  const idx = fixed ? [0, 1, 2, 3, 4] : shuffle([0, 1, 2, 3, 4]);
  return { ...x, id: uid(), o: idx.map((i) => x.o[i]), a: idx.indexOf(x.a), d: idx.map((i) => x.d[i] || ""), rep: false };
}

/** Görülmemiş sorulara öncelik ver; son 3 günde görülenler en sona */
export function pickBank(pred: (x: BankQ) => boolean, n: number, used: Set<string>): BankQ[] {
  if (n <= 0) return [];
  const old = addDays(today(), -3);
  const sc = (x: BankQ) => {
    const s = S.seen[x.bid];
    return s ? (s >= old ? 2 : 1) : 0;
  };
  const out = shuffle(BANK_ALL.filter((x) => pred(x) && !used.has(x.bid)))
    .sort((a, b) => sc(a) - sc(b))
    .slice(0, n);
  out.forEach((x) => used.add(x.bid));
  return out;
}

/** Set: gizli tekrarlar + konu aileleri + 3 edat + 2 türetme, kalan zayıf ailelerden */
export function buildBankSet(o: { n: number; warm?: boolean; topic?: Topic | null; repFams?: string[]; tanima?: boolean }): Question[] | null {
  const { n, warm, topic, repFams, tanima } = o;
  const used = new Set<string>();
  const out: BankQ[] = [];
  const reps = new Set<string>();
  (repFams || []).forEach((f) => {
    const r = pickBank((x) => x.fam === f && !x.g, 1, used)[0];
    if (r) {
      out.push(r);
      reps.add(r.bid);
    }
  });
  const weakOrder = famEntries().map(([k]) => k);
  if (warm) out.push(...pickBank((x) => x.fam === "eh" && x.sec === "gramer", n - out.length, used));
  else if (tanima) {
    unknownFams().forEach((f) => {
      if (out.length < n) out.push(...pickBank((x) => x.fam === f && !x.g, 1, used));
    });
  } else {
    const tf = topic && topic.f.length ? topic.f : weakOrder.slice(0, 4);
    out.push(...pickBank((x) => tf.includes(x.fam) && !x.g, Math.max(0, n - 5 - out.length), used));
    out.push(...pickBank((x) => x.fam === "edat" && !x.g, 3, used));
    out.push(...pickBank((x) => x.fam === "turetme" && !x.g, 2, used));
  }
  for (const f of weakOrder) {
    if (out.length >= n) break;
    out.push(...pickBank((x) => x.fam === f && !x.g, 1, used));
  }
  if (out.length < n) out.push(...pickBank((x) => !x.g, n - out.length, used));
  if (out.length < n - 1) return null;
  return shuffle(out.slice(0, n)).map((x) => {
    const q = prepBank(x);
    q.rep = reps.has(x.bid);
    if (q.rep) {
      const m = lastMistakeOf(q.fam);
      q.repFrom = m ? fmtShort(dayOf(m.t)) : null;
    }
    return q;
  });
}

/** Deneme bölümü: okuma 4'lü, cloze 5'li parça grupları */
export function bankSection(s: string, n: number, used: Set<string>): Question[] | null {
  if (s === "okuma" || s === "cloze") {
    const per = s === "okuma" ? 4 : 5;
    if (n % per) return null;
    const groups: Record<number, BankQ[]> = {};
    BANK_ALL.filter((x) => x.sec === s && x.g).forEach((x) => (groups[x.g!] = groups[x.g!] || []).push(x));
    const gs = shuffle(Object.values(groups).filter((g) => g.length === per && !g.some((x) => used.has(x.bid))));
    if (gs.length < n / per) return null;
    const out = gs.slice(0, n / per).flat();
    out.forEach((x) => used.add(x.bid));
    return out.map(prepBank);
  }
  const pool = pickBank((x) => x.sec === s && !x.g, n, used);
  return pool.length === n ? pool.map(prepBank) : null;
}

export function drillQuestions(f: string): Question[] {
  return pickBank((x) => x.fam === f && (f === "okuma" || !x.g), 3, new Set()).map(prepBank);
}

export function mockLayout(mode: MockMode): [string, number][] {
  if (mode === "full") return MOCK_LAYOUT;
  if (mode === "half") {
    let left = 40;
    const out: [string, number][] = [];
    for (const [s, n] of MOCK_LAYOUT) {
      if (left <= 0) break;
      const k = Math.min(n, left);
      out.push([s, k]);
      left -= k;
    }
    return out;
  }
  return [["kelime", 2], ["gramer", 4], ["cloze", 5], ["tamamlama", 3], ["ceviri", 2], ["okuma", 4]];
}

/** Bankadan deneme kurar; bankada yetmeyen bölüm atlanır */
export function buildMock(mode: MockMode): { qs: Question[]; skipped: string[] } {
  const used = new Set<string>();
  const qs: Question[] = [];
  const skipped: string[] = [];
  for (const [s, n] of mockLayout(mode)) {
    const parts: [string, number][] = s === "okuma" && n > 12 ? [["okuma", 12], ["okuma", n - 12]] : [[s, n]];
    for (const [ps, pn] of parts) {
      const got = bankSection(ps, pn, used);
      if (got) qs.push(...got);
      else skipped.push(`${SECTIONS[ps]} (${pn})`);
    }
  }
  return { qs, skipped };
}

/* ---------- Soru kartı ---------- */
export function newCardState(ref = ""): CardState {
  return { ref, stage: "label", label: "", first: null, second: null, t0: Date.now(), sec: 0, un: false, diag: [], diagTxt: "", famChange: null };
}

export function labelType(q: Question): string | null {
  const t = FAMILIES[q.fam] && FAMILIES[q.fam].lab;
  return t && LABELS[t] ? t : null;
}

export function recordAttempt(q: Question, ok: boolean, final: boolean, unsure: boolean, sec: number, src: string, label: string) {
  const a: Attempt = { t: Date.now(), fam: q.fam, sec: q.sec, ok: ok ? 1 : 0, fin: final ? 1 : 0, u: unsure ? 1 : 0, s: Math.round(sec || 0), src, rep: q.rep ? 1 : 0, lab: label || "" };
  S.attempts.push(a);
}

/** Şık seçimi: ilk yanlışta ipucu + ikinci deneme; resmî skor ilk deneme. true → yeniden çiz */
export function cardPick(q: Question, st: CardState, j: number, src: string): boolean {
  if (st.stage === "label") st.stage = "opts";
  if (st.stage === "opts") {
    st.first = j;
    st.sec = (Date.now() - st.t0) / 1000;
    if (j === q.a) finishCard(q, st, src);
    else st.stage = "retry";
    return true;
  }
  if (st.stage === "retry") {
    if (j === st.first) return false;
    st.second = j;
    finishCard(q, st, src);
    return true;
  }
  return false;
}

function finishCard(q: Question, st: CardState, src: string) {
  st.stage = "done";
  const ok = st.first === q.a;
  if (q.bid) S.seen[q.bid] = today();
  recordAttempt(q, ok, ok || st.second === q.a, st.un, st.sec, src, st.label);
  st.famChange = famUpdate(q.fam, ok, st.un);
  if (!ok || st.un) {
    st.mid = uid();
    S.mistakes.push({ id: st.mid, t: Date.now(), fam: q.fam, sec: q.sec, p: q.p || "", q: q.q, o: q.o, a: q.a, ua: st.first, x: q.x, tip: q.tip, lab: q.lab, un: ok && st.un ? 1 : 0, diag: "", ref: st.ref || "" });
  }
  save();
}

/** Hata kaydının kısa adı: "21 Eki S5" */
export const mistakeRef = (m: Mistake) => `${fmtShort(dayOf(m.t))}${m.ref ? " " + m.ref : ""}`;

export function saveDiag(st: CardState) {
  if (!st.mid) return;
  const m = S.mistakes.find((x) => x.id === st.mid);
  if (!m) return;
  m.diag = [...st.diag, st.diagTxt.trim()].filter(Boolean).join(" · ");
  save();
}

/* ---------- Kelimeler ---------- */
export function newVocab(n: number): VocabItem[] {
  const known = new Set(S.vocab.map((v) => v.w.toLowerCase()));
  const fresh = VOCAB_BANK.filter((v) => !known.has(v.w.toLowerCase()));
  const preps = shuffle(fresh.filter((v) => v.p)).slice(0, 3);
  const rest = shuffle(fresh.filter((v) => !v.p)).slice(0, n - preps.length);
  return shuffle([...rest, ...preps]).map((v) => ({ id: uid(), w: v.w, m: v.m, ex: v.ex, prep: !!v.p, day: today(), box: 0, due: addDays(today(), 1), ok: 0, bad: 0 }));
}

export function addVocab(list: VocabItem[]) {
  const seen = new Set(S.vocab.map((v) => v.w.toLowerCase()));
  list.forEach((v) => {
    if (!seen.has(v.w.toLowerCase())) {
      S.vocab.push(v);
      seen.add(v.w.toLowerCase());
    }
  });
  save();
}

/** Kutular: 0→1 gün, 1→1, 2→3, 3→7, 4→14 */
export function vocabAnswer(id: string, ok: boolean) {
  const x = S.vocab.find((y) => y.id === id);
  if (!x) return;
  const iv = [1, 1, 3, 7, 14];
  if (ok) {
    x.ok++;
    x.box = Math.min(4, x.box + 1);
  } else {
    x.bad++;
    x.box = 0;
  }
  x.due = addDays(today(), iv[x.box]);
  save();
}

export function importVocab(text: string): number {
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const seen = new Set(S.vocab.map((v) => v.w.toLowerCase()));
  let n = 0;
  lines.forEach((l) => {
    const prep = /^🔹/.test(l);
    const parts = l.replace(/^🔹\s*/, "").split(/\s+[-–—:]\s+|\t/);
    if (parts.length < 2) return;
    const w = parts[0].trim();
    if (!w || seen.has(w.toLowerCase())) return;
    seen.add(w.toLowerCase());
    S.vocab.push({ id: uid(), w, m: parts[1].trim(), ex: (parts[2] || "").trim(), prep, day: today(), box: 0, due: addDays(today(), 1), ok: 0, bad: 0 });
    n++;
  });
  save();
  return n;
}

/* ---------- Oturum özeti ve karar notu ---------- */
export interface Done {
  q: Question;
  st: CardState;
  k: "warm" | "test";
}

export interface Summary {
  n: number;
  c: number;
  cf: number;
  spq: number | null;
  dur: number;
  byFam: Record<string, { n: number; c: number }>;
  unsure: number;
  unsureOk: number;
  sureWrong: number;
  h1: number | null;
  h2: number | null;
  reps: { fam: string; ok: boolean }[];
}

export function summarize(all: Done[], t0: number): Summary {
  const ok1 = (x: Done) => x.st.first === x.q.a;
  const n = all.length;
  const c = all.filter(ok1).length;
  const cf = all.filter((x) => ok1(x) || x.st.second === x.q.a).length;
  const secs = all.map((x) => x.st.sec).filter(Boolean);
  const spq = secs.length ? Math.round(secs.reduce((a, b) => a + b, 0) / secs.length) : null;
  const byFam: Summary["byFam"] = {};
  all.forEach((x) => {
    const b = (byFam[x.q.fam] = byFam[x.q.fam] || { n: 0, c: 0 });
    b.n++;
    if (ok1(x)) b.c++;
  });
  const unsure = all.filter((x) => x.st.un);
  const tests = all.filter((x) => x.k === "test");
  const half = Math.floor(tests.length / 2);
  const h1 = tests.slice(0, half);
  const h2 = tests.slice(half);
  return {
    n, c, cf, spq, byFam, dur: Math.round((Date.now() - t0) / 60000),
    unsure: unsure.length, unsureOk: unsure.filter(ok1).length,
    sureWrong: all.filter((x) => !x.st.un && !ok1(x)).length,
    h1: h1.length ? pct(h1.filter(ok1).length, h1.length) : null,
    h2: h2.length ? pct(h2.filter(ok1).length, h2.length) : null,
    reps: all.filter((x) => x.q.rep).map((x) => ({ fam: x.q.fam, ok: ok1(x) })),
  };
}

/** Kurala dayalı karar notu: güçlü, zayıf, teşhis, yeni önlem, yarın */
export function decisionFor(s: Summary, topic: Topic | null, since: number): Decision {
  const fams = Object.entries(s.byFam);
  const strong = fams.filter(([, b]) => b.c === b.n && b.n >= 2).map(([k]) => FAMILIES[k].n);
  const weak = fams.filter(([, b]) => b.c < b.n).sort((a, b) => a[1].c / a[1].n - b[1].c / b[1].n);
  const diags = S.mistakes.filter((m) => m.t >= since && m.diag).flatMap((m) => m.diag.split(" · "));
  const freq: Record<string, number> = {};
  diags.forEach((d) => (freq[d] = (freq[d] || 0) + 1));
  const topDiag = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
  const teshis: string[] = [];
  if (topDiag) teshis.push(`En sık kendi teşhisin: “${topDiag[0]}” (${topDiag[1]} kez).`);
  if (s.spq && s.spq < 75) teshis.push(`Soru başına ${s.spq} sn: hedefin (≥75 sn) altında, hız hataya dönüşüyor olabilir.`);
  if (s.h1 !== null && s.h2 !== null && s.h2 < s.h1 - 10) teshis.push(`İkinci yarıda düşüş var (%${s.h1} → %${s.h2}).`);
  if (s.sureWrong) teshis.push(`${s.sureWrong} soruda emin olup yanlış yaptın: bilgi var ama kontrol eksik.`);
  const w0 = weak[0]?.[0];
  const repsBad = s.reps.filter((r) => !r.ok).map((r) => FAMILIES[r.fam].n);
  return {
    guclu: strong.length ? strong.join(", ") + " sorunsuz." : s.c ? `İlk denemede ${s.c}/${s.n} doğru.` : "",
    zayif: weak.length ? weak.slice(0, 3).map(([k, b]) => `${FAMILIES[k].n} ${b.c}/${b.n}`).join(" · ") : "Bu oturumda zayıf hata türü çıkmadı.",
    teshis: teshis.join(" ") || "Belirgin bir hata kalıbı yok.",
    onlem: w0 ? `${FAMILIES[w0].n}: ${FAMILIES[w0].tool}` : "10 sn kontrolünü sürdür: soru tipi → etiket → şık.",
    yarin: [
      topic ? `Konu: ${topic.t}.` : "",
      repsBad.length ? `Gizli tekrarda kaçanlar yeniden sorulacak: ${repsBad.join(", ")}.` : w0 ? `Isınmada ${FAMILIES[w0].n} tekrar edilecek.` : "",
    ].filter(Boolean).join(" "),
  };
}

/** Haftalık koç yorumu (kurala dayalı) */
export function weeklyCoach(): { iyi: string[]; acik: string[]; oncelik: string[] } {
  const wk = S.attempts.filter((a) => a.t > Date.now() - 7 * 864e5);
  const bySec: Record<string, { n: number; c: number }> = {};
  wk.forEach((a) => {
    const b = (bySec[a.sec] = bySec[a.sec] || { n: 0, c: 0 });
    b.n++;
    if (a.ok) b.c++;
  });
  const secs = Object.entries(bySec).filter(([, b]) => b.n >= 3).sort((a, b) => b[1].c / b[1].n - a[1].c / a[1].n);
  const iyi: string[] = [];
  const acik: string[] = [];
  const oncelik: string[] = [];
  if (!wk.length) return { iyi, acik: ["Bu hafta henüz soru çözülmedi."], oncelik: ["Günlük oturumu başlat: ısınma, kelimeler, konu ve set."] };
  iyi.push(`Bu hafta ${wk.length} soru, ilk denemede %${pct(wk.filter((a) => a.ok).length, wk.length)} doğru.`);
  secs.filter(([, b]) => b.c / b.n >= 0.75).slice(0, 2).forEach(([k, b]) => iyi.push(`${SECTIONS[k]}: %${pct(b.c, b.n)}`));
  const greens = famEntries().filter(([, f]) => f.light === "green").map(([k]) => FAMILIES[k].n);
  if (greens.length) iyi.push(`Oturan hata türleri: ${greens.slice(0, 4).join(", ")}.`);
  const reds = famEntries().filter(([, f]) => f.light === "red");
  reds.slice(0, 3).forEach(([k, f]) => acik.push(`${FAMILIES[k].n}: ${f.wrong} yanlış, durum açık.`));
  secs.filter(([, b]) => b.c / b.n < 0.55).slice(-2).forEach(([k, b]) => acik.push(`${SECTIONS[k]}: %${pct(b.c, b.n)}`));
  const timed = wk.filter((a) => a.s);
  const spq = timed.length ? Math.round(timed.reduce((s, a) => s + a.s, 0) / timed.length) : null;
  if (spq && spq < 75) acik.push(`Soru başına ortalama ${spq} sn; hızlanınca bilinen kural kaçıyor.`);
  reds.slice(0, 2).forEach(([k]) => oncelik.push(`${FAMILIES[k].n}: ${FAMILIES[k].tool}`));
  if (spq && spq < 75) oncelik.push("Her soruda etiketi yazmadan şıklara geçme; ≥75 sn hedefi.");
  const t = activeTopic();
  if (t) oncelik.push(`Aktif konu: ${t.t}. Set %70'in üstüne çıkınca “Devam” de.`);
  if (!S.mocks.length || S.mocks[S.mocks.length - 1].date < addDays(today(), -7)) oncelik.push("Haftada bir deneme çöz (en azından mini).");
  return { iyi, acik: acik.length ? acik : ["Belirgin bir açık yok."], oncelik: oncelik.slice(0, 3) };
}

export function placementApply(qs: Question[], cards: Record<number, CardState>, t0: number) {
  const n = qs.length;
  const c = qs.filter((q, i) => cards[i] && cards[i].first === q.a).length;
  const cf = qs.filter((q, i) => cards[i] && (cards[i].first === q.a || cards[i].second === q.a)).length;
  S.sessions.push({ id: uid(), date: today(), kind: "seviye", n, c, cf, p: pct(c, n), pf: null, spq: Math.round((Date.now() - t0) / 1000 / n), dur: Math.round((Date.now() - t0) / 60000) });
  S.topics[0].status = "tamam";
  S.onboarded = true;
  S.tanima = false;
  if (!S.topics.some((t) => t.status === "aktif")) S.topics[1].status = "aktif";
  save();
  return { n, c };
}
