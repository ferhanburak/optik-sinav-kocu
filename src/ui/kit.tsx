// Temel arayüz parçaları
import React, { useEffect, useState } from "react";
import { Animated, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from "react-native";
import { lightLabel } from "../lib/engine";
import { FadeIn, Press, useCountUp, useFill } from "./motion";
import { elev, glowShadow, lightColor, radius, sp, useColors, type Colors } from "./theme";

type TV = "h1" | "h2" | "h3" | "body" | "small" | "label" | "mono" | "big";
export function T({ v = "body", muted, color, style, children, numberOfLines }: { v?: TV; muted?: boolean; color?: string; style?: StyleProp<TextStyle>; children?: React.ReactNode; numberOfLines?: number }) {
  const c = useColors();
  const base: Record<TV, TextStyle> = {
    h1: { fontSize: 30, fontWeight: "800" },
    h2: { fontSize: 22, fontWeight: "700" },
    h3: { fontSize: 17, fontWeight: "700" },
    body: { fontSize: 15, lineHeight: 22 },
    small: { fontSize: 13, lineHeight: 19 },
    label: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2 },
    mono: { fontSize: 13, fontVariant: ["tabular-nums"], fontWeight: "700" },
    big: { fontSize: 34, fontWeight: "800", fontVariant: ["tabular-nums"], letterSpacing: -0.5 },
  };
  return (
    <Text numberOfLines={numberOfLines} style={[base[v], { color: color || (muted || v === "label" ? c.muted : c.ink) }, style]}>
      {v === "label" ? trUpper(children) : children}
    </Text>
  );
}

/** Türkçe büyük harf (i → İ, ı → I). CSS'in büyük harf dönüşümü "GIRILMEDI" gibi yanlış yazar. */
function trUpper(node: React.ReactNode): React.ReactNode {
  if (typeof node === "string") return node.replace(/i/g, "İ").replace(/ı/g, "I").toUpperCase();
  if (Array.isArray(node)) return node.map((n, i) => (typeof n === "string" ? trUpper(n) : React.isValidElement(n) ? React.cloneElement(n, { key: n.key ?? i }) : n));
  return node;
}

/** Okuma yüzeyi: düz, yüksek kontrastlı kart */
export function Card({ children, style, accent }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; accent?: boolean }) {
  const c = useColors();
  return <View style={[{ backgroundColor: c.paper, borderColor: accent ? c.guide : c.line, borderWidth: 1, borderRadius: radius.card, padding: sp.l, gap: sp.s, boxShadow: elev(c) }, style]}>{children}</View>;
}

/** Cam yüzey: yarı saydam, ince ışıklı kenar. Zemindeki ışık halelerinin üstünde durur; uzun metin için Card kullan. */
export function Glass({ children, style, r = radius.card }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; r?: number }) {
  const c = useColors();
  return <View style={[{ backgroundColor: c.glass, borderColor: c.glassLine, borderWidth: 1, borderRadius: r, padding: sp.l, gap: sp.s }, style]}>{children}</View>;
}

export function Row({ children, style, gap = 8, wrap = true }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; gap?: number; wrap?: boolean }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap, flexWrap: wrap ? "wrap" : "nowrap" }, style]}>{children}</View>;
}

export const Spacer = () => <View style={{ flex: 1 }} />;

export function Btn({ title, onPress, kind = "def", sm, disabled, on, style }: { title: string; onPress?: () => void; kind?: "def" | "pri" | "ghost"; sm?: boolean; disabled?: boolean; on?: boolean; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const bg = kind === "pri" ? c.guide : on ? c.ink : kind === "ghost" ? "transparent" : c.paper;
  const fg = kind === "pri" ? c.onGuide : on ? c.bg : c.ink;
  const shadow = disabled || on ? undefined : kind === "pri" ? glowShadow(c) : kind === "def" ? elev(c) : undefined;
  return (
    <Press
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: on }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={sm ? 6 : 2}
      style={style}
      inner={{ backgroundColor: bg, borderColor: kind === "pri" ? c.guide : on ? c.ink : kind === "ghost" ? "transparent" : c.line, borderWidth: 1, borderRadius: radius.pill, paddingVertical: sm ? 7 : 12, paddingHorizontal: sm ? 13 : 20, opacity: disabled ? 0.45 : 1, alignItems: "center", boxShadow: shadow }}
    >
      <Text style={{ color: fg, fontWeight: kind === "pri" ? "700" : "600", fontSize: sm ? 13 : 15 }}>{title}</Text>
    </Press>
  );
}

