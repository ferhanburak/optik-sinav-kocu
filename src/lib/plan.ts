// Plan motoru. Kullanıcı başta modeli, günleri ve süreyi seçer; sonrasını sistem yönetir:
// günün türü (konu / açık kapama), yoğunluk, konunun testle geçilmesi ve önümüzdeki günlerin öngörüsü.
import { CURRICULUM, FAMILIES } from "../data/catalog";
import type { Topic } from "../types";
import { addDays, diffDays, dow, today } from "./dates";
import { activeTopic, advanceTopic, famEntries, sessionsOn } from "./engine";
import { S, save } from "./store";

export type DayType = "konu" | "tekrar" | "tanima";
export type Intensity = "hafif" | "normal" | "yogun";
export type PlanModel = "sirali" | "uyarlanan" | "acik";

/** Konu testinde geçme sınırı (konu sorularında ilk deneme yüzdesi) */
export const PASS = 70;
/** Haftalık esneklik hakları */
export const LIGHT_PER_WEEK = 2;
export const FREE_SKIPS_PER_WEEK = 1;

export const INTENSITY: Record<Intensity, { l: string; warm: number; set: number; vocab: number; min: number }> = {
  hafif: { l: "Hafif", warm: 3, set: 8, vocab: 8, min: 25 },
  normal: { l: "Normal", warm: 6, set: 16, vocab: 15, min: 60 },
  yogun: { l: "Yoğun", warm: 6, set: 22, vocab: 15, min: 90 },
};

export const MODELS: Record<PlanModel, { l: string; d: string }> = {
  uyarlanan: { l: "Uyarlanan", d: "Konu günleri, gerektiğinde açık kapama günleri. Plan her oturumdan sonra yeniden kurulur." },
  sirali: { l: "Sıralı", d: "Her gün sıradaki konu. Açıklar oturumların içinde gizli tekrarlarla sorulur." },
  acik: { l: "Açık kapama ağırlıklı", d: "Çoğu gün zayıf hata türleri ve mini notlar. Konuları bilen ya da sınavı yakın olanlar için." },
};

export const DAY_LABEL: Record<DayType, string> = { konu: "Konu günü", tekrar: "Açık kapama günü", tanima: "Tanıma günü" };

export const model = (): PlanModel => S.profile.model || "uyarlanan";
export const openFams = () => famEntries().filter(([, f]) => f.light === "red").map(([k]) => k);
const inWeek = (d: string) => d > addDays(today(), -7);

/* ---------- Yoğunluk: sistem belirler, haftada 2 "hafif gün" hakkı var ---------- */
export function systemIntensity(): Intensity {
  const p = S.profile;
  const left = p.examSet ? diffDays(today(), p.examDate) : 99;
  if (p.dailyMin < 45) return "hafif";
  if (p.dailyMin > 100 || (left >= 0 && left <= 14 && p.dailyMin >= 75)) return "yogun";
  return "normal";
}
export const isLightToday = () => S.dayMode[today()]?.i === "hafif";
export const intensityToday = (): Intensity => (isLightToday() ? "hafif" : systemIntensity());
export const lightUsed = () => Object.entries(S.dayMode).filter(([d, m]) => m.i === "hafif" && inWeek(d) && d !== today()).length;
export const canLight = () => systemIntensity() !== "hafif" && lightUsed() < LIGHT_PER_WEEK;
export const skipsUsed = () => S.skips.filter((d) => inWeek(d) && d !== today()).length;

function setMode(patch: { t?: "tekrar" | null; i?: "hafif" | null }) {
  const m = { ...(S.dayMode[today()] || {}) };
  if (patch.t !== undefined) patch.t ? (m.t = patch.t) : delete m.t;
  if (patch.i !== undefined) patch.i ? (m.i = patch.i) : delete m.i;
  S.dayMode[today()] = m;
  const cut = addDays(today(), -30);
  Object.keys(S.dayMode).forEach((d) => d < cut && delete S.dayMode[d]);
  save();
}
export const setLight = (on: boolean) => setMode({ i: on ? "hafif" : null });
/** Kullanıcı bugün açık kapatmak istediğini söyler (fazladan tekrar her zaman serbest) */
export const requestGap = (on: boolean) => setMode({ t: on ? "tekrar" : null });

