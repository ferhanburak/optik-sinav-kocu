// İlerleme: skor eğrisi, aileler, hız-doğruluk, ★ isabeti, bölümler, haftalık koç yorumu
import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { FAMILIES, SECTIONS } from "../data/catalog";
import { fmtShort, pct } from "../lib/dates";
import { famEntries, weeklyCoach } from "../lib/engine";
import { useStore } from "../lib/store";
import { Curve, SpeedPlot } from "../ui/charts";
import { Bar, Btn, Card, Empty, LightBadge, List, Row, Spacer, T, Table, st } from "../ui/kit";
import { levelColor, useColors } from "../ui/theme";

export function Progress() {
  const s = useStore();
  const c = useColors();
  const [coach, setCoach] = useState<ReturnType<typeof weeklyCoach> | null>(null);
  const ss = s.sessions.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  const by: Record<string, { n: number; c: number }> = {};
  s.attempts.filter((a) => a.t > Date.now() - 14 * 864e5).forEach((a) => {
    const b = (by[a.sec] = by[a.sec] || { n: 0, c: 0 });
    b.n++;
    if (a.ok) b.c++;
  });
  const fams = famEntries();
  const un = s.attempts.filter((a) => a.u);
  const unOk = un.filter((a) => a.ok).length;
  return (
    <ScrollView contentContainerStyle={st.screen}>
      <T v="h2">İlerleme</T>
      <Card>
        <Row>
          <T v="h3">Skor eğrisi</T>
          <Spacer />
          <T v="small" color={c.guide}>● İlk deneme</T>
          <T v="small" color={c.ok}>● Sonunda</T>
        </Row>
        {ss.length ? <Curve ss={ss} /> : <Empty text="Oturum çözdükçe eğri burada oluşur." />}
        <T v="small" muted>Resmî skor ilk denemedir. İpucuyla ya da ikinci denemede bulduğun cevaplar “sonunda” olarak ayrı görünür.</T>
      </Card>
      <Card>
        <Row><T v="h3">Hata türleri</T><Spacer /><T v="small" muted>🟢 = üst üste 2 doğru</T></Row>
        {fams.length ? (
          <Table cols={["Tür", "Durum", "Yanlış", "Seri", "Tekrar"]} rows={fams.map(([k, f]) => [FAMILIES[k].n, <LightBadge key={k} l={f.light} />, String(f.wrong), String(f.streak), f.due ? fmtShort(f.due) : "—"])} />
        ) : (
          <Empty text="Henüz veri yok." />
        )}
      </Card>
      <Card>
        <T v="h3">Hız ve doğruluk</T>
        {ss.some((x) => x.spq) ? (
          <>
            <SpeedPlot ss={ss} />
            <T v="small" muted>Her nokta bir oturum. Kesik çizgi 75 sn hedefi.</T>
          </>
        ) : (
          <Empty text="Süre verisi oluştukça burada görünür." />
        )}
      </Card>
      <Card>
        <T v="h3">★ Emin değilim isabeti</T>
        <T v="small">{un.length ? `Emin olmadan işaretlediğin ${un.length} sorunun ${unOk} tanesi doğruydu (%${pct(unOk, un.length)}).` : "Henüz ★ işaretli soru yok."}</T>
      </Card>
      <Card>
        <T v="h3">Bölümler (son 14 gün)</T>
        {Object.keys(by).length ? (
          Object.entries(by).sort((a, b) => a[1].c / a[1].n - b[1].c / b[1].n).map(([k, b]) => (
            <View key={k} style={{ gap: 4 }}>
              <Row><T v="small" style={{ flex: 1 }}>{SECTIONS[k] || k}</T><T v="mono">{b.c}/{b.n} · %{pct(b.c, b.n)}</T></Row>
              <Row><Bar value={pct(b.c, b.n)} color={levelColor(c, b.c / b.n)} /></Row>
            </View>
          ))
        ) : (
          <Empty text="Henüz veri yok." />
        )}
      </Card>
      <Card>
        <Row><T v="h3">Haftalık koç yorumu</T><Spacer /><Btn sm title="Bu haftayı değerlendir" onPress={() => setCoach(weeklyCoach())} /></Row>
        {coach ? (
          <View style={{ gap: 8 }}>
            <T v="h3">İyi gidenler</T>
            <List v="small" items={coach.iyi.length ? coach.iyi : ["—"]} />
            <T v="h3">Açık kalanlar ve nedenleri</T>
            <List v="small" items={coach.acik} />
            <T v="h3">Önümüzdeki günlerin 3 önceliği</T>
            <List v="small" ordered items={coach.oncelik} />
          </View>
        ) : (
          <T v="small" muted>Haftanın verisine bakıp neyin iyi gittiğini, nereye odaklanman gerektiğini ve gelecek günlerin önceliklerini yazar.</T>
        )}
      </Card>
    </ScrollView>
  );
}