export function Chip({ text, color }: { text: string; color?: string }) {
  const c = useColors();
  return (
    <View style={{ borderWidth: 1, borderColor: c.glassLine, backgroundColor: c.glass, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 }}>
      <Text style={{ fontSize: 12, color: color || c.muted, fontWeight: "600" }}>{text}</Text>
    </View>
  );
}

export function LightBadge({ l }: { l: string }) {
  const c = useColors();
  return (
    <Row gap={5} wrap={false}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: lightColor(c, l) }} />
      <T v="small">{lightLabel(l)}</T>
    </Row>
  );
}

export function Bar({ value, color }: { value: number; color: string }) {
  const c = useColors();
  const width = useFill(value);
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value) }} style={{ height: 8, borderRadius: 4, backgroundColor: c.line, overflow: "hidden", flex: 1 }}>
      <Animated.View style={{ width, height: "100%", backgroundColor: color, borderRadius: 4 }} />
    </View>
  );
}

export type BoxKind = "kural" | "tuzak" | "puf" | "hatirla" | "senin" | "terim";
export function Box({ kind, title, children }: { kind: BoxKind; title: string; children: React.ReactNode }) {
  const c = useColors();
  const bg: Record<BoxKind, string> = { kural: c.blueSoft, terim: c.blueSoft, tuzak: c.badSoft, puf: c.markSoft, hatirla: c.okSoft, senin: c.guideSoft };
  return (
    <View style={{ backgroundColor: bg[kind], borderRadius: radius.opt, padding: 14, gap: 6 }}>
      <T v="small" style={{ fontWeight: "700" }}>{title}</T>
      {children}
    </View>
  );
}

/** **kalın** ve `kod` biçimli satır içi metin */
export function Inl({ text, v = "body", style }: { text: string; v?: TV; style?: StyleProp<TextStyle> }) {
  const parts = String(text || "").split(/(\*\*.+?\*\*|`.+?`)/g).filter(Boolean);
  return (
    <T v={v} style={style}>
      {parts.map((p, i) =>
        p.startsWith("**") ? (
          <Text key={i} style={{ fontWeight: "700" }}>{p.slice(2, -2)}</Text>
        ) : p.startsWith("`") ? (
          <Text key={i} style={{ fontFamily: "monospace" }}>{p.slice(1, -1)}</Text>
        ) : (
          p
        ),
      )}
    </T>
  );
}

