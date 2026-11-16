// Gezinme: sekme, tam ekran oynatıcı (oturum, drill, seviye testi, deneme, kelime tekrarı) ve pencereler
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
  tab: Tab;
  player: Player | null;
  modal: Modal;
  defterTab?: string;
}

let N: NavState = { tab: "bugun", player: null, modal: null };
const subs = new Set<() => void>();
const set = (p: Partial<NavState>) => {
  N = { ...N, ...p };
  subs.forEach((f) => f());
};

export const nav = {
  tab: (tab: Tab, defterTab?: string) => set({ tab, defterTab }),
  open: (player: Player) => set({ player, modal: null }),
  close: () => set({ player: null }),
  modal: (modal: Modal) => set({ modal }),
};

export function useNav(): NavState {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => N,
  );
}
