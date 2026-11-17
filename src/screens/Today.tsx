// Bugün: dashboard. Izgara düzeni (16'lık kenar, 8'lik aralık):
//   özet (cam, tam genişlik) → günlük oturum (ana kart) → 3 sütun istatistik → 2 sütun eylem kutuları → skor, aileler, karar notu, yapılacaklar
import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { FAMILIES, MOCK_MODES, PLACEMENT, TANIMA_GOAL } from "../data/catalog";
import { dayOf, diffDays, fmtDate, fmtShort, isYmd, pct, today, uid } from "../lib/dates";
import { activeTopic, dueFams, famEntries, famsKnown, isTelafi, lightLabel, sessionsOn, streakDays } from "../lib/engine";
import { nav } from "../lib/nav";
import { answerGapQuestion, canLight, completedToday, DAY_LABEL, dayPlan, MODELS, FREE_SKIPS_PER_WEEK, INTENSITY, intensityToday, isLightToday, LIGHT_PER_WEEK, lightUsed, planTitle, requestGap, setLight, skipsUsed } from "../lib/plan";
import { LESSONS } from "../content";
import { S, save, useStore } from "../lib/store";
import type { Decision } from "../types";
import { Spark } from "../ui/charts";
import { Bar, Btn, Card, Chip, Count, Empty, Glass, Input, LightBadge, Row, Spacer, T, st, toast } from "../ui/kit";
import { FadeIn, Press } from "../ui/motion";
import { TabIcon, type IconId } from "../ui/TabBar";
import { elev, radius, useColors } from "../ui/theme";

type SK = "normal" | "short" | "A" | "B";
export const startSession = (sk: SK) => {
  if (!S.onboarded) return nav.modal({ kind: "intro", sk });
  const pl = dayPlan();
  if (sk === "normal" && pl.ask) {
    nav.tab("bugun");
    return toast("Önce Bugün kartındaki soruyu cevapla: bir gün daha açık kapama mı, yeni konu mu?", 6000);
  }
  // Deneme günü: günün oturumu denemedir
  if (sk === "normal" && pl.type === "deneme" && pl.mock) return nav.open({ kind: "mock", mode: pl.mock });
  nav.open({ kind: "session", sk });
};

/** Günün adımları: türüne (konu / açık kapama) ve yoğunluğa göre */
export function sessionPlanLines(short: boolean): [string, string][] {
  const p = dayPlan();
  const I = INTENSITY[short ? "hafif" : intensityToday()];
  if (p.type === "deneme" && p.mock && !short) return [["Deneme", planTitle(p)], ["Süre", `${MOCK_MODES[p.mock].min} dk`], ["Sonra", "Yanlışlar deftere ve hata türlerine işlenir"]];
  const lines: [string, string][] = [[p.type === "tekrar" ? "Odak" : "Konu", planTitle(p)], ["Isınma", `${I.warm} soru`]];
  if (p.type === "tekrar") lines.push(["Notlar", `${p.focus.length} hata türü için mini not`]);
  else if (!short) lines.push(["Kelime", `${I.vocab} yeni + dünkülerden 5 tekrar`]);
  const les = p.type === "konu" && p.topic && !short ? LESSONS[p.topic.id] : null;
  if (les) lines.push(["Anlatım", `${les.parts.length} part · ${les.parts.reduce((a, x) => a + (x.ornekler || []).length, 0)} çözümlü örnek`]);
  lines.push(["Test", `${I.set} soru · yaklaşık ${I.min} dk`]);
  return lines;
}

export function PlanLines({ lines }: { lines: [string, string][] }) {
  return (
    <View style={{ gap: 4 }}>
      {lines.map(([k, v]) => (
        <Row key={k} wrap={false} style={{ alignItems: "flex-start" }}>
          <T v="small" style={{ fontWeight: "700", width: 64 }}>{k}</T>
          <T v="small" style={{ flex: 1 }}>{v}</T>
        </Row>
      ))}
    </View>
  );
}

export function DecisionView({ d }: { d: Decision }) {
  const rows: [string, keyof Decision][] = [["Güçlü", "guclu"], ["Zayıf", "zayif"], ["Teşhis", "teshis"], ["Yeni önlem", "onlem"], ["Yarın", "yarin"]];
  return (
    <View style={{ gap: 6 }}>
      {rows.filter(([, k]) => d[k]).map(([l, k]) => (
        <View key={k}>
          <T v="label">{l}</T>
          <T v="small">{d[k]}</T>
        </View>
      ))}
    </View>
  );
}

