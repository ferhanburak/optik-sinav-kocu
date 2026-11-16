// Oynatıcı çerçevesi: üst çubuk (Çık, başlık, sağ öğe) + kaydırılabilir gövde
import React, { useEffect, useReducer, useRef } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Btn, T } from "../ui/kit";
import { useColors } from "../ui/theme";

export function Shell({ title, right, onClose, children, scrollKey }: { title: string; right?: React.ReactNode; onClose: () => void; children: React.ReactNode; scrollKey?: string | number }) {
  const c = useColors();
  const ref = useRef<React.ComponentRef<typeof ScrollView>>(null);
  useEffect(() => {
    ref.current?.scrollTo({ y: 0, animated: false });
  }, [scrollKey]);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top", "bottom"]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: c.paper, borderBottomWidth: 1, borderColor: c.line }}>
        <Btn sm title="‹ Çık" onPress={onClose} />
        <T v="small" numberOfLines={1} style={{ flex: 1, fontWeight: "700" }}>{title}</T>
        {right}
      </View>
      <ScrollView ref={ref} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Loading({ text }: { text: string }) {
  return <T v="small" muted>{text}</T>;
}

/** Değiştirilebilir oynatıcı durumu + yeniden çizim */
export function useMutable<T extends object>(init: () => T): [T, () => void] {
  const ref = useRef<T | null>(null);
  if (!ref.current) ref.current = init();
  const [, redraw] = useReducer((x: number) => x + 1, 0);
  return [ref.current, redraw];
}

/** Saniyede bir yenilenen sayaç */
export function useTick(on: boolean) {
  const [, tick] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    if (!on) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [on]);
}
