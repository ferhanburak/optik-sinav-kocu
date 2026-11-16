// Uygulama durumu: tek bir değiştirilebilir nesne + AsyncStorage'a kayıt + React aboneliği
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import { CURRICULUM } from "../data/catalog";
import type { Profile, State } from "../types";
import { addDays, today } from "./dates";

const KEY = "optik-yds-v2";

export function defaultProfile(): Profile {
  return { examDate: addDays(today(), 60), target: 70, dailyMin: 75, time: "13:58", vocabTime: "21:30", defterDay: 0, defterTime: "18:57", days: [0, 1, 2, 3, 4, 5, 6], format: "step", remind: true };
}

export function defaultState(): State {
  return {
    v: 2, onboarded: false, tanima: false, profile: defaultProfile(),
    topics: CURRICULUM.map((c, i) => ({ id: c.id, status: i === 1 ? "aktif" : "bekliyor" })),
    fams: {}, attempts: [], mistakes: [], vocab: [], sessions: [], decisions: [], mocks: [], skips: [], todos: [], seen: {},
  };
}

export function normalize(s: any): State {
  const d = defaultState();
  if (!s || s.v !== 2) return d;
  s = Object.assign(d, s);
  for (const k of ["attempts", "mistakes", "vocab", "sessions", "decisions", "mocks", "skips", "todos"]) if (!Array.isArray(s[k])) s[k] = [];
  for (const k of ["fams", "seen"]) if (!s[k] || typeof s[k] !== "object") s[k] = {};
  s.profile = Object.assign(defaultProfile(), s.profile || {});
  if (!Array.isArray(s.topics) || s.topics.length !== CURRICULUM.length)
    s.topics = CURRICULUM.map((c, i) => (s.topics || []).find((t: any) => t.id === c.id) || { id: c.id, status: i === 1 ? "aktif" : "bekliyor" });
  return s as State;
}

/** Uygulamanın tek durumu. Fonksiyonlar bunu yerinde değiştirir, sonra save() çağırır. */
export let S: State = defaultState();

let version = 0;
const subs = new Set<() => void>();
const emit = () => {
  version++;
  subs.forEach((f) => f());
};

function trim() {
  S.attempts = S.attempts.slice(-1500);
  S.mistakes = S.mistakes.slice(-150);
  S.vocab = S.vocab.slice(-700);
  S.sessions = S.sessions.slice(-200);
  S.decisions = S.decisions.slice(-60);
  S.mocks = S.mocks.slice(-30);
  S.skips = S.skips.slice(-60);
  const ks = Object.keys(S.seen);
  if (ks.length > 900) {
    const cut = addDays(today(), -30);
    ks.forEach((k) => {
      if (S.seen[k] < cut) delete S.seen[k];
    });
  }
}

let timer: ReturnType<typeof setTimeout> | undefined;
/** Değişikliği ekrana yansıtır ve kısa bir gecikmeyle cihaza yazar. */
export function save() {
  trim();
  emit();
  clearTimeout(timer);
  timer = setTimeout(() => {
    AsyncStorage.setItem(KEY, JSON.stringify(S)).catch(() => {});
  }, 400);
}

export async function load() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    S = normalize(raw ? JSON.parse(raw) : null);
  } catch {
    S = defaultState();
  }
  emit();
}

export function resetAll() {
  S = defaultState();
  save();
}

/** Durum her değiştiğinde bileşeni yeniden çizer. */
export function useStore(): State {
  useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => version,
  );
  return S;
}
