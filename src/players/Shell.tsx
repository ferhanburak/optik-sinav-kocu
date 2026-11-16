// Oynatıcı çerçevesi: üst çubuk (Çık, başlık, sağ öğe) + kaydırılabilir gövde
import React, { useEffect, useReducer, useRef } from "react";
import { Animated, KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Backdrop } from "../ui/Backdrop";
import { Btn, T } from "../ui/kit";
import { useFill } from "../ui/motion";
import { useColors } from "../ui/theme";

function ProgressLine({ value }: { value: number }) {
  const c = useColors();
  const width = useFill(value * 100, 350);
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }} style={{ height: 3, backgroundColor: c.line }}>
      <Animated.View style={{ width, height: 3, backgroundColor: c.guide, borderTopRightRadius: 3, borderBottomRightRadius: 3 }} />
    </View>
  );
}

/** progress: 0–1 arası; verilirse üst çubuğun altında ince bir ilerleme çizgisi gösterilir */
export function Shell({ title, right, onClose, children, scrollKey, progress }: { title: string; right?: React.ReactNode; onClose: () => void; children: React.ReactNode; scrollKey?: string | number; progress?: number }) {
  const c = useColors();
  const ref = useRef<React.ComponentRef<typeof ScrollView>>(null);
  useEffect(() => {
    ref.current?.scrollTo({ y: 0, animated: false });
  }, [scrollKey]);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top", "bottom"]}>
      <Backdrop />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 10 }}>
        <Btn sm title="‹ Çık" onPress={onClose} />
        <T v="small" numberOfLines={1} style={{ flex: 1, fontWeight: "700" }}>{title}</T>
        {right}
      </View>
      {progress !== undefined ? <ProgressLine value={Math.max(0, Math.min(1, progress))} /> : null}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView ref={ref} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
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
