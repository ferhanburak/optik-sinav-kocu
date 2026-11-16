// Sınavlarım: uygulamanın merkezi. Hem ilk ekran hem de her sınavın menüsünden dönülen yer.
//   üstte profil → eklenen sınavlar (durumlarıyla) → sınav ekle (hazır olanlar) → yakında
import React from "react";
import { ScrollView, Text, View } from "react-native";
import { BANK_ALL, LESSONS } from "../content";
import { EXAMS, type Exam } from "../data/exams";
import { diffDays, fmtShort, today } from "../lib/dates";
import { sessionsOn, streakDays } from "../lib/engine";
import { nav, useNav } from "../lib/nav";
import { useStore } from "../lib/store";
import type { State } from "../types";
import { Brand } from "../ui/Brand";
import { Chip, Row, T, st, toast } from "../ui/kit";
import { FadeIn, Press, haptic } from "../ui/motion";
import { TabIcon } from "../ui/TabBar";
import { elev, radius, useColors } from "../ui/theme";

/** Eklenen sınavın kısa durumu. Şimdilik çalışma verisi yalnızca YDS için tutuluyor. */
function examStatus(id: string, s: State): { left: number | null; today: string; todayDone: boolean; last: string | null; streak: number } | null {
  if (id !== "yds") return null;
  const done = sessionsOn(today()).length > 0;
  const skipped = s.skips.includes(today());
  const last = s.sessions[s.sessions.length - 1];
  const left = s.profile.examSet ? diffDays(today(), s.profile.examDate) : null;
  return {
    left: left !== null && left >= 0 ? left : null,
    today: done ? "Bugün tamam" : skipped ? "Bugün atlandı" : s.sessions.length ? "Bugünün oturumu bekliyor" : "Henüz başlamadın",
    todayDone: done,
    last: last ? `Son: ${last.c}/${last.n} · ${fmtShort(last.date)}` : null,
    streak: streakDays(),
  };
}

function MyExam({ x, i }: { x: Exam; i: number }) {
  const c = useColors();
  const s = useStore();
  const stt = examStatus(x.id, s);
  return (
    <FadeIn delay={110 + i * 50}>
      <Press
        accessibilityRole="button"
        accessibilityLabel={`${x.name}. ${stt ? stt.today : x.desc}. Aç.`}
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
          {stt && stt.left !== null ? (
            <View style={{ alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.opt, backgroundColor: c.guideSoft }}>
              <Text style={{ fontSize: 20, fontWeight: "800", color: c.guide, fontVariant: ["tabular-nums"] }}>{stt.left}</Text>
              <Text style={{ fontSize: 10, fontWeight: "600", color: c.guide }}>gün</Text>
            </View>
          ) : (
            <Text style={{ fontSize: 26, color: c.guide, fontWeight: "700" }}>›</Text>
          )}
        </Row>
        {stt ? (
          <Row gap={6}>
            <Chip text={stt.today} color={stt.todayDone ? c.ok : c.guide} />
            {stt.last ? <Chip text={stt.last} /> : null}
            {stt.streak > 1 ? <Chip text={`${stt.streak} gün seri`} /> : null}
          </Row>
        ) : null}
      </Press>
    </FadeIn>
  );
}

function AddExam({ x, i }: { x: Exam; i: number }) {
  const c = useColors();
  return (
    <FadeIn delay={160 + i * 50} style={{ flexBasis: x.ready ? "100%" : "46%", flexGrow: 1 }}>
      <Press
        accessibilityRole="button"
        accessibilityLabel={`${x.name}. ${x.desc}. ${x.ready ? "Ekle." : "Yakında."}`}
        onPress={() => {
          if (!x.ready) return toast(`${x.name} henüz hazır değil. Hazır olunca buradan ekleyebileceksin.`);
          haptic.tap();
          nav.exam(x.id);
        }}
        style={{ flex: 1 }}
        inner={{ flex: 1, minHeight: x.ready ? undefined : 104, backgroundColor: x.ready ? c.paper : c.glass, borderColor: x.ready ? c.guideLine : c.glassLine, borderWidth: 1, borderRadius: radius.tile, padding: 14, gap: 6, opacity: x.ready ? 1 : 0.72, boxShadow: x.ready ? elev(c) : undefined }}
      >
        <Row>
          <T v="h3">{x.name}</T>
          <Chip text={x.ready ? "+ Ekle" : "Yakında"} color={x.ready ? c.guide : undefined} />
        </Row>
        <T v="small" muted>{x.desc}</T>
        {x.ready && x.id === "yds" ? <T v="small" muted>{Object.keys(LESSONS).length} konu · {BANK_ALL.length} soru · deneme · çalışma defteri</T> : null}
      </Press>
    </FadeIn>
  );
}

