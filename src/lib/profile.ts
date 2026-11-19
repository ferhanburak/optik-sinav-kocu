// Profil ekranı istatistikleri: durumdan saf hesap (ağ ve kayıt yok).
import { FAMILIES } from "../data/catalog";
import type { State } from "../types";
import { addDays, today } from "./dates";

export interface ProfileStats {
  streak: number; // bugün ya da dün biten kesintisiz çalışma günleri
  best: number; // en uzun seri
  days: number; // çalışılan farklı gün sayısı
  since: string | null; // ilk çalışma günü
  sessions: number;
  minutes: number;
  questions: number; // son cevabı verilmiş soru sayısı
  accuracy: number | null; // genel doğruluk (%)
  recent: number | null; // son 14 gün doğruluk (%)
  week: { date: string; on: boolean }[]; // son 7 gün, eskiden yeniye
  mocks: number;
  bestMock: number | null;
  lastMock: number | null;
  vocab: number;
  vocabSolid: number; // en az 3. kutuya çıkmış kelimeler
  topicsDone: number;
  topicsAll: number;
  green: number; // yeşile dönen hata türü
  famsAll: number;
  mistakes: number;
  strong: string | null; // en iyi hata türü (yeşil ve en çok doğru)
  weak: string | null; // en zayıf hata türü (kırmızı ve en çok yanlış)
}

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : null);

export function profileStats(s: State, now = today()): ProfileStats {
  const dates = Array.from(new Set(s.sessions.map((x) => x.date))).sort();
  const set = new Set(dates);

  let streak = 0;
  let d = set.has(now) ? now : addDays(now, -1);
  while (set.has(d)) {
    streak++;
    d = addDays(d, -1);
  }
  let best = 0;
  let run = 0;
  let prev = "";
  for (const x of dates) {
    run = prev && addDays(prev, 1) === x ? run + 1 : 1;
    best = Math.max(best, run);
    prev = x;
  }

  const fin = s.attempts.filter((a) => a.fin === 1);
  const cut = addDays(now, -13);
  const recentFin = fin.filter((a) => {
    const day = new Date(a.t);
    const ymd = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    return ymd >= cut;
  });

  const fams = Object.entries(s.fams).filter(([k, f]) => FAMILIES[k] && f.n > 0);
  const strong = fams.filter(([, f]) => f.light === "green").sort((a, b) => b[1].ok - a[1].ok)[0];
  const weak = fams.filter(([, f]) => f.light === "red").sort((a, b) => b[1].wrong - a[1].wrong)[0];
  const mockSorted = [...s.mocks].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  return {
    streak,
    best,
    days: dates.length,
    since: dates[0] || null,
    sessions: s.sessions.length,
    minutes: s.sessions.reduce((t, x) => t + (x.dur || 0), 0) + s.mocks.reduce((t, x) => t + (x.dur || 0), 0),
    questions: fin.length,
    accuracy: pct(fin.filter((a) => a.ok === 1).length, fin.length),
    recent: pct(recentFin.filter((a) => a.ok === 1).length, recentFin.length),
    week: Array.from({ length: 7 }, (_, i) => {
      const date = addDays(now, i - 6);
      return { date, on: set.has(date) };
    }),
    mocks: s.mocks.length,
    bestMock: s.mocks.length ? Math.max(...s.mocks.map((m) => m.score)) : null,
    lastMock: mockSorted.length ? mockSorted[mockSorted.length - 1].score : null,
    vocab: s.vocab.length,
    vocabSolid: s.vocab.filter((v) => v.box >= 3).length,
    topicsDone: s.topics.filter((t) => t.status === "tamam").length,
    topicsAll: s.topics.length,
    green: fams.filter(([, f]) => f.light === "green").length,
    famsAll: Object.keys(FAMILIES).length,
    mistakes: s.mistakes.length,
    strong: strong ? FAMILIES[strong[0]].n : null,
    weak: weak ? FAMILIES[weak[0]].n : null,
  };
}
