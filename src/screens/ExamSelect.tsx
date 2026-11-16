// Sınav seçimi: uygulamanın ilk ekranı. Hazır sınav öne çıkar, diğerleri "Yakında" olarak 2 sütunda durur.
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { BANK_ALL, LESSONS } from "../content";
import { EXAMS, type Exam } from "../data/exams";
import { fmtShort } from "../lib/dates";
import { nav } from "../lib/nav";
import { useStore } from "../lib/store";
import { Brand } from "../ui/Brand";
import { Chip, Row, T, st, toast } from "../ui/kit";
import { FadeIn, Press, haptic } from "../ui/motion";
import { TabIcon } from "../ui/TabBar";
import { elev, radius, useColors } from "../ui/theme";

function ExamTile({ x, i }: { x: Exam; i: number }) {
  const c = useColors();
  return (
    <FadeIn delay={160 + i * 50} style={{ flexBasis: "46%", flexGrow: 1 }}>
      <Press
        accessibilityRole="button"
        accessibilityLabel={`${x.name}. ${x.desc}. Yakında.`}
        onPress={() => toast(`${x.name} henüz hazır değil. Hazır olunca burada açılacak.`)}
        style={{ flex: 1 }}
        inner={{ flex: 1, minHeight: 104, backgroundColor: c.glass, borderColor: c.glassLine, borderWidth: 1, borderRadius: radius.tile, padding: 14, gap: 6, opacity: 0.72 }}
      >
        <Row>
          <T v="h3">{x.name}</T>
          <Chip text="Yakında" />
        </Row>
        <T v="small" muted>{x.desc}</T>
      </Press>
    </FadeIn>
  );
}

export function ExamSelect() {
  const c = useColors();
  const s = useStore();
  const ready = EXAMS.filter((x) => x.ready);
  const soon = EXAMS.filter((x) => !x.ready);
  const last = s.sessions[s.sessions.length - 1];
  return (
    <ScrollView contentContainerStyle={[st.screen, { paddingTop: 24, paddingBottom: 48 }]} showsVerticalScrollIndicator={false}>
      <FadeIn>
        <Brand size={26} />
      </FadeIn>
      <FadeIn delay={60} style={{ gap: 6, marginTop: 8 }}>
        <Text style={{ fontSize: 28, fontWeight: "800", color: c.ink, letterSpacing: -0.6, lineHeight: 34 }}>Hangi sınava hazırlanıyorsun?</Text>
        <T muted>Her sınavın kendi konuları, soru bankası ve çalışma defteri var. İstediğin zaman değiştirebilirsin.</T>
      </FadeIn>

      {ready.map((x, i) => (
        <FadeIn key={x.id} delay={110 + i * 50}>
          <Press
            accessibilityRole="button"
            accessibilityLabel={`${x.name}. ${x.desc}. Aç.`}
            onPress={() => {
              haptic.tap();
              nav.exam(x.id);
            }}
            inner={{ backgroundColor: c.paper, borderColor: c.guideLine, borderWidth: 1, borderRadius: radius.sheet, padding: 18, gap: 12, boxShadow: elev(c, 2) }}
          >
            <Row wrap={false} gap={14}>
              <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: c.guideSoft, alignItems: "center", justifyContent: "center" }}>
                <TabIcon id="deneme" color={c.guide} size={26} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 24, fontWeight: "800", color: c.ink, letterSpacing: -0.4 }}>{x.name}</Text>
                <T v="small" muted>{x.desc}</T>
              </View>
              <Text style={{ fontSize: 26, color: c.guide, fontWeight: "700" }}>›</Text>
            </Row>
            <Row gap={6}>
              <Chip text={`${Object.keys(LESSONS).length} konu`} />
              <Chip text={`${BANK_ALL.length} soru`} />
              <Chip text="deneme" />
              <Chip text="çalışma defteri" />
            </Row>
            {last ? <T v="small" color={c.guide} style={{ fontWeight: "600" }}>Kaldığın yerden devam et · {s.sessions.length} oturum, son {fmtShort(last.date)}</T> : null}
          </Press>
        </FadeIn>
      ))}

      <T v="label" color={c.guide} style={{ marginTop: 8 }}>Yakında</T>
      <Row gap={8} style={{ alignItems: "stretch" }}>
        {soon.map((x, i) => <ExamTile key={x.id} x={x} i={i} />)}
      </Row>
    </ScrollView>
  );
}