/* ---------- Günün türü ---------- */
const typeOf = (s: { type?: string; kind: string }) => s.type || (s.kind === "oturum" ? "konu" : null);

/** En son üst üste kaç gün açık kapama yapıldı */
function gapStreak(): number {
  const ss = S.sessions.filter((s) => typeOf(s) === "konu" || typeOf(s) === "tekrar").sort((a, b) => (a.date < b.date ? 1 : -1));
  const dates: string[] = [];
  for (const s of ss) {
    if (typeOf(s) !== "tekrar") break;
    if (!dates.includes(s.date)) dates.push(s.date);
  }
  return dates.length;
}

export interface DayPlan {
  type: DayType;
  topic: Topic | null;
  /** Bu günün neden böyle olduğu (kullanıcıya gösterilir) */
  why: string;
  /** Kullanıcı kendi istedi */
  asked: boolean;
  /** Açık kapama gününde üstüne gidilecek hata türleri */
  focus: string[];
  /** Açık kapama, oturmayan konunun açıkları için */
  gapTopic: boolean;
}

export function dayPlan(): DayPlan {
  const t = activeTopic();
  const real = t && !t.kind ? t : null;
  const open = openFams();
  const weak = famEntries().filter(([, f]) => f.light === "red" || f.light === "yellow").map(([k]) => k).slice(0, 4);
  const base = { topic: real, asked: false, focus: weak, gapTopic: false };
  if (S.tanima) return { ...base, type: "tanima", why: "Seni tanıyoruz: her hata türünden karışık teşhis soruları." };
  if (!real) return { ...base, type: "tekrar", why: "Bütün konular tamam. Açık kapama ve denemelerle devam ediyoruz." };
  const log = S.topicLog[real.id];
  const m = model();
  if (S.dayMode[today()]?.t === "tekrar") return { ...base, type: "tekrar", asked: true, why: "Bugün açıkları kapatmak istedin." };
  if (log?.needGap && m !== "sirali")
    return { ...base, type: "tekrar", gapTopic: true, focus: real.f.length ? real.f : weak, why: `“${real.t}” testi %${log.last} çıktı. Önce bu konunun açıklarını kapatıyoruz, sonra test yeniden.` };
  const limit = m === "acik" ? 1 : 3;
  const maxStreak = m === "acik" ? 3 : 2;
  if (m !== "sirali" && open.length >= limit && gapStreak() < maxStreak)
    return { ...base, type: "tekrar", focus: open.slice(0, 4), why: `${open.length} hata türü açık: ${open.slice(0, 3).map((f) => FAMILIES[f].n).join(", ")}${open.length > 3 ? "…" : ""}. Kapanana kadar üstüne gidiyoruz.` };
  if (log && log.n > 0) return { ...base, type: "konu", why: `“${real.t}” geçen sefer %${log.last} çıktı. Konuyu yeniden çalışıp testi tekrar çözüyoruz.` };
  return { ...base, type: "konu", why: m !== "sirali" && open.length ? `Sıradaki konu. ${open.length} açık hata türü oturumun içinde gizli tekrar olarak sorulacak.` : "Sıradaki konu." };
}

export function planTitle(p: DayPlan): string {
  if (p.type === "tanima") return "Seni tanıma: karışık teşhis soruları";
  if (p.type === "konu") return p.topic ? p.topic.t : "Konu";
  const names = p.focus.slice(0, 2).map((f) => FAMILIES[f].n);
  return names.length ? `Açık kapama: ${names.join(", ")}${p.focus.length > 2 ? "…" : ""}` : "Açık kapama ve tekrar";
}

/* ---------- Konu testi sonucu: konu yalnızca testle geçilir ---------- */
export type Outcome = "pass" | "weakpass" | "gap" | "retry" | "none";

/**
 * c / n: konu sorularında ilk deneme. %70+ → konu tamam. %50–69 → ertesi gün açık kapama, sonra test yeniden.
 * %50 altı → konu baştan. İkinci denemede de geçilemezse konu "zayıf geçildi" diye ilerler ve türleri daha sık sorulur.
 */
