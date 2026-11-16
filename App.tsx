// Optik Sınav Koçu (YDS) — ana kabuk: üst çubuk, sekmeler, tam ekran oynatıcı, pencereler
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { Modal, Text, useColorScheme, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { diffDays, today } from "./src/lib/dates";
import { nav, useNav } from "./src/lib/nav";
import { syncReminders } from "./src/lib/notify";
import { load, S, useStore } from "./src/lib/store";
import { MockPlayer } from "./src/players/MockPlayer";
import { SessionPlayer } from "./src/players/SessionPlayer";
import { DrillPlayer, PlacementPlayer, VocabReviewPlayer } from "./src/players/SmallPlayers";
import { Defter } from "./src/screens/Defter";
import { Mock } from "./src/screens/Mock";
import { Modals } from "./src/screens/Modals";
import { Plan } from "./src/screens/Plan";
import { Progress } from "./src/screens/Progress";
import { Today } from "./src/screens/Today";
import { Vocab } from "./src/screens/Vocab";
import { Btn, T, Toasts } from "./src/ui/kit";
import { FadeIn } from "./src/ui/motion";
import { TabBar } from "./src/ui/TabBar";
import { useColors } from "./src/ui/theme";

function Brand() {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <View style={{ flexDirection: "row", gap: 3 }}>
        {[0, 1, 2].map((i) => <View key={i} style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: c.guide, backgroundColor: i === 1 ? c.guide : "transparent" }} />)}
      </View>
      <Text style={{ fontSize: 18, fontWeight: "800", color: c.ink }}>Optik</Text>
    </View>
  );
}

function Main() {
  const c = useColors();
  const n = useNav();
  const s = useStore();
  const left = diffDays(today(), s.profile.examDate);
  const Screen = { bugun: Today, plan: Plan, defter: Defter, kelimeler: Vocab, deneme: Mock, ilerleme: Progress }[n.tab];
  const p = n.player;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.paper }} edges={["top"]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderColor: c.line, backgroundColor: c.paper }}>
        <Brand />
        <View style={{ flex: 1 }} />
        {s.profile.examSet && left >= 0 ? <T v="mono" color={c.guide}>{left} gün kaldı</T> : null}
        <Btn sm kind="ghost" title="Ayarlar" onPress={() => nav.modal({ kind: "settings" })} />
      </View>
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <FadeIn key={n.tab} y={8} duration={200} style={{ flex: 1 }}>
          <Screen />
        </FadeIn>
      </View>
      <SafeAreaView edges={["bottom"]} style={{ backgroundColor: c.paper, borderTopWidth: 1, borderColor: c.line }}>
        <TabBar value={n.tab} onChange={(t) => nav.tab(t)} />
      </SafeAreaView>
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
    load().then(() => {
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
