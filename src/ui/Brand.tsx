// Logo: üç optik balon (ortadaki işaretli) + ad
import React from "react";
import { Text, View } from "react-native";
import { useColors } from "./theme";

export function Brand({ size = 20 }: { size?: number }) {
  const c = useColors();
  const d = size / 2;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: d * 0.8 }}>
      <View style={{ flexDirection: "row", gap: d * 0.3 }}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={{ width: d, height: d, borderRadius: d / 2, borderWidth: 1.5, borderColor: c.guide, backgroundColor: i === 1 ? c.guide : "transparent" }} />
        ))}
      </View>
      <Text style={{ fontSize: size, fontWeight: "800", color: c.ink, letterSpacing: -0.4 }}>Optik</Text>
    </View>
  );
}