export function applyTopicResult(topic: Topic, c: number, n: number): { outcome: Outcome; p: number; next: Topic | null } {
  if (n < 4) return { outcome: "none", p: 0, next: null };
  const p = Math.round((c / n) * 100);
  const old = S.topicLog[topic.id] || { n: 0, last: 0, best: 0, date: "" };
  const log = { ...old, n: old.n + 1, last: p, best: Math.max(old.best, p), date: today(), needGap: false };
  let outcome: Outcome;
  let next: Topic | null = null;
  if (p >= PASS) {
    outcome = "pass";
    next = advanceTopic();
  } else if (log.n >= 2) {
    outcome = "weakpass";
    log.weak = true;
    topic.f.forEach((f) => {
      if (S.fams[f]) S.fams[f] = { ...S.fams[f], due: today() };
    });
    next = advanceTopic();
  } else if (p >= 50 && model() !== "sirali") {
    outcome = "gap";
    log.needGap = true;
  } else outcome = "retry";
  S.topicLog[topic.id] = log;
  save();
  return { outcome, p, next };
}

/** Açık kapama günü bitince: oturmayan konunun "önce açık kapat" işareti kalkar, ertesi gün test yeniden çözülür */
export function gapDayDone() {
  const t = activeTopic();
  if (t && S.topicLog[t.id]?.needGap) {
    S.topicLog[t.id] = { ...S.topicLog[t.id], needGap: false };
    save();
  }
}

/* ---------- Önümüzdeki günler: bugün ve (bugün bittiyse) yarın kesin, gerisi beklenen ---------- */
export interface PlanDay {
  date: string;
  type: DayType;
  title: string;
  /** false → beklenen (soluk) */
  sure: boolean;
  done?: boolean;
  score?: string;
}

const isStudyDay = (d: string) => S.profile.days.includes(dow(d));
export const completedToday = () => sessionsOn(today()).filter((s) => s.done !== false && (typeOf(s) || s.kind === "tanima" || s.kind === "telafi"));

export function upcoming(count = 7): PlanDay[] {
  const out: PlanDay[] = [];
  const plan = dayPlan();
  const done = completedToday();
  let idx = S.topics.findIndex((t) => t.status === "aktif");
  let d = today();
  if (done.length) {
    const s = done[done.length - 1];
    const tp = CURRICULUM.find((c) => c.id === s.topic);
    out.push({ date: d, type: (typeOf(s) as DayType) || "konu", title: typeOf(s) === "tekrar" ? "Açık kapama" : tp ? tp.t : "Oturum", sure: true, done: true, score: `${s.c}/${s.n}` });
  } else if (isStudyDay(d)) {
    out.push({ date: d, type: plan.type, title: planTitle(plan), sure: true });
    if (plan.type === "konu") idx++;
  }
  let nextIsKnown = done.length > 0; // bugün bittiyse yarın, şimdiki duruma göre kesindir
  for (let i = 0; i < 60 && out.length < count; i++) {
    d = addDays(d, 1);
    if (!isStudyDay(d)) continue;
    if (nextIsKnown) {
      nextIsKnown = false;
      out.push({ date: d, type: plan.type, title: planTitle(plan), sure: true });
      if (plan.type === "konu") idx++;
      continue;
    }
    const t = idx >= 0 ? CURRICULUM[idx] : undefined;
    if (t && !t.kind) {
      out.push({ date: d, type: "konu", title: t.t, sure: false });
      idx++;
    } else out.push({ date: d, type: "tekrar", title: "Deneme ve açık kapama", sure: false });
  }
  return out;
}

/** Konuların beklenen bitişi ve sınava kalan pay (gün). Açık kapama günleri çıkarsa kayar. */
export function expectedFinish(): { left: number; date: string | null; buffer: number | null } {
  const i = S.topics.findIndex((t) => t.status === "aktif");
  const left = i < 0 ? 0 : CURRICULUM.slice(i).filter((c) => !c.kind).length;
  if (!left) return { left: 0, date: null, buffer: null };
  let d = completedToday().length ? today() : addDays(today(), -1);
  let n = left;
  for (let k = 0; k < 400 && n > 0; k++) {
    d = addDays(d, 1);
    if (isStudyDay(d)) n--;
  }
  return { left, date: d, buffer: S.profile.examSet ? diffDays(d, S.profile.examDate) : null };
}
