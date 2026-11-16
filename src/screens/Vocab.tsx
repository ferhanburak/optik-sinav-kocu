// Kelimeler (Defter'in bir bölümü): güne göre liste, filtre, 10 dk tekrar, liste yapıştırma
import React, { useState } from "react";
import { View } from "react-native";
import { fmtDate, today } from "../lib/dates";
import { importVocab } from "../lib/engine";
import { nav } from "../lib/nav";
import { useStore } from "../lib/store";
import type { VocabItem } from "../types";
import { Btn, Card, Empty, Input, Row, Seg, Spacer, T, toast } from "../ui/kit";
import { useColors } from "../ui/theme";

type VF = "all" | "due" | "prep";

export function VocabCard({ v }: { v: VocabItem }) {
  const c = useColors();
  return (
    <View style={{ flexBasis: 220, flexGrow: 1, borderWidth: 1, borderColor: c.line, borderRadius: 10, padding: 10, gap: 2, backgroundColor: c.paper }}>
      <Row wrap={false}>
        <T style={{ fontWeight: "700", flex: 1 }}>{v.prep ? "🔹 " : ""}{v.w}</T>
        <T v="small" muted>{"●".repeat(v.box)}{"○".repeat(4 - Math.min(4, v.box))}</T>
      </Row>
      <T v="small">{v.m}</T>
      {v.ex ? <T v="small" muted style={{ fontStyle: "italic" }}>{v.ex}</T> : null}
    </View>
  );
}

export function VocabBody() {
  const s = useStore();
  const [f, setF] = useState<VF>("all");
  const [txt, setTxt] = useState("");
  const list = s.vocab.filter((v) => f === "all" || (f === "prep" ? v.prep : v.due <= today()));
  const byDay: Record<string, VocabItem[]> = {};
  list.forEach((v) => (byDay[v.day] = byDay[v.day] || []).push(v));
  const days = Object.keys(byDay).sort().reverse();
  return (
    <>
      <Row wrap={false} style={{ alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <T v="small" muted>Her oturumda 15 yeni kelime, dünkülerden 5 tekrar. Bildiğin kelime daha seyrek, bilmediğin ertesi gün yeniden gelir.</T>
        </View>
        <Btn kind="pri" title="10 dk tekrar" disabled={!s.vocab.length} onPress={() => nav.open({ kind: "vrev" })} />
      </Row>
      <Row>
        <Seg<VF> value={f} onChange={setF} items={[["all", "Tümü"], ["due", "Tekrarı gelen"], ["prep", "🔹 Edat kalıpları"]]} />
        <Spacer />
        <T v="small" muted>{s.vocab.length} kelime</T>
      </Row>
      {days.length ? (
        days.map((d) => (
          <View key={d} style={{ gap: 6 }}>
            <T v="label">{fmtDate(d)}</T>
            <Row gap={8} style={{ alignItems: "stretch" }}>{byDay[d].map((v) => <VocabCard key={v.id} v={v} />)}</Row>
          </View>
        ))
      ) : (
        <Empty text="Henüz kelime yok. İlk oturumda 15 kelime eklenir. Elinde bir liste varsa aşağıdan yapıştırabilirsin." />
      )}
      <Card>
        <T v="h3">Liste yapıştır</T>
        <T v="small" muted>Her satıra bir kelime: kelime - anlam - örnek cümle. Edat kalıplarının başına 🔹 koyabilirsin.</T>
        <Input multiline value={txt} onChangeText={setTxt} placeholder={"alleviate - hafifletmek - The drug alleviates pain.\n🔹 attribute to - bir şeye bağlamak"} style={{ minHeight: 90, textAlignVertical: "top" }} />
        <Row><Btn title="Ekle" onPress={() => { const n = importVocab(txt); setTxt(""); toast(`${n} kelime eklendi.`); }} /></Row>
      </Card>
    </>
  );
}
