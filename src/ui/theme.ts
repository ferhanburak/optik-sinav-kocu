// Tasarım değerleri.
// Yaklaşım: "yumuşak cam". Çerçeve (üst çubuk, sekmeler, özet kutuları) yarı saydam cam; okuma yüzeyleri (soru, konu anlatımı)
// düz ve yüksek kontrastlı; ana düğmelerde hafif kabartma ve vurgu rengi halesi. Vurgu rengi optik formun pembe kılavuz mürekkebi.
import { useColorScheme } from "react-native";

const light = {
  // zemin ve yüzeyler
  bg: "#F4F2EE", paper: "#FFFFFF", ink: "#1B2030", muted: "#5B6376", line: "#E6E2DB",
  glass: "rgba(255,255,255,0.64)", glassStrong: "rgba(255,255,255,0.86)", glassLine: "rgba(255,255,255,0.95)",
  // zemindeki ışık haleleri
  glowA: "#E0527A", glowAOp: 0.2, glowB: "#6C7BFF", glowBOp: 0.14,
  // vurgu
  guide: "#C8325A", guideSoft: "#FBE6EC", guideLine: "#F1BFCD", onGuide: "#FFFFFF", guideGlow: "rgba(200,50,90,0.30)",
  // anlam renkleri
  mark: "#F3D34A", markSoft: "#FDF5D3", ok: "#1E8E5A", okSoft: "#DFF3E8", bad: "#C23B2E", badSoft: "#FBE3E0", warn: "#B7791F", warnSoft: "#FBF0DC",
  blue: "#3B5BDB", blueSoft: "#E6EBFB",
  shadow: "rgba(27,32,48,0.10)", shadowStrong: "rgba(27,32,48,0.16)", shine: "rgba(255,255,255,0.45)",
};
const dark: typeof light = {
  bg: "#0F1118", paper: "#1A1D27", ink: "#EEF0F6", muted: "#9AA1B5", line: "#2B2F3C",
  glass: "rgba(255,255,255,0.06)", glassStrong: "rgba(24,27,37,0.82)", glassLine: "rgba(255,255,255,0.13)",
  glowA: "#F2718F", glowAOp: 0.2, glowB: "#6E7DFF", glowBOp: 0.14,
  guide: "#F2718F", guideSoft: "#3A1F2A", guideLine: "#5A2C3B", onGuide: "#1D0C12", guideGlow: "rgba(242,113,143,0.32)",
  mark: "#E9C93E", markSoft: "#3A3318", ok: "#4CC38A", okSoft: "#173528", bad: "#F07264", badSoft: "#3A1E1B", warn: "#E3A84A", warnSoft: "#3A2D17",
  blue: "#7C97FF", blueSoft: "#1E2742",
  shadow: "rgba(0,0,0,0.35)", shadowStrong: "rgba(0,0,0,0.5)", shine: "rgba(255,255,255,0.22)",
};
export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === "dark" ? dark : light;
}

/** Boşluk ölçeği (8'lik ızgara) */
export const sp = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 };
/** Köşe yuvarlaklıkları */
export const radius = { input: 12, opt: 14, tile: 18, card: 20, sheet: 26, pill: 999 };

/** Gölge: 1 = kart, 2 = yüzen yüzey (sekme çubuğu, pencere) */
export const elev = (c: Colors, level: 1 | 2 = 1) => (level === 1 ? `0px 2px 12px ${c.shadow}` : `0px 12px 32px ${c.shadowStrong}`);
/** Ana düğme: vurgu halesi + üst kenarda ince parlaklık (hafif kabartma) */
export const glowShadow = (c: Colors) => `0px 8px 20px ${c.guideGlow}, inset 0px 1px 0px ${c.shine}`;

export const lightColor = (c: Colors, l: string) => (l === "red" ? c.bad : l === "yellow" ? c.warn : l === "green" ? c.ok : c.line);
export const levelColor = (c: Colors, a: number) => (a >= 0.75 ? c.ok : a >= 0.55 ? c.warn : c.bad);
