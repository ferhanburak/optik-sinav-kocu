// Zemin: düz renk üstünde iki yumuşak ışık halesi (sol üstte vurgu rengi, sağda soğuk ton). Cam yüzeyler bunun üstünde durur.
import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { useColors } from "./theme";

export function Backdrop() {
  const c = useColors();
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id="glowA" cx="8%" cy="2%" r="70%">
            <Stop offset="0" stopColor={c.glowA} stopOpacity={c.glowAOp} />
            <Stop offset="1" stopColor={c.glowA} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="glowB" cx="100%" cy="58%" r="62%">
            <Stop offset="0" stopColor={c.glowB} stopOpacity={c.glowBOp} />
            <Stop offset="1" stopColor={c.glowB} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={c.bg} />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#glowA)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#glowB)" />
      </Svg>
    </View>
  );
}
