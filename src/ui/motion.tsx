// Hareket altyapısı: giriş animasyonu, basma tepkisi, sayaç, açılır-kapanır geçiş ve dokunsal geri bildirim.
// Telefonun "hareketi azalt" ayarı açıksa animasyonlar atlanır.
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, LayoutAnimation, Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

/** Web'de yerel sürücü yok; orada JS ile çalışır */
export const ND = Platform.OS !== "web";

let reduce = false;
try {
  AccessibilityInfo.isReduceMotionEnabled().then((v) => (reduce = !!v)).catch(() => {});
  AccessibilityInfo.addEventListener("reduceMotionChanged", (v) => (reduce = !!v));
} catch {}
export const motionOff = () => reduce;

/** Belirirken hafifçe yukarı kayar. Yeniden oynatmak için `key` değiştir. */
export function FadeIn({ children, delay = 0, y = 10, duration = 260, style }: { children: React.ReactNode; delay?: number; y?: number; duration?: number; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) return;
    const a = Animated.timing(v, { toValue: 1, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: ND });
    a.start();
    return () => a.stop();
  }, []);
  return <Animated.View style={[style, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [y, 0] }) }] }]}>{children}</Animated.View>;
}

/** Çocuklarını sırayla, küçük gecikmelerle belirtir (sonuç ekranları için) */
export function Stagger({ children, step = 70 }: { children: React.ReactNode; step?: number }) {
  return (
    <>
      {React.Children.toArray(children).map((ch, i) => (
        <FadeIn key={i} delay={i * step}>{ch}</FadeIn>
      ))}
    </>
  );
}

/** Basınca hafifçe küçülen dokunma alanı. `style` dış yerleşim, `inner` görünen kutu. */
export function Press({ children, style, inner, scaleTo = 0.97, onPressIn, onPressOut, ...rest }: Omit<PressableProps, "style" | "children"> & { children: React.ReactNode; style?: StyleProp<ViewStyle>; inner?: StyleProp<ViewStyle>; scaleTo?: number }) {
  const s = useRef(new Animated.Value(1)).current;
  const to = (x: number) => Animated.spring(s, { toValue: x, useNativeDriver: ND, speed: 40, bounciness: 4 }).start();
  return (
    <Pressable
      {...rest}
      style={style}
      onPressIn={(e) => {
        if (!reduce) to(scaleTo);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        to(1);
        onPressOut?.(e);
      }}
    >
      <Animated.View style={[inner, { transform: [{ scale: s }] }]}>{children}</Animated.View>
    </Pressable>
  );
}

/** Doğru cevapta küçük bir sıçrama, yanlışta yana sallanma. Yalnızca durum DEĞİŞİNCE oynar. */
export function useAnswerFx(state: string | undefined) {
  const x = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const prev = useRef(state);
  useEffect(() => {
    const was = prev.current;
    prev.current = state;
    if (reduce || was === state) return;
    if (state === "right") Animated.sequence([Animated.timing(scale, { toValue: 1.035, duration: 110, useNativeDriver: ND }), Animated.spring(scale, { toValue: 1, useNativeDriver: ND, speed: 18, bounciness: 10 })]).start();
    if ((state === "wrong" && was !== "tried") || state === "tried")
      Animated.sequence([-7, 7, -5, 5, -2, 0].map((v) => Animated.timing(x, { toValue: v, duration: 45, useNativeDriver: ND }))).start();
  }, [state]);
  return { transform: [{ translateX: x }, { scale }] };
}

/** 0'dan hedefe sayan tam sayı */
export function useCountUp(to: number, ms = 650): number {
  const [n, setN] = useState(reduce ? to : 0);
  useEffect(() => {
    if (reduce) return setN(to);
    const t0 = Date.now();
    let raf = 0;
    const step = () => {
      const p = Math.min(1, (Date.now() - t0) / ms);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return n;
}

/** 0–100 arası değere doğru yumuşakça dolan genişlik ("%") */
export function useFill(value: number, ms = 500) {
  const target = Math.max(0, Math.min(100, value));
  const v = useRef(new Animated.Value(reduce ? target : 0)).current;
  useEffect(() => {
    if (reduce) return v.setValue(target);
    Animated.timing(v, { toValue: target, duration: ms, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [target]);
  return v.interpolate({ inputRange: [0, 100], outputRange: ["0%", "100%"] });
}

/** Bir sonraki yerleşim değişikliğini (aç/kapa) yumuşatır */
export function ease() {
  if (reduce || Platform.OS === "web") return;
  LayoutAnimation.configureNext(LayoutAnimation.create(200, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity));
}

const run = (f: () => Promise<void>) => {
  if (Platform.OS === "web") return;
  try {
    f().catch(() => {});
  } catch {}
};
/** Dokunsal geri bildirim: seçim, doğru, yanlış */
export const haptic = {
  tap: () => run(() => Haptics.selectionAsync()),
  ok: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  bad: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
