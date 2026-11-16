// Plan: önümüzdeki günler (bugün ve yarın kesin, gerisi beklenen), konular (testle geçilir, bitenler yeniden açılır), ay takvimi, hatırlatıcılar
import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { LESSONS } from "../content";
import { CURRICULUM, FAMILIES, WEEK_NAMES } from "../data/catalog";
import { addDays, diffDays, DOW, fmtDate, fmtShort, MONTHS, pad, today, ymd } from "../lib/dates";
import { sessionsOn, topicStatus } from "../lib/engine";
import { nav } from "../lib/nav";
import { syncReminders } from "../lib/notify";
import { DAY_LABEL, expectedFinish, model, MODELS, PASS, upcoming } from "../lib/plan";
import { useStore } from "../lib/store";
import { Btn, Card, Chip, Notice, Row, Spacer, T, st, toast } from "../ui/kit";
import { useColors } from "../ui/theme";
import { startSession } from "./Today";

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
  const days = upcoming(7);
  const fin = expectedFinish();

  return (
    <ScrollView contentContainerStyle={st.screen} showsVerticalScrollIndicator={false}>
      <View>
        <T v="h2">Plan</T>
        <T v="small" muted>Model: {MODELS[model()].l}. Günün türünü ve sırayı sistem belirler; konu, testinde %{PASS} ve üzeri alınca tamamlanır.</T>
      </View>

      {/* Özet: konuların beklenen bitişi ve sınava kalan pay */}
      {fin.date ? (
        fin.buffer !== null && fin.buffer < 0 ? (
          <Notice warn text={`Bu hızla ${fin.left} konunun bitişi ${fmtShort(fin.date)}: sınavdan ${-fin.buffer} gün sonra. Sınav ayarlarından günlük süreyi artırabilir, çalışma günü ekleyebilir ya da plan modelini değiştirebilirsin.`} />
        ) : (
          <Notice text={`Kalan ${fin.left} konunun beklenen bitişi: ${fmtShort(fin.date)}${fin.buffer !== null ? ` · sınava ${fin.buffer} gün pay var` : ""}. Açık kapama günleri çıkarsa kayar.`} />
        )
      ) : null}

      <Card>
        <T v="h3">Önümüzdeki günler</T>
        {days.map((d) => (
          <Row key={d.date} wrap={false} style={{ borderTopWidth: 1, borderColor: c.line, paddingTop: 8, opacity: d.sure ? 1 : 0.55 }}>
            <View style={{ width: 62 }}>
              <T v="small" style={{ fontWeight: "700" }}>{d.date === today() ? "Bugün" : d.date === addDays(today(), 1) ? "Yarın" : fmtShort(d.date)}</T>
              <T v="small" muted>{DOW[new Date(d.date + "T12:00:00").getDay()]}</T>
            </View>
            <View style={{ flex: 1 }}>
              <T v="small" style={{ fontWeight: d.sure ? "700" : "500" }}>{d.title}</T>
              <T v="small" muted>{DAY_LABEL[d.type]}{d.sure ? "" : " · beklenen"}{d.done ? ` · tamam ${d.score}` : ""}</T>
            </View>
            {d.date === today() && !d.done ? <Btn sm kind="pri" title="Başla" onPress={() => startSession("normal")} /> : d.done ? <Chip text="✓" color={c.ok} /> : null}
          </Row>
        ))}
        <T v="small" muted>Bugün kesin; yarın bugünün sonucuna göre kesinleşir. Soluk günler, her konu ilk seferde oturursa izlenecek sıradır.</T>
      </Card>

      <Card>
        <T v="h3">Konular</T>
        {weeks.map((w) => (
          <View key={w} style={{ gap: 6 }}>
            <T v="label" color={c.guide} style={{ marginTop: w ? 10 : 0 }}>Hafta {w} · {WEEK_NAMES[w] || ""}</T>
            {CURRICULUM.filter((x) => x.w === w).map((x) => {
              const stt = topicStatus(x.id);
              const log = s.topicLog[x.id];
              return (
                <Row key={x.id} wrap={false} style={{ borderTopWidth: 1, borderColor: c.line, paddingTop: 8 }}>
                  <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: c.guide, backgroundColor: stt === "tamam" ? c.guide : stt === "aktif" ? c.guideSoft : "transparent" }} />
                  <View style={{ flex: 1 }}>
                    <T v="small" style={{ fontWeight: stt === "aktif" ? "700" : "500" }}>{x.t}</T>
                    <T v="small" muted>
                      {x.f.length ? x.f.map((f) => FAMILIES[f].n).join(" · ") : x.kind === "mock" ? "Başlangıç" : x.kind === "review" ? "Deneme ve tekrar" : "Karma"}
                      {log ? ` · son test %${log.last}${log.weak ? " (zayıf geçildi)" : ""}` : ""}
                    </T>
                  </View>
                  {x.kind ? (
                    <T v="small" muted>{stt === "tamam" ? "tamam" : ""}</T>
                  ) : stt === "aktif" ? (
                    <Btn sm kind="pri" title="Devam" onPress={() => startSession("normal")} />
                  ) : stt === "tamam" && LESSONS[x.id] ? (
                    <Btn sm title="Aç" onPress={() => nav.open({ kind: "session", sk: "normal", review: x.id })} />
                  ) : (
                    <T v="small" muted>{stt === "tamam" ? "tamam" : "sırada"}</T>
                  )}
                </Row>
              );
            })}
          </View>
        ))}
        <T v="small" muted>“Devam” günün oturumunu açar. Biten konuda “Aç”, anlatımı ve 6 soruluk kısa bir testi açar; konunun durumunu değiştirmez.</T>
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
        {p.examSet ? <T v="small" muted>Sınav: {fmtDate(p.examDate)} · {Math.max(0, diffDays(today(), p.examDate))} gün kaldı</T> : null}
      </Card>

      <Card>
        <T v="h3">Hatırlatıcılar</T>
        <T v="small"><Text style={{ fontWeight: "700" }}>{p.time}</Text> · Günlük oturum</T>
        <T v="small"><Text style={{ fontWeight: "700" }}>{p.vocabTime}</Text> · 10 dk kelime tekrarı</T>
        <T v="small"><Text style={{ fontWeight: "700" }}>{DOW[p.defterDay]} {p.defterTime}</Text> · Çalışma defteri</T>
        <T v="small" muted>{p.remind ? "Telefon bildirimleri açık." : "Bildirimler kapalı."} Saatler sınav ayarlarında, ana anahtar Profil'de.</T>
        <Row>
          <Btn title="Bildirimleri kur" onPress={async () => toast((await syncReminders()) ? "Hatırlatıcılar kuruldu." : "Bildirim izni verilmedi. Telefon ayarlarından açabilirsin.")} />
          <Spacer />
          <Btn kind="ghost" title="Saatleri değiştir" onPress={() => nav.modal({ kind: "settings" })} />
        </Row>
      </Card>
    </ScrollView>
  );
}
