// Alt sekme çubuğu: içeriğin üstünde yüzen cam bir hap. Seçili sekmenin arkasında kayan yumuşak bir vurgu var.
import { BlurView } from "expo-blur";
import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Path, Rect } from "react-native-svg";
import type { Tab } from "../lib/nav";
import { ND, Press, haptic, motionOff } from "./motion";
import { elev, useColors } from "./theme";

export const TABS: [Tab, string][] = [
  ["bugun", "Bugün"],
  ["plan", "Plan"],
  ["defter", "Defter"],
  ["kelimeler", "Kelimeler"],
  ["deneme", "Deneme"],
  ["ilerleme", "İlerleme"],
];

export type IconId = Tab | "hedef";

export function TabIcon({ id, color, size = 22 }: { id: IconId; color: string; size?: number }) {
  const p = { stroke: color, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {id === "bugun" ? (
        <>
          <Circle cx={12} cy={12} r={4} {...p} />
          <Path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" {...p} />
        </>
      ) : id === "plan" ? (
        <>
          <Rect x={3} y={5} width={18} height={16} rx={2} {...p} />
          <Path d="M3 10h18M8 3v4M16 3v4" {...p} />
        </>
      ) : id === "defter" ? (
        <>
          <Path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" {...p} />
          <Path d="M4 19V5M9 7h6M9 11h6" {...p} />
        </>
      ) : id === "kelimeler" ? (
        <Path d="M4 7V5h16v2M9 19h6M12 5v14" {...p} />
      ) : id === "deneme" ? (
        <>
          <Circle cx={7} cy={7} r={2.5} {...p} />
          <Circle cx={17} cy={7} r={2.5} {...p} />
          <Circle cx={7} cy={17} r={2.5} {...p} />
          <Circle cx={17} cy={17} r={2.5} {...p} fill={color} />
        </>
      ) : id === "hedef" ? (
        <>
          <Circle cx={12} cy={12} r={9} {...p} />
          <Circle cx={12} cy={12} r={5} {...p} />
          <Circle cx={12} cy={12} r={1.5} {...p} fill={color} />
        </>
      ) : (
        <Path d="M3 17l6-6 4 4 8-8M15 7h6v6" {...p} />
      )}
    </Svg>
  );
}

/** Sekme çubuğunun içerik üstünde kapladığı yükseklik (ekranların alt boşluğu için) */
export const TAB_BAR_SPACE = 96;

export function TabBar({ value, onChange }: { value: Tab; onChange: (t: Tab) => void }) {
  const c = useColors();
  const dark = useColorScheme() === "dark";
  const insets = useSafeAreaInsets();
  const [w, setW] = useState(0);
  const idx = TABS.findIndex(([id]) => id === value);
  const x = useRef(new Animated.Value(idx)).current;
  useEffect(() => {
    if (motionOff()) x.setValue(idx);
    else Animated.spring(x, { toValue: idx, useNativeDriver: ND, speed: 20, bounciness: 7 }).start();
  }, [idx]);
  const tw = w / TABS.length;
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 12, right: 12, bottom: Math.max(insets.bottom, 10) }}>
      <View style={{ borderRadius: 28, borderWidth: 1, borderColor: c.glassLine, overflow: "hidden", boxShadow: elev(c, 2) }}>
        <BlurView intensity={48} tint={dark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: c.glassStrong }]} />
        <View accessibilityRole="tablist" onLayout={(e) => setW(e.nativeEvent.layout.width)} style={{ flexDirection: "row", paddingVertical: 6 }}>
          {w ? (
            <Animated.View
              style={{ position: "absolute", top: 6, bottom: 6, left: 4, width: tw - 8, borderRadius: 22, backgroundColor: c.guideSoft, transform: [{ translateX: x.interpolate({ inputRange: [0, TABS.length - 1], outputRange: [0, tw * (TABS.length - 1)] }) }] }}
            />
          ) : null}
          {TABS.map(([id, l]) => {
            const on = value === id;
            return (
              <Press
                key={id}
                accessibilityRole="tab"
                accessibilityLabel={l}
                accessibilityState={{ selected: on }}
                onPress={() => {
                  if (!on) haptic.tap();
                  onChange(id);
                }}
                scaleTo={0.9}
                style={{ flex: 1 }}
                inner={{ alignItems: "center", paddingVertical: 7, gap: 2 }}
              >
                <TabIcon id={id} color={on ? c.guide : c.muted} />
                <Text numberOfLines={1} style={{ fontSize: 10, fontWeight: on ? "700" : "500", color: on ? c.ink : c.muted }}>{l}</Text>
              </Press>
            );
          })}
        </View>
      </View>
    </View>
  );
}
