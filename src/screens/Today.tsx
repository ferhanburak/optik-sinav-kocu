// Bugün: dashboard — geri sayım, istatistik kutuları, "Ne yapmak istersin?" seçenekleri, skor eğrisi, aileler, karar notu, yapılacaklar
import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { FAMILIES, PLACEMENT, TANIMA_GOAL } from "../data/catalog";
import { dayOf, diffDays, fmtDate, fmtShort, isYmd, pct, today, uid } from "../lib/dates";
import { activeTopic, dueFams, famEntries, famsKnown, isTelafi, lightLabel, sessionsOn, streakDays } from "../lib/engine";
import { nav } from "../lib/nav";
import { S, save, useStore } from "../lib/store";
import type { Decision } from "../types";
import { Spark } from "../ui/charts";
import { Bar, Btn, Card, Chip, Empty, Input, LightBadge, Row, Spacer, T, st, toast } from "../ui/kit";
import { useColors } from "../ui/theme";

type SK = "normal" | "short" | "A" | "B";
export const startSession = (sk: SK) => {
  if (!S.onboarded) nav.modal({ kind: "intro", sk });
  else nav.open({ kind: "session", sk });
};

export function sessionPlanLines(short: boolean): [string, string][] {
  const t = activeTopic();
  const due = dueFams();
  const review = !t || t.kind === "review";
  const set: [string, string] = ["Set", `${short ? 5 : 16} soru${due.length && !S.tanima ? " · gizli tekrarlar içinde" : ""} · yaklaşık ${short ? 20 : S.profile.dailyMin} dk`];
  const head: [string, string] = S.tanima ? ["Konu", "Seni tanıma: her hata ailesinden karışık teşhis soruları"] : ["Konu", review ? (t ? t.t : "Pekiştirme") : t!.t];
  return [head, ["Isınma", `${short ? 3 : 6} soru`], ["Kelime", short ? "dünkülerden 5 tekrar" : "15 yeni + dünkülerden 5 tekrar"], set];
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

function Tile({ v, l, sub, warn }: { v: React.ReactNode; l: string; sub?: string; warn?: boolean }) {
  const c = useColors();
  return (
    <View style={{ flexBasis: "30%", flexGrow: 1, minWidth: 100, backgroundColor: c.paper, borderColor: c.line, borderWidth: 1, borderRadius: 12, padding: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: "800", color: warn ? c.bad : c.ink, fontVariant: ["tabular-nums"] }}>{v}</Text>
      <T v="small">{l}</T>
      {sub ? <T v="small" muted>{sub}</T> : null}
    </View>
  );
}

function Option({ title, desc, badge, children }: { title: string; desc?: string; badge?: string; children: React.ReactNode }) {
  const c = useColors();
  return (
    <Card style={{ flexBasis: 280, flexGrow: 1 }}>
      <Row>
        <T v="h3">{title}</T>
        {badge ? <Chip text={badge} color={c.guide} /> : null}
      </Row>
      {desc ? <T v="small" muted>{desc}</T> : null}
      {children}
    </Card>
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
  const done = sessionsOn(today());
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
        <PlanLines lines={sessionPlanLines(false)} />
        <Row style={{ marginTop: 6 }}>
          <Btn kind="pri" title="Başla" onPress={() => startSession("normal")} />
          <Btn sm title="Bugün kısa" onPress={() => startSession("short")} />
          <Btn sm kind="ghost" title="Bugün yok" onPress={() => { if (!S.skips.includes(today())) S.skips.push(today()); save(); toast("Bugün atlandı. Yarın iki seans halinde telafi edeceğiz."); }} />
        </Row>
      </>
    );

  return (
    <ScrollView contentContainerStyle={st.screen}>
      <Card>
        <Row wrap={false} style={{ alignItems: "flex-start" }} gap={14}>
          <View style={{ alignItems: "center", minWidth: 70 }}>
            <Text style={{ fontSize: 34, fontWeight: "800", color: c.guide, fontVariant: ["tabular-nums"] }}>{p.examSet && left >= 0 ? left : "—"}</Text>
            <T v="small" muted>gün kaldı</T>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <T v="label">YDS · {p.examSet ? fmtDate(p.examDate) : "sınav tarihi girilmedi"} · hedef {p.target}+</T>
            <T v="h2">{s.onboarded ? (s.tanima ? "Seni tanıyoruz" : "Çalışma panelin") : "Hoş geldin"}</T>
            {!p.examSet ? (
              <Row>
                <Input value={exDate} onChangeText={setExDate} placeholder="YYYY-AA-GG" style={{ minWidth: 130 }} />
                <Btn sm title="Kaydet" onPress={() => {
                  if (!isYmd(exDate)) return toast("Tarihi YYYY-AA-GG biçiminde yaz, ör. 2026-04-05.");
                  S.profile.examDate = exDate;
                  S.profile.examSet = true;
                  save();
                  toast("Sınav tarihi kaydedildi.");
                }} />
              </Row>
            ) : (
              <T v="small" muted>{t ? `Aktif konu: ${t.t}` : ""}{left >= 0 && left <= 7 ? " · Son hafta: denemeler ve hata analizi" : ""}</T>
            )}
          </View>
        </Row>
      </Card>

      <Row gap={8}>
        <Tile v={s.attempts.length || "—"} l="çözülen soru" sub={wk.length ? `bu hafta ${wk.length}` : "henüz yok"} />
        <Tile v={acc === null ? "—" : `${acc}%`} l="ilk denemede doğru" sub="son 7 gün" />
        <Tile v={spq ? `${spq} sn` : "—"} l="soru başına" sub={spq ? (spq < 75 ? "hedef ≥75 sn" : "hedefte") : "süre verisi yok"} warn={!!spq && spq < 75} />
        <Tile v={streakDays() || "—"} l="gün seri" sub={s.sessions.length ? `${s.sessions.length} oturum` : ""} />
        <Tile v={<Text><Text style={{ color: c.bad }}>{lights.red}</Text> · <Text style={{ color: c.warn }}>{lights.yellow}</Text> · <Text style={{ color: c.ok }}>{lights.green}</Text></Text>} l="hata ailesi" sub="açık · düzeliyor · oturdu" />
        <Tile v={s.vocab.length || "—"} l="kelime" sub={vdue ? `${vdue} tekrarı geldi` : ""} />
      </Row>

      {s.tanima ? (
        <Card>
          <Row><T v="h3">Seni tanıma aşaması</T><Spacer /><T v="mono">{famsKnown()}/{TANIMA_GOAL} aile</T></Row>
          <Bar value={pct(famsKnown(), TANIMA_GOAL)} color={c.warn} />
          <T v="small" muted>Oturumlar şimdilik teşhis ağırlıklı. {TANIMA_GOAL} ailede veri oluşunca konu anlatımlarına geçilir.</T>
        </Card>
      ) : null}

      <T v="h3">Ne yapmak istersin?</T>
      <Row gap={10} style={{ alignItems: "stretch" }}>
        <Option title="Günlük oturum" desc={done.length ? undefined : "Isınma, kelimeler, konu, set ve değerlendirme."} badge={telafi ? "telafi" : undefined}>{sess}</Option>
        <Option title="Seviye testi" badge={place ? undefined : "Önerilen"} desc={place ? `Son sonuç: ${place.c}/${place.n} (${fmtShort(place.date)}). Yeniden çözüp ilerlemeni görebilirsin.` : `${PLACEMENT.length} soru, ~40 dk. Her hata ailesinden soru sorar; plan ve tekrarlar sonuca göre kurulur.`}>
          <Row><Btn kind={place ? "def" : "pri"} title={place ? "Yeniden çöz" : "Testi çöz"} onPress={() => nav.open({ kind: "place" })} /></Row>
        </Option>
        <Option title="Deneme" desc={lastMock ? `Son deneme: ${lastMock.c}/${lastMock.n} · puan ${lastMock.score} (${fmtShort(lastMock.date)}).` : "Tam (80 soru · 180 dk), yarım (40 · 90 dk) ya da mini (20 · 45 dk). Gerçek YDS dağılımında."}>
          <Row><Btn title="Deneme çöz" onPress={() => nav.tab("deneme")} /></Row>
        </Option>
        <Option title="Zayıf aileni çalış" desc={weakest ? `${FAMILIES[weakest[0]].n} · ${lightLabel(weakest[1].light)}. ${FAMILIES[weakest[0]].tool}` : "Soru çözdükçe en zayıf hata ailen burada çıkar; ondan 3 soruluk drill çözersin."}>
          <Row>{weakest ? <Btn title="3 soru çöz" onPress={() => nav.open({ kind: "drill", f: weakest[0] })} /> : <Btn title="Henüz veri yok" disabled />}</Row>
        </Option>
        <Option title="Yanlış defteri" desc={misN ? `${misN} kayıt · ${lights.red} açık aile. Her kayıtta senin cevabın, doğrusu, neden ve püf.` : "Yanlışların ve emin olmadan doğru yaptıkların burada ailesine göre birikir."}>
          <Row><Btn title="Aç" disabled={!misN} onPress={() => nav.tab("defter", "yanlis")} /></Row>
        </Option>
        <Option title="Kelime tekrarı" desc={s.vocab.length ? `${s.vocab.length} kelime · ${vdue} tanesinin tekrarı geldi. Akşam ${p.vocabTime}'da hatırlatılır.` : "Her oturumda 15 yeni kelime eklenir; elindeki listeyi de yapıştırabilirsin."}>
          <Row>{s.vocab.length ? <Btn title="10 dk tekrar" onPress={() => nav.open({ kind: "vrev" })} /> : <Btn title="Kelimeler" onPress={() => nav.tab("kelimeler")} />}</Row>
        </Option>
      </Row>

      <Card>
        <Row><T v="h3">Skor eğrisi</T><Spacer /><Pressable onPress={() => nav.tab("ilerleme")}><T v="small" color={c.guide}>İlerleme</T></Pressable></Row>
        <Spark ss={ss} />
        {ss.length ? <T v="small" muted>Son {ss.length} oturum, ilk deneme yüzdesi. Kesik çizgi %70.</T> : null}
      </Card>

      <Card>
        <Row><T v="h3">Hata aileleri</T><Spacer /><Pressable onPress={() => nav.tab("defter", "yanlis")}><T v="small" color={c.guide}>Defter</T></Pressable></Row>
        {famEntries().length ? (
          famEntries().slice(0, 5).map(([k, f]) => (
            <Row key={k} wrap={false} style={{ borderTopWidth: 1, borderColor: c.line, paddingTop: 8 }}>
              <View style={{ flex: 1 }}>
                <T v="small" style={{ fontWeight: "700" }}>{FAMILIES[k].n}</T>
                <T v="small" muted>{FAMILIES[k].tool}</T>
              </View>
              <LightBadge l={f.light} />
            </Row>
          ))
        ) : (
          <T v="small" muted>Seviye testi ya da ilk oturumdan sonra her ailenin durumu burada görünür.</T>
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
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: td.done }} onPress={() => { td.done = !td.done; save(); }} style={{ flex: 1, flexDirection: "row", gap: 8, alignItems: "center" }}>
                <View style={{ width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: c.guide, backgroundColor: td.done ? c.guide : "transparent" }} />
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
