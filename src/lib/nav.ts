// Gezinme: seçili sınav, sekme, tam ekran oynatıcı (oturum, drill, seviye testi, deneme, kelime tekrarı) ve pencereler
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSyncExternalStore } from "react";
import type { MockMode } from "../data/catalog";

export type Tab = "bugun" | "plan" | "defter" | "kelimeler" | "deneme" | "ilerleme";
export type Player =
  | { kind: "session"; sk: "normal" | "short" | "A" | "B" }
  | { kind: "drill"; f: string }
  | { kind: "place" }
  | { kind: "mock"; mode: MockMode }
  | { kind: "vrev" };
export type Modal = { kind: "settings" } | { kind: "intro"; sk: "normal" | "short" | "A" | "B" } | null;

interface NavState {
  /** Seçili sınav; null ise sınav seçim ekranı gösterilir */
  exam: string | null;
  tab: Tab;
  player: Player | null;
  modal: Modal;
  defterTab?: string;
}

const EXAM_KEY = "optik-exam";
let N: NavState = { exam: null, tab: "bugun", player: null, modal: null };
const subs = new Set<() => void>();
const set = (p: Partial<NavState>) => {
  N = { ...N, ...p };
  subs.forEach((f) => f());
};

export const nav = {
  /** Sınav seç (kaydedilir, sonraki açılışta doğrudan o sınavın menüsü gelir); null → seçim ekranına dön */
  exam: (exam: string | null) => {
    set({ exam, tab: "bugun", modal: null });
    (exam ? AsyncStorage.setItem(EXAM_KEY, exam) : AsyncStorage.removeItem(EXAM_KEY)).catch(() => {});
  },
  tab: (tab: Tab, defterTab?: string) => set({ tab, defterTab }),
  open: (player: Player) => set({ player, modal: null }),
  close: () => set({ player: null }),
  modal: (modal: Modal) => set({ modal }),
};

/** Açılışta son seçilen sınavı yükler */
export async function loadNav() {
  try {
    const exam = await AsyncStorage.getItem(EXAM_KEY);
    if (exam) set({ exam });
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