/** Basit markdown: "- " madde, "## " başlık, paragraf */
export function Md({ src, v = "body" }: { src?: string; v?: TV }) {
  const lines = String(src || "").split(/\n/).map((l) => l.trim()).filter(Boolean);
  return (
    <View style={{ gap: 4 }}>
      {lines.map((l, i) =>
        /^[-•*] /.test(l) ? (
          <Row key={i} gap={6} wrap={false} style={{ alignItems: "flex-start" }}>
            <T v={v}>•</T>
            <View style={{ flex: 1 }}>
              <Inl text={l.slice(2)} v={v} />
            </View>
          </Row>
        ) : /^#{1,4} /.test(l) ? (
          <T key={i} v="h3" style={{ marginTop: 6 }}>{l.replace(/^#+ /, "")}</T>
        ) : (
          <Inl key={i} text={l} v={v} />
        ),
      )}
    </View>
  );
}

export function List({ items, ordered, v = "body" }: { items: string[]; ordered?: boolean; v?: TV }) {
  return (
    <View style={{ gap: 4 }}>
      {items.map((t, i) => (
        <Row key={i} gap={6} wrap={false} style={{ alignItems: "flex-start" }}>
          <T v={v}>{ordered ? `${i + 1}.` : "•"}</T>
          <View style={{ flex: 1 }}>
            <Inl text={t} v={v} />
          </View>
        </Row>
      ))}
    </View>
  );
}

/** Tablo: sütun genişlikleri eşit, satırlar sarılır */
export function Table({ cols, rows, firstBold }: { cols?: string[]; rows: React.ReactNode[][]; firstBold?: boolean }) {
  const c = useColors();
  const cell = (x: React.ReactNode, i: number, head?: boolean) => (
    <View key={i} style={{ flex: i === 0 && firstBold ? 0.8 : 1, padding: 6 }}>
      {typeof x === "string" || typeof x === "number" ? <Inl text={String(x)} v="small" style={head || (firstBold && i === 0) ? { fontWeight: "700" } : undefined} /> : x}
    </View>
  );
  return (
    <View style={{ borderWidth: 1, borderColor: c.line, borderRadius: 8, overflow: "hidden" }}>
      {cols && <View style={{ flexDirection: "row", backgroundColor: c.bg }}>{cols.map((x, i) => cell(x, i, true))}</View>}
      {rows.map((r, j) => (
        <View key={j} style={{ flexDirection: "row", borderTopWidth: cols || j ? 1 : 0, borderColor: c.line }}>
          {r.map((x, i) => cell(x, i))}
        </View>
      ))}
    </View>
  );
}

export function Seg<K extends string>({ items, value, onChange }: { items: [K, string][]; value: K; onChange: (k: K) => void }) {
  return (
    <Row gap={6}>
      {items.map(([k, l]) => (
        <Btn key={k} sm title={l} on={value === k} onPress={() => onChange(k)} />
      ))}
    </Row>
  );
}

export function Input(props: TextInputProps) {
  const c = useColors();
  return <TextInput placeholderTextColor={c.muted} {...props} style={[{ borderWidth: 1, borderColor: c.line, borderRadius: radius.input, paddingHorizontal: 14, paddingVertical: 11, color: c.ink, backgroundColor: c.paper, fontSize: 15 }, props.style]} />;
}

export function Empty({ text }: { text: string }) {
  const c = useColors();
  return (
    <View style={{ borderWidth: 1, borderStyle: "dashed", borderColor: c.line, borderRadius: radius.tile, padding: 20 }}>
      <T v="small" muted style={{ textAlign: "center" }}>{text}</T>
    </View>
  );
}

export function Notice({ text, warn }: { text: string; warn?: boolean }) {
  const c = useColors();
  return (
    <View style={{ backgroundColor: warn ? c.warnSoft : c.blueSoft, borderRadius: radius.opt, padding: 14 }}>
      <T v="small">{text}</T>
    </View>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 4, flexGrow: 1, minWidth: 130 }}>
      <T v="label">{label}</T>
      {children}
    </View>
  );
}

/* ---------- Bildirim baloncuğu ---------- */
type ToastMsg = { id: number; text: string };
let toasts: ToastMsg[] = [];
const tsubs = new Set<(t: ToastMsg[]) => void>();
export function toast(text: string, ms = 4200) {
  const m = { id: Date.now() + Math.random(), text };
  toasts = [...toasts, m];
  tsubs.forEach((f) => f(toasts));
  setTimeout(() => {
    toasts = toasts.filter((x) => x.id !== m.id);
    tsubs.forEach((f) => f(toasts));
  }, ms);
}
export function Toasts() {
  const c = useColors();
  const [list, setList] = useState<ToastMsg[]>([]);
  useEffect(() => {
    tsubs.add(setList);
    return () => {
      tsubs.delete(setList);
    };
  }, []);
  if (!list.length) return null;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 16, right: 16, bottom: 90, gap: 8 }}>
      {list.map((m) => (
        <FadeIn key={m.id} y={16} style={{ backgroundColor: c.ink, borderRadius: radius.tile, paddingVertical: 12, paddingHorizontal: 16, boxShadow: elev(c, 2) }}>
          <Text style={{ color: c.bg, fontSize: 14, fontWeight: "500" }}>{m.text}</Text>
        </FadeIn>
      ))}
    </View>
  );
}

/** 0'dan hedefe sayan sayı (skorlar için) */
export function Count({ to, v = "big", color, suffix = "" }: { to: number; v?: TV; color?: string; suffix?: string }) {
  const n = useCountUp(to);
  return <T v={v} color={color}>{n}{suffix}</T>;
}

export const st = StyleSheet.create({
  screen: { padding: 16, gap: 16, paddingBottom: 120 },
});

export type { Colors };
