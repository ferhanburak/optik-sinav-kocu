// Deneme: tür seçimi ve geçmiş denemeler
import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { MOCK_MODES, SECTIONS, type MockMode } from "../data/catalog";
import { fmtShort } from "../lib/dates";
import { mockLayout } from "../lib/engine";
import { nav } from "../lib/nav";
import { useStore } from "../lib/store";
import { Btn, Card, Empty, Row, T, Table, st } from "../ui/kit";

export function Mock() {
  const s = useStore();
  const [mode, setMode] = useState<MockMode>("full");
  const md = MOCK_MODES[mode];
  return (
    <ScrollView contentContainerStyle={st.screen}>
      <View>
        <T v="h2">Deneme</T>
        <T v="small" muted>Gerçek YDS dağılımında. Sayaç ileri sayar; 🔖 Sonra dön ve ★ Emin değilim işaretleri analize girer. 40. sorunun zamanı otomatik kaydedilir.</T>
      </View>
      <Card>
        <View style={{ gap: 6 }}>
          {(Object.entries(MOCK_MODES) as [MockMode, (typeof MOCK_MODES)[MockMode]][]).map(([k, v]) => (
            <Btn key={k} on={mode === k} title={`${v.l} · ${v.n} soru · ${v.min} dk`} onPress={() => setMode(k)} />
          ))}
        </View>
        <T v="small" muted>Bölümler: {mockLayout(mode).map(([sec, n]) => `${SECTIONS[sec]} ${n}`).join(" · ")}</T>
        <T v="small" muted>Zaman kontrol noktaları: 16. soru ~20 dk · 26. soru ~35 dk · 40. soru ~60 dk.</T>
        {mode === "full" ? <T v="small" muted>Hazır soru bankası şimdilik tam denemenin okuma bölümünün 12 sorusunu karşılıyor; tam deneme 72 soruyla başlar.</T> : null}
        <Row><Btn kind="pri" title={`${md.l}yı başlat`} onPress={() => nav.open({ kind: "mock", mode })} /></Row>
      </Card>
      <Card>
        <T v="h3">Geçmiş denemeler</T>
        {s.mocks.length ? (
          <Table cols={["Tarih", "Tür", "Doğru", "Puan", "40. soru"]} rows={s.mocks.slice().reverse().map((m) => [fmtShort(m.date), m.label, `${m.c}/${m.n}`, `**${m.score}**`, m.t40 ? `${Math.round(m.t40 / 60)} dk` : "—"])} />
        ) : (
          <Empty text="Henüz deneme yok." />
        )}
      </Card>
    </ScrollView>
  );
}
