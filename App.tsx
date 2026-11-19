// Optik — ana kabuk: sınav seçimi → seçilen sınavın menüsü (üst çubuk, sekmeler), tam ekran oynatıcı, pencereler
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { Modal, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { examName } from "./src/data/exams";
import { loadNav, nav, useNav } from "./src/lib/nav";
import { syncReminders } from "./src/lib/notify";
import { applyPending } from "./src/lib/plan";
import { load, S } from "./src/lib/store";
import { initCloud } from "./src/lib/cloud";
import { MockPlayer } from "./src/players/MockPlayer";
import { SessionPlayer } from "./src/players/SessionPlayer";
import { DrillPlayer, PlacementPlayer, VocabReviewPlayer } from "./src/players/SmallPlayers";
import { Defter } from "./src/screens/Defter";
import { ExamSelect } from "./src/screens/ExamSelect";
import { Mock } from "./src/screens/Mock";
import { Modals } from "./src/screens/Modals";
import { Plan } from "./src/screens/Plan";
import { Progress } from "./src/screens/Progress";
import { Today } from "./src/screens/Today";
import { Backdrop } from "./src/ui/Backdrop";
import { Brand } from "./src/ui/Brand";
import { Btn, Toasts } from "./src/ui/kit";
import { FadeIn, Press } from "./src/ui/motion";
import { TabBar, TabIcon, type IconId } from "./src/ui/TabBar";
import { elev, useColors, useDark } from "./src/ui/theme";

/** Üst çubuktaki yuvarlak simge düğmesi (cam) */
function IconBtn({ icon, label, onPress }: { icon: IconId; label: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Press accessibilityRole="button" accessibilityLabel={label} hitSlop={6} onPress={onPress} inner={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: c.paper, borderColor: c.line, borderWidth: 1, boxShadow: elev(c) }}>
      <TabIcon id={icon} color={c.ink} size={18} />
    </Press>
  );
}

function Main() {
  const c = useColors();
  const n = useNav();
  const Screen = { bugun: Today, plan: Plan, deneme: Mock, defter: Defter, ilerleme: Progress }[n.tab];
  const p = n.player;

  // Sınav seçilmediyse ilk ekran sınav seçimi
  if (!n.exam)
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top", "bottom"]}>
        <Backdrop />
        <FadeIn key="sinav" y={8} duration={200} style={{ flex: 1 }}>
          <ExamSelect />
        </FadeIn>
        <Modals />
        <Toasts />
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={["top"]}>
      <Backdrop />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 }}>
        <Brand />
        <View style={{ flex: 1 }} />
        <Btn sm title="‹ Sınavlarım" onPress={() => nav.exam(null)} />
        <IconBtn icon="ayar" label={`${examName(n.exam)} ayarları`} onPress={() => nav.modal({ kind: "settings" })} />
        <IconBtn icon="profil" label="Profil" onPress={() => nav.modal({ kind: "profile" })} />
      </View>
      <View style={{ flex: 1 }}>
        <FadeIn key={n.tab} y={8} duration={200} style={{ flex: 1 }}>
          <Screen />
        </FadeIn>
      </View>
      <TabBar value={n.tab} onChange={(t) => nav.tab(t)} />
      <Modal visible={!!p} animationType="slide" onRequestClose={() => nav.close()}>
        <SafeAreaProvider>
          {p?.kind === "session" ? <SessionPlayer sk={p.sk} review={p.review} /> : p?.kind === "drill" ? <DrillPlayer f={p.f} /> : p?.kind === "place" ? <PlacementPlayer /> : p?.kind === "mock" ? <MockPlayer mode={p.mode} /> : p?.kind === "vrev" ? <VocabReviewPlayer /> : null}
          <Toasts />
        </SafeAreaProvider>
      </Modal>
      <Modals />
      <Toasts />
    </SafeAreaView>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const dark = useDark();
  useEffect(() => {
    load()
      .then(() => loadNav(S.onboarded || S.sessions.length > 0 || S.attempts.length > 0))
      .then(() => {
      applyPending(); // dünden bekleyen plan değişikliği varsa bugün geçerli olur
      setReady(true);
      initCloud(); // girişliyse buluttaki veriyle eşitler
      if (S.profile.remind) syncReminders(false); // izin daha önce verildiyse saatleri tazeler; ilk açılışta izin sormaz
    });
  }, []);
  return (
    <SafeAreaProvider>
      <StatusBar style={dark ? "light" : "dark"} />
      {ready ? <Main /> : null}
    </SafeAreaProvider>
  );
}
