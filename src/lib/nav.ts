// Gezinme ve uygulama düzeyi kayıt: profil adı, eklenen sınavlar, açık sınav, sekme, tam ekran oynatıcı ve pencereler
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import type { MockMode } from "../data/catalog";
import { EXAMS } from "../data/exams";

export type Tab = "bugun" | "plan" | "deneme" | "defter" | "ilerleme";
export type Player =
  | { kind: "session"; sk: "normal" | "short" | "A" | "B"; /** biten konuyu yeniden aç: ders + kısa test, durumu değiştirmez */ review?: string }
  | { kind: "drill"; f: string }
  | { kind: "place" }
  | { kind: "mock"; mode: MockMode }
  | { kind: "vrev" };
export type Modal = { kind: "settings" } | { kind: "profile" } | { kind: "intro"; sk: "normal" | "short" | "A" | "B" } | null;

interface NavState {
  /** Açık sınav; null ise "Sınavlarım" ekranı gösterilir */
  exam: string | null;
  /** Kullanıcının eklediği sınavlar */
  exams: string[];
  /** Profil adı (isteğe bağlı) */
  name: string;
  tab: Tab;
  player: Player | null;
  modal: Modal;
  defterTab?: string;
}

const APP_KEY = "optik-app";
const OLD_EXAM_KEY = "optik-exam";
let N: NavState = { exam: null, exams: [], name: "", tab: "bugun", player: null, modal: null };
const subs = new Set<() => void>();
const set = (p: Partial<NavState>) => {
  N = { ...N, ...p };
  subs.forEach((f) => f());
};
const persist = () => AsyncStorage.setItem(APP_KEY, JSON.stringify({ exam: N.exam, exams: N.exams, name: N.name })).catch(() => {});
const isReady = (id: unknown): id is string => typeof id === "string" && EXAMS.some((e) => e.id === id && e.ready);

export const nav = {
  /** Sınavı aç (listede yoksa ekler); null → "Sınavlarım" ekranına dön */
  exam: (exam: string | null) => {
    set({ exam, exams: exam && !N.exams.includes(exam) ? [...N.exams, exam] : N.exams, tab: "bugun", modal: null });
    persist();
  },
  /** Sınavı listeden kaldırır; çalışma verileri silinmez */
  removeExam: (id: string) => {
    set({ exams: N.exams.filter((x) => x !== id), exam: N.exam === id ? null : N.exam });
    persist();
  },
  setName: (name: string) => {
    set({ name: name.trim().slice(0, 40) });
    persist();
  },
  tab: (tab: Tab, defterTab?: string) => set({ tab, defterTab }),
  open: (player: Player) => set({ player, modal: null }),
  close: () => set({ player: null }),
  modal: (modal: Modal) => set({ modal }),
};

/**
 * Açılışta kaydı yükler. Tek sınavı olan doğrudan o sınavın menüsüne, birden fazla sınavı olan "Sınavlarım" ekranına açılır.
 * hasYdsData: bu telefonda YDS çalışması varsa YDS listeye eklenir (eski sürümden gelenler için).
 */
export async function loadNav(hasYdsData: boolean) {
  try {
    const raw = await AsyncStorage.getItem(APP_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    const old = saved ? null : await AsyncStorage.getItem(OLD_EXAM_KEY);
    let exams: string[] = Array.isArray(saved?.exams) ? saved.exams.filter(isReady) : [];
    if (isReady(old) && !exams.includes(old)) exams.push(old);
    if (hasYdsData && !exams.includes("yds")) exams = ["yds", ...exams];
    const last = isReady(saved?.exam) ? saved.exam : isReady(old) ? old : null;
    set({ exams, name: typeof saved?.name === "string" ? saved.name : "", exam: exams.length === 1 && last && exams.includes(last) ? last : null });
  } catch {}
}

export function useNav(): NavState {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => N,
  );
}
