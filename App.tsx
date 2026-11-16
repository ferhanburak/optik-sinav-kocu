// Optik — ana kabuk: sınav seçimi → seçilen sınavın menüsü (üst çubuk, sekmeler), tam ekran oynatıcı, pencereler
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { Modal, useColorScheme, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { examName } from "./src/data/exams";
import { loadNav, nav, useNav } from "./src/lib/nav";
import { syncReminders } from "./src/lib/notify";
import { load, S } from "./src/lib/store";
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
import { Vocab } from "./src/screens/Vocab";
import { Backdrop } from "./src/ui/Backdrop";
import { Brand } from "./src/ui/Brand";
import { Btn, Toasts } from "./src/ui/kit";
import { FadeIn } from "./src/ui/motion";
import { TabBar } from "./src/ui/TabBar";
import { useColors } from "./src/ui/theme";

function Main() {
  const c = useColors();
  const n = useNav();
  const Screen = { bugun: Today, plan: Plan, defter: Defter, kelimeler: Vocab, deneme: Mock, ilerleme: Progress }[n.tab];
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
        <Btn sm title={`${examName(n.exam)} ayarları`} onPress={() => nav.modal({ kind: "settings" })} />
      </View>
      <View style={{ flex: 1 }}>
        <FadeIn key={n.tab} y={8} duration={200} style={{ flex: 1 }}>
          <Screen />
        </FadeIn>
      </View>
      <TabBar value={n.tab} onChange={(t) => nav.tab(t)} />
      <Modal visible={!!p} animationType="slide" onRequestClose={() => nav.close()}>
        <SafeAreaProvider>
          {p?.kind === "session" ? <SessionPlayer sk={p.sk} /> : p?.kind === "drill" ? <DrillPlayer f={p.f} /> : p?.kind === "place" ? <PlacementPlayer /> : p?.kind === "mock" ? <MockPlayer mode={p.mode} /> : p?.kind === "vrev" ? <VocabReviewPlayer /> : null}
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
  const scheme = useColorScheme();
  useEffect(() => {
    load()
      .then(() => loadNav(S.onboarded || S.sessions.length > 0 || S.attempts.length > 0))
      .then(() => {
      setReady(true);
      if (S.profile.remind) syncReminders(false); // izin daha önce verildiyse saatleri tazeler; ilk açılışta izin sormaz
    });
  }, []);
  return (
    <SafeAreaProvider>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      {ready ? <Main /> : null}
    </SafeAreaProvider>
  );
}