export function ExamSelect() {
  const c = useColors();
  const n = useNav();
  const mine = EXAMS.filter((x) => n.exams.includes(x.id));
  const addable = EXAMS.filter((x) => x.ready && !n.exams.includes(x.id));
  const soon = EXAMS.filter((x) => !x.ready);
  const initial = n.name ? n.name.trim().charAt(0).toLocaleUpperCase("tr-TR") : "";
  return (
    <ScrollView contentContainerStyle={[st.screen, { paddingTop: 16, paddingBottom: 48 }]} showsVerticalScrollIndicator={false}>
      <FadeIn>
        <Row wrap={false}>
          <Brand size={24} />
          <View style={{ flex: 1 }} />
          <Press
            accessibilityRole="button"
            accessibilityLabel="Profil ve ayarlar"
            hitSlop={8}
            onPress={() => nav.modal({ kind: "profile" })}
            inner={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: c.glass, borderColor: c.glassLine, borderWidth: 1, borderRadius: radius.pill, paddingVertical: 5, paddingLeft: 5, paddingRight: 12 }}
          >
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.guideSoft, alignItems: "center", justifyContent: "center" }}>
              {initial ? <Text style={{ fontSize: 14, fontWeight: "800", color: c.guide }}>{initial}</Text> : <ProfileIcon color={c.guide} />}
            </View>
            <Text style={{ fontSize: 13, fontWeight: "600", color: c.ink }}>Profil</Text>
          </Press>
        </Row>
      </FadeIn>

      <FadeIn delay={60} style={{ gap: 6, marginTop: 8 }}>
        <Text style={{ fontSize: 28, fontWeight: "800", color: c.ink, letterSpacing: -0.6, lineHeight: 34 }}>
          {mine.length ? (n.name ? `Merhaba ${n.name}` : "Sınavlarım") : "Hangi sınava hazırlanıyorsun?"}
        </Text>
        <T muted>{mine.length ? "Çalışmak istediğin sınavı seç. Her sınavın kendi konuları, ayarları ve çalışma defteri var." : "Bir sınav ekleyerek başla. Sonradan başka sınavlar da ekleyebilirsin."}</T>
      </FadeIn>

      {mine.map((x, i) => <MyExam key={x.id} x={x} i={i} />)}

      {addable.length ? (
        <>
          <T v="label" color={c.guide} style={{ marginTop: 8 }}>Sınav ekle</T>
          <Row gap={8} style={{ alignItems: "stretch" }}>
            {addable.map((x, i) => <AddExam key={x.id} x={x} i={i} />)}
          </Row>
        </>
      ) : null}

      <T v="label" color={c.guide} style={{ marginTop: 8 }}>Yakında</T>
      <Row gap={8} style={{ alignItems: "stretch" }}>
        {soon.map((x, i) => <AddExam key={x.id} x={x} i={i + addable.length} />)}
      </Row>
    </ScrollView>
  );
}

function ProfileIcon({ color }: { color: string }) {
  // baş + omuz: iki basit şekil
  return (
    <View style={{ alignItems: "center", gap: 2 }}>
      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: color }} />
      <View style={{ width: 16, height: 7, borderTopLeftRadius: 8, borderTopRightRadius: 8, backgroundColor: color }} />
    </View>
  );
}
