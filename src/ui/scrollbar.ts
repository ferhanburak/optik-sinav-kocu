// Web: tarayıcının varsayılan gri kaydırma çubuğu yerine temaya uyan ince çubuk.
// Telefonda sistemin kendi ince çubuğu kullanılır; orada bir şey yapmaz.
import { useEffect } from "react";
import { Platform } from "react-native";
import { useColors } from "./theme";

export function useWebScrollbar() {
  const c = useColors();
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    let el = document.getElementById("optik-scrollbar") as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = "optik-scrollbar";
      document.head.appendChild(el);
    }
    el.textContent = `
* { scrollbar-width: thin; scrollbar-color: ${c.guideLine} transparent; }
*::-webkit-scrollbar { width: 8px; height: 8px; }
*::-webkit-scrollbar-track { background: transparent; }
*::-webkit-scrollbar-thumb { background: ${c.guideLine}; border-radius: 999px; border: 2px solid transparent; background-clip: content-box; }
*::-webkit-scrollbar-thumb:hover { background: ${c.guide}; background-clip: content-box; }
*::-webkit-scrollbar-corner { background: transparent; }`;
  }, [c]);
}
