// Renkler: optik form kâğıdı + pembe kılavuz mürekkebi (web sürümüyle aynı)
import { useColorScheme } from "react-native";

const light = {
  bg: "#F6F7F9", paper: "#FFFFFF", ink: "#1C2333", muted: "#5E6678", line: "#E4E1E6",
  guide: "#C8325A", guideSoft: "#FBE6EC", guideLine: "#F1BFCD",
  mark: "#F3D34A", markSoft: "#FDF5D3", ok: "#1E8E5A", okSoft: "#DFF3E8", bad: "#C23B2E", badSoft: "#FBE3E0", warn: "#B7791F", warnSoft: "#FBF0DC",
  blue: "#3B5BDB", blueSoft: "#E6EBFB",
};
const dark: typeof light = {
  bg: "#12141A", paper: "#1A1D25", ink: "#E7E9EF", muted: "#9CA3B4", line: "#2B2F3A",
  guide: "#F0728F", guideSoft: "#3A1E28", guideLine: "#5A2C3B",
  mark: "#E9C93E", markSoft: "#3A3318", ok: "#4CC38A", okSoft: "#173528", bad: "#F07264", badSoft: "#3A1E1B", warn: "#E3A84A", warnSoft: "#3A2D17",
  blue: "#7C97FF", blueSoft: "#1E2742",
};
export type Colors = typeof light;

export function useColors(): Colors {
  return useColorScheme() === "dark" ? dark : light;
}

export const lightColor = (c: Colors, l: string) => (l === "red" ? c.bad : l === "yellow" ? c.warn : l === "green" ? c.ok : c.line);
export const levelColor = (c: Colors, a: number) => (a >= 0.75 ? c.ok : a >= 0.55 ? c.warn : c.bad);
