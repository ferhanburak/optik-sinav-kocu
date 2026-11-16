// Plan: müfredat (kullanıcı "Devam" demeden konu değişmez), ay takvimi, hatırlatıcılar
import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { CURRICULUM, FAMILIES, WEEK_NAMES } from "../data/catalog";
import { addDays, diffDays, DOW, MONTHS, pad, today, ymd } from "../lib/dates";
import { advanceTopic, jumpTopic, sessionsOn, topicStatus } from "../lib/engine";
import { nav } from "../lib/nav";
import { syncReminders } from "../lib/notify";
import { save, useStore } from "../lib/store";
import { Btn, Card, Row, Spacer, T, st, toast } from "../ui/kit";
import { useColors } from "../ui/theme";

export function Plan() {
  const s = useStore();
  const c = useColors();
  const p = s.profile;
  const [month, setMonth] = useState(today().slice(0, 7));
  const weeks = [...new Set(CURRICULUM.map((x) => x.w))];
  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const startD = addDays(ymd(first), -((first.getDay() + 6) % 7));
  const cells = [...Array(42)].map((_, i) => addDays(startD, i));
  const shift = (d: number) => {
    const dt = new Date(y, m - 1 + d, 1);
    setMonth(`${dt.getFullYear()}-${pad(dt.getMonth() + 1)}`);
  };

  return (
    <ScrollView contentContainerStyle={st.screen}>
      <View>
        <T v="h2">Plan</T>
        <T v="small" muted>Takvim değil sen ilerlersin: “Devam” demeden yeni konuya geçilmez. Sınava {Math.max(0, diffDays(today(), p.examDate))} gün kaldı.</T>
      </View>

      <Card>
        {weeks.map((w) => (
          <View key={w} style={{ gap: 6 }}>
            <T v="label" color={c.guide} style={{ marginTop: w ? 10 : 0 }}>Hafta {w} · {WEEK_NAMES[w] || ""}</T>
            {CURRICULUM.filter((x) => x.w === w).map((x) => {
              const stt = topicStatus(x.id);
              return (
                <Row key={x.id} wrap={false} style={{ borderTopWidth: 1, borderColor: c.line, paddingTop: 8 }}>
                  <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: c.guide, backgroundColor: stt === "tamam" ? c.guide : stt === "aktif" ? c.guideSoft : "transparent" }} />
                  <View style={{ flex: 1 }}>
                    <T v="small" style={{ fontWeight: stt === "aktif" ? "700" : "500" }}>{x.t}</T>
                    {x.f.length ? <T v="small" muted>{x.f.map((f) => FAMILIES[f].n).join(" · ")}</T> : null}
                  </View>
                  {stt === "aktif" ? (
                    <Btn sm kind="pri" title="Devam" onPress={() => { const n = advanceTopic(); save(); toast(n ? `Yeni konu: ${n.t}` : "Bütün konular tamam."); }} />
                  ) : stt === "bekliyor" ? (
                    <Btn sm kind="ghost" title="Buna geç" onPress={() => jumpTopic(x.id)} />
                  ) : (
                    <T v="small" muted>tamam</T>
                  )}
                </Row>
              );
            })}
          </View>
        ))}
      </Card>

      <Card>
        <Row>
          <Btn sm title="‹" onPress={() => shift(-1)} />
          <T v="h3" style={{ flex: 1, textAlign: "center" }}>{MONTHS[m - 1]} {y}</T>
          <Btn sm title="›" onPress={() => shift(1)} />
        </Row>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((d) => (
            <View key={d} style={{ width: `${100 / 7}%`, alignItems: "center", paddingVertical: 4 }}><T v="label">{d}</T></View>
          ))}
          {cells.map((d) => {
            const ss = sessionsOn(d);
            const best = ss.length ? Math.max(...ss.map((x) => x.p)) : null;
            const ex = d === p.examDate;
            const out = d.slice(0, 7) !== month;
            return (
              <View key={d} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }}>
                <View style={{ flex: 1, borderRadius: 8, borderWidth: d === today() ? 2 : 1, borderColor: d === today() ? c.guide : c.line, backgroundColor: ex ? c.guideSoft : c.paper, opacity: out ? 0.4 : 1, alignItems: "center", justifyContent: "center" }}>
                  <T v="small">{+d.slice(8)}</T>
                  {ex ? (
                    <Text style={{ fontSize: 8, color: c.guide, fontWeight: "700" }}>SINAV</Text>
                  ) : best !== null ? (
                    <Text style={{ fontSize: 9, fontWeight: "700", color: best >= 80 ? c.ok : best >= 60 ? c.warn : c.bad }}>%{best}</Text>
                  ) : s.skips.includes(d) ? (
                    <Text style={{ fontSize: 8, color: c.muted }}>atlandı</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      </Card>

      <Card>
        <T v="h3">Hatırlatıcılar</T>
        <T v="small"><Text style={{ fontWeight: "700" }}>{p.time}</Text> · Günlük YDS oturumu ({p.dailyMin} dk)</T>
        <T v="small"><Text style={{ fontWeight: "700" }}>{p.vocabTime}</Text> · 10 dk kelime tekrarı</T>
        <T v="small"><Text style={{ fontWeight: "700" }}>{DOW[p.defterDay]} {p.defterTime}</Text> · Haftalık defter</T>
        <T v="small" muted>{p.remind ? "Telefon bildirimleri açık." : "Bildirimler kapalı."} Saatleri Ayarlar'dan değiştirebilirsin.</T>
        <Row>
          <Btn title="Bildirimleri kur" onPress={async () => toast((await syncReminders()) ? "Hatırlatıcılar kuruldu." : "Bildirim izni verilmedi. Telefon ayarlarından açabilirsin.")} />
          <Spacer />
          <Btn kind="ghost" title="Saatleri değiştir" onPress={() => nav.modal({ kind: "settings" })} />
        </Row>
      </Card>
    </ScrollView>
  );
}