/** İstatistik kutusu: 3 sütunlu ızgaranın bir hücresi (cam) */
function Tile({ v, l, sub, warn, i = 0 }: { v: React.ReactNode; l: string; sub?: string; warn?: boolean; i?: number }) {
  const c = useColors();
  return (
    <FadeIn delay={i * 45} style={{ flexBasis: "30%", flexGrow: 1, minWidth: 96, backgroundColor: c.glass, borderColor: c.glassLine, borderWidth: 1, borderRadius: radius.tile, paddingVertical: 12, paddingHorizontal: 12, gap: 1 }}>
      <Text style={{ fontSize: 21, fontWeight: "800", color: warn ? c.bad : c.ink, fontVariant: ["tabular-nums"], letterSpacing: -0.3 }}>{v}</Text>
      <T v="small" style={{ fontWeight: "600" }}>{l}</T>
      {sub ? <T v="small" muted style={{ fontSize: 11.5, lineHeight: 15 }}>{sub}</T> : null}
    </FadeIn>
  );
}

/** Eylem kutusu: 2 sütunlu ızgaranın bir hücresi; kutunun tamamı dokunulabilir */
function Action({ icon, title, desc, badge, onPress, disabled, wide, i = 0 }: { icon: IconId; title: string; desc: string; badge?: string; onPress: () => void; disabled?: boolean; wide?: boolean; i?: number }) {
  const c = useColors();
  return (
    <FadeIn delay={140 + i * 50} style={{ flexBasis: wide ? "100%" : "46%", flexGrow: 1 }}>
      <Press
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${desc}`}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={{ flex: 1 }}
        inner={{ flex: 1, minHeight: wide ? undefined : 118, backgroundColor: wide ? c.paper : c.glass, borderColor: wide ? c.guideLine : c.glassLine, borderWidth: 1, borderRadius: radius.tile, padding: 14, gap: 8, opacity: disabled ? 0.55 : 1, boxShadow: wide ? elev(c) : undefined, flexDirection: wide ? "row" : "column", alignItems: wide ? "center" : "flex-start" }}
      >
        <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: c.guideSoft, alignItems: "center", justifyContent: "center" }}>
          <TabIcon id={icon} color={c.guide} size={20} />
        </View>
        <View style={{ flex: wide ? 1 : undefined, gap: 2, alignSelf: "stretch" }}>
          <Row gap={6}>
            <T style={{ fontWeight: "700" }}>{title}</T>
            {badge ? <Chip text={badge} color={c.guide} /> : null}
          </Row>
          <T v="small" muted numberOfLines={wide ? 3 : 2}>{desc}</T>
        </View>
        {wide ? <Text style={{ fontSize: 22, color: c.guide, fontWeight: "700" }}>›</Text> : null}
      </Press>
    </FadeIn>
  );
}

export function Today() {
  const s = useStore();
  const c = useColors();
  const [todo, setTodo] = useState("");
  const [exDate, setExDate] = useState(s.profile.examDate);
  const p = s.profile;
  const left = diffDays(today(), p.examDate);
  const t = activeTopic();
  const done = completedToday();
  const half = sessionsOn(today()).some((x) => x.done === false) && !done.length;
  const plan = dayPlan();
  const inten = intensityToday();
  const skipped = s.skips.includes(today());
  const telafi = isTelafi() && !done.length;
  const lights = { red: 0, yellow: 0, green: 0 } as Record<string, number>;
  famEntries().forEach(([, f]) => {
    if (lights[f.light] !== undefined) lights[f.light]++;
  });
  const dec = s.decisions[s.decisions.length - 1];
  const vdue = s.vocab.filter((v) => v.due <= today()).length;
  const wk = s.attempts.filter((a) => a.t > Date.now() - 7 * 864e5);
  const acc = wk.length ? pct(wk.filter((a) => a.ok).length, wk.length) : null;
  const timed = wk.filter((a) => a.s);
  const spq = timed.length ? Math.round(timed.reduce((x, a) => x + a.s, 0) / timed.length) : null;
  const place = s.sessions.filter((x) => x.kind === "seviye").slice(-1)[0];
  const lastMock = s.mocks[s.mocks.length - 1];
  const weakest = famEntries()[0];
  const misN = s.mistakes.length;
  const ss = s.sessions.slice().sort((a, b) => (a.date < b.date ? -1 : 1)).slice(-12);

  let sess: React.ReactNode;
  if (done.length)
    sess = (
      <>
        <T v="small">Bugün tamam: <Text style={{ fontWeight: "700" }}>{done.map((x) => `${x.c}/${x.n}`).join(" · ")}</Text> ilk denemede.</T>
        <Row><Btn title="Kısa ek set" onPress={() => startSession("short")} /></Row>
      </>
    );
  else if (skipped)
    sess = (
      <>
        <T v="small">Bugünü atladın; yarın iki seans halinde telafi edilecek.</T>
        <Row><Btn sm title="Vazgeç, bugün çalışacağım" onPress={() => { S.skips = S.skips.filter((x) => x !== today()); save(); }} /></Row>
      </>
    );
  else if (telafi)
    sess = (
      <>
        <T v="small"><Text style={{ fontWeight: "700" }}>Telafi günü.</Text> Yük tek bloğa yığılmaz; seanslar arasında 10 dk mola, toplam en fazla 2 saat.</T>
        <Row><Btn kind="pri" title="Seans A" onPress={() => startSession("A")} /><Btn title="Seans B" onPress={() => startSession("B")} /></Row>
      </>
    );
  else
    sess = (
      <>
        <T v="small" muted>{plan.why}</T>
        {half ? <T v="small" color={c.warn} style={{ fontWeight: "600" }}>Bugünkü oturum yarım kaldı. Testi bitirince gün tamamlanır.</T> : null}
        {plan.ask ? (
          <View style={{ backgroundColor: c.warnSoft, borderRadius: 14, padding: 12, gap: 8 }}>
            <T v="small" style={{ fontWeight: "700" }}>Bir gün daha üstüne gidelim mi, yoksa yeni konuya geçip bunları tekrarlarla mı kapatalım?</T>
            <Row>
              <Btn sm kind="pri" title="Bir gün daha açık kapat" onPress={() => answerGapQuestion(true)} />
              <Btn sm title="Yeni konuya geç" onPress={() => answerGapQuestion(false)} />
            </Row>
          </View>
        ) : null}
        <PlanLines lines={sessionPlanLines(false)} />
        {s.pending ? <T v="small" muted>Yarından geçerli: {MODELS[s.pending.model].l} model · günde {s.pending.dailyMin} dk · haftada {s.pending.days.length} gün.</T> : null}
        <Row gap={6}>
          <T v="small" muted>Yoğunluk:</T>
          <Chip text={INTENSITY[inten].l} color={c.guide} />
          {isLightToday() ? (
            <Btn sm kind="ghost" title="Hafif günü geri al" onPress={() => setLight(false)} />
          ) : canLight() ? (
            <Btn sm kind="ghost" title={`Hafif gün (kalan ${LIGHT_PER_WEEK - lightUsed()})`} onPress={() => { setLight(true); toast(`Bugün hafif gün. Bu hafta ${LIGHT_PER_WEEK - lightUsed() - 1} hakkın kaldı.`); }} />
          ) : null}
        </Row>
        <Row style={{ marginTop: 4 }}>
          <Btn kind="pri" disabled={!!plan.ask} title={half ? "Devam et" : plan.type === "deneme" ? "Denemeyi başlat" : "Başla"} onPress={() => startSession("normal")} />
          {plan.asked ? (
            <Btn sm title="Planlanan güne dön" onPress={() => requestGap(false)} />
          ) : (plan.type === "konu" || plan.type === "deneme") && !plan.ask ? (
            <Btn sm title="Açıkları kapatmak istiyorum" onPress={() => requestGap(true)} />
          ) : null}
          <Btn sm kind="ghost" title="Bugün yok" onPress={() => {
            if (!S.skips.includes(today())) S.skips.push(today());
            save();
            const used = skipsUsed();
            toast(used >= FREE_SKIPS_PER_WEEK ? `Bu hafta ${used + 1}. kez atladın. Yarın telafi var ve konuların beklenen bitişi bir gün kayıyor.` : "Bugün atlandı. Yarın iki seans halinde telafi edeceğiz.", 6000);
          }} />
        </Row>
      </>
    );

  return (
    <ScrollView contentContainerStyle={st.screen} showsVerticalScrollIndicator={false}>
      {/* Özet */}
      <FadeIn>
        <Glass r={radius.sheet} style={{ padding: 18 }}>
          <T v="label" color={c.guide}>YDS · {p.examSet ? fmtDate(p.examDate) : "sınav tarihi girilmedi"} · hedef {p.target}+</T>
          <Row wrap={false} gap={16} style={{ alignItems: "center" }}>
            <View style={{ alignItems: "center", minWidth: 76, paddingVertical: 8, paddingHorizontal: 10, borderRadius: radius.tile, backgroundColor: c.guideSoft }}>
              {p.examSet && left >= 0 ? <Count to={left} color={c.guide} /> : <T v="big" color={c.guide}>—</T>}
              <T v="small" color={c.guide} style={{ fontWeight: "600" }}>gün kaldı</T>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <T v="h2">{s.onboarded ? (s.tanima ? "Seni tanıyoruz" : "Çalışma panelin") : "Hoş geldin"}</T>
              {p.examSet ? (
                <T v="small" muted>{t ? `Aktif konu: ${t.t}` : "Bütün konular tamam"}{left >= 0 && left <= 7 ? " · Son hafta: denemeler ve hata analizi" : ""}</T>
              ) : (
                <T v="small" muted>Sınav tarihini gir, geri sayım ve plan ona göre kurulsun.</T>
              )}
            </View>
          </Row>
          {!p.examSet ? (
            <Row wrap={false}>
              <Input value={exDate} onChangeText={setExDate} placeholder="YYYY-AA-GG" accessibilityLabel="Sınav tarihi" style={{ flex: 1 }} />
              <Btn title="Kaydet" onPress={() => {
                if (!isYmd(exDate)) return toast("Tarihi YYYY-AA-GG biçiminde yaz, ör. 2026-04-05.");
                S.profile.examDate = exDate;
                S.profile.examSet = true;
                save();
                toast("Sınav tarihi kaydedildi.");
              }} />
            </Row>
          ) : null}
        </Glass>
      </FadeIn>

      {/* Ana eylem */}
      <FadeIn delay={60}>
        <Card accent style={{ borderColor: c.guideLine }}>
          <Row>
            <T v="h3">Günlük oturum</T>
            {telafi ? <Chip text="telafi" color={c.guide} /> : !done.length && !skipped ? <Chip text={DAY_LABEL[plan.type]} color={c.guide} /> : null}
            <Spacer />
            {!done.length && !skipped ? <T v="small" muted>~{plan.type === "deneme" && plan.mock ? MOCK_MODES[plan.mock].min : INTENSITY[inten].min} dk</T> : null}
          </Row>
          {sess}
        </Card>
      </FadeIn>

      {/* İstatistikler: 3 sütun */}
      <Row gap={8} style={{ alignItems: "stretch" }}>
        <Tile i={0} v={s.attempts.length || "—"} l="çözülen soru" sub={wk.length ? `bu hafta ${wk.length}` : "henüz yok"} />
        <Tile i={1} v={acc === null ? "—" : `%${acc}`} l="ilk denemede" sub="son 7 gün" />
        <Tile i={2} v={spq ? `${spq} sn` : "—"} l="soru başına" sub={spq ? (spq < 75 ? "hedef ≥75 sn" : "hedefte") : "veri yok"} warn={!!spq && spq < 75} />
        <Tile i={3} v={streakDays() || "—"} l="gün seri" sub={s.sessions.length ? `${s.sessions.length} oturum` : "henüz yok"} />
        <Tile i={4} v={<Text><Text style={{ color: c.bad }}>{lights.red}</Text> · <Text style={{ color: c.warn }}>{lights.yellow}</Text> · <Text style={{ color: c.ok }}>{lights.green}</Text></Text>} l="hata türü" sub="açık · düzeliyor · oturdu" />
        <Tile i={5} v={s.vocab.length || "—"} l="kelime" sub={vdue ? `${vdue} tekrar bekliyor` : "tekrar yok"} />
      </Row>

      {s.tanima ? (
        <Card>
          <Row><T v="h3">Seni tanıma aşaması</T><Spacer /><T v="mono">{famsKnown()}/{TANIMA_GOAL} hata türü</T></Row>
          <Row><Bar value={pct(famsKnown(), TANIMA_GOAL)} color={c.warn} /></Row>
          <T v="small" muted>Oturumlar şimdilik teşhis ağırlıklı. {TANIMA_GOAL} hata türünde veri oluşunca konu anlatımlarına geçilir.</T>
        </Card>
      ) : null}

      {/* Hızlı çalışma: yalnızca basınca hemen bir şey başlatan kutular. Başka sekmeye götüren kutu yok; onlar alt çubukta. */}
      {!place || weakest || vdue ? (
        <>
          <T v="label" color={c.guide} style={{ marginTop: 4 }}>Hızlı çalışma</T>
          <Row gap={8} style={{ alignItems: "stretch" }}>
            {!place ? (
              <Action i={0} wide icon="hedef" title="Seviye testi" badge="Önerilen" desc={`${PLACEMENT.length} soru, ~40 dk. Her hata türünden sorar; planın sonuca göre kurulur.`} onPress={() => nav.open({ kind: "place" })} />
            ) : null}
            {weakest ? (
              <Action i={1} icon="ilerleme" title="Zayıf noktanı çalış" desc={`${FAMILIES[weakest[0]].n} · ${lightLabel(weakest[1].light)} · 3 soru`} onPress={() => nav.open({ kind: "drill", f: weakest[0] })} />
            ) : null}
            {vdue ? <Action i={2} icon="kelimeler" title="Kelime tekrarı" desc={`${vdue} kelime tekrar bekliyor · ~10 dk`} onPress={() => nav.open({ kind: "vrev" })} /> : null}
          </Row>
        </>
      ) : null}

      <Card>
        <Row><T v="h3">Skor eğrisi</T><Spacer /><Pressable hitSlop={8} onPress={() => nav.tab("ilerleme")}><T v="small" color={c.guide} style={{ fontWeight: "600" }}>İlerleme ›</T></Pressable></Row>
        <Spark ss={ss} />
        {ss.length ? <T v="small" muted>Son {ss.length} oturum, ilk deneme yüzdesi. Kesik çizgi %70.</T> : null}
      </Card>

      <Card>
        <Row><T v="h3">Hata türleri</T><Spacer /><Pressable hitSlop={8} onPress={() => nav.tab("defter", "yanlis")}><T v="small" color={c.guide} style={{ fontWeight: "600" }}>Defter ›</T></Pressable></Row>
        {famEntries().length ? (
          famEntries().slice(0, 5).map(([k, f]) => (
            <Row key={k} wrap={false} style={{ borderTopWidth: 1, borderColor: c.line, paddingTop: 10 }}>
              <View style={{ flex: 1 }}>
                <T v="small" style={{ fontWeight: "700" }}>{FAMILIES[k].n}</T>
                <T v="small" muted>{FAMILIES[k].tool}</T>
              </View>
              <LightBadge l={f.light} />
            </Row>
          ))
        ) : (
          <T v="small" muted>Seviye testi ya da ilk oturumdan sonra her hata türünün durumu burada görünür.</T>
        )}
      </Card>

      {dec ? (
        <Card>
          <Row><T v="h3">Son karar notu</T><Spacer /><T v="small" muted>{fmtDate(dayOf(dec.t))}</T></Row>
          <DecisionView d={dec.d} />
        </Card>
      ) : null}

      <Card>
        <T v="h3">Yapılacaklar</T>
        {s.todos.length ? (
          s.todos.map((td) => (
            <Row key={td.id} wrap={false}>
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: td.done }} onPress={() => { td.done = !td.done; save(); }} style={{ flex: 1, flexDirection: "row", gap: 10, alignItems: "center", paddingVertical: 4 }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: c.guide, backgroundColor: td.done ? c.guide : "transparent" }} />
                <T v="small" style={td.done ? { textDecorationLine: "line-through", color: c.muted } : undefined}>{td.t}</T>
              </Pressable>
              <Btn sm kind="ghost" title="Sil" onPress={() => { S.todos = S.todos.filter((x) => x.id !== td.id); save(); }} />
            </Row>
          ))
        ) : (
          <T v="small" muted>ÖSYM'nin çıkmış sınavlarını kendin çözüp sonucunu buraya not edebilirsin.</T>
        )}
        <Row wrap={false}>
          <Input value={todo} onChangeText={setTodo} placeholder="Ör. 2024-YDS/1'i çöz" style={{ flex: 1 }} onSubmitEditing={() => add()} />
          <Btn title="Ekle" onPress={() => add()} />
        </Row>
      </Card>
      {!s.attempts.length ? <Empty text="İlk adım: seviye testi. Testi atlarsan ilk oturumlar seni tanımaya yönelik olur." /> : null}
    </ScrollView>
  );

  function add() {
    const v = todo.trim();
    if (!v) return;
    S.todos.push({ id: uid(), t: v, done: false });
    save();
    setTodo("");
  }
}
