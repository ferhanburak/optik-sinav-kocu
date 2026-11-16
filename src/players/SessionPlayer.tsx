// Günün oturumu. Türüne göre adım adım akar:
//   konu günü:        plan → ısınma → kelimeler → kelime tekrarı → konu anlatımı → konu testi → analiz
//   açık kapama günü: plan → ısınma → kelime tekrarı → mini notlar → zayıf türlerden sorular → analiz
//   konu tekrarı (biten konuyu yeniden açmak): konu anlatımı → 6 soruluk test → sonuç (konunun durumunu değiştirmez)
import React, { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { LESSONS } from "../content";
import { CURRICULUM, FAMILIES, TANIMA_GOAL } from "../data/catalog";
import { fmtShort, mmss, pct, today, uid } from "../lib/dates";
import { addVocab, buildBankSet, checkTanimaDone, decisionFor, dueFams, fam, famsKnown, lastMistakeOf, mistakeRef, newCardState, newVocab, summarize, type Done, type Summary } from "../lib/engine";
import { nav } from "../lib/nav";
import { applyTopicResult, DAY_LABEL, dayPlan, gapDayDone, INTENSITY, intensityToday, PASS, type DayPlan, type Outcome } from "../lib/plan";
import { S, save } from "../lib/store";
import type { CardState, Decision, Question, Topic, VocabItem } from "../types";
import { LessonView } from "../ui/LessonView";
import { QuestionCard } from "../ui/QuestionCard";
import { Box, Btn, Card, Chip, Count, LightBadge, List, Notice, Row, Seg, Spacer, T, Table, toast } from "../ui/kit";
import { Stagger } from "../ui/motion";
import { useColors } from "../ui/theme";
import { DecisionView, PlanLines, sessionPlanLines } from "../screens/Today";
import { VocabCard } from "../screens/Vocab";
import { VocabQuiz } from "./VocabQuiz";
import { Shell, useMutable, useTick } from "./Shell";

type Phase = "plan" | "warm" | "vocab" | "vrev" | "lesson" | "mini" | "test" | "eval";
const LABS: Record<Phase, string> = { plan: "Plan", warm: "Isınma", vocab: "Kelimeler", vrev: "Kelime tekrarı", lesson: "Konu", mini: "Mini notlar", test: "Test", eval: "Analiz" };
type SK = "normal" | "short" | "A" | "B";

interface P {
  sk: SK;
  review: boolean;
  plan: DayPlan;
  topic: Topic | null;
  t0: number;
  phase: Phase;
  phases: Phase[];
  warm: Question[];
  test: Question[];
  vocabNew: VocabItem[];
  vrev: VocabItem[];
  lessonPart: number;
  wi: number;
  ti: number;
  cards: Record<string, CardState>;
  sum?: Summary;
  decision?: Decision;
  result?: { outcome: Outcome; p: number; next: Topic | null };
  complete?: boolean;
  wasTanima?: boolean;
  tanimaDone?: boolean;
  saved?: boolean;
  leaveArm?: boolean;
}

function init(sk: SK, reviewId?: string): P {
  const base = { sk, t0: Date.now(), lessonPart: 0, wi: 0, ti: 0, cards: {} as Record<string, CardState>, vocabNew: [] as VocabItem[], vrev: [] as VocabItem[], warm: [] as Question[] };
  const plan = dayPlan();
  // Biten konuyu yeniden açmak: ders + kısa test
  if (reviewId) {
    const t = CURRICULUM.find((c) => c.id === reviewId) || null;
    const test = (t && buildBankSet({ n: 6, topic: t })) || [];
    const phases: Phase[] = t && LESSONS[t.id] ? ["lesson", "test", "eval"] : ["test", "eval"];
    return { ...base, review: true, plan: { ...plan, type: "konu", topic: t }, topic: t, phase: phases[0], phases, test };
  }
  const t = plan.topic;
  const short = sk === "short";
  const B = sk === "B";
  const I = INTENSITY[short ? "hafif" : intensityToday()];
  const due = dueFams();
  const repN = short ? 1 : Math.min(plan.type === "tekrar" || B ? 5 : 3, due.length);
  const half = Math.ceil(repN / 2) || 0;
  const hasLesson = plan.type === "konu" && !!t && !!LESSONS[t.id] && !short && !B;
  let phases: Phase[] =
    plan.type === "tekrar" ? ["plan", "warm", "vrev", "mini", "test", "eval"]
    : short ? ["plan", "warm", "vrev", "test", "eval"]
    : B ? ["plan", "warm", "test", "eval"]
    : ["plan", "warm", "vocab", "vrev", "lesson", "test", "eval"];
  if (!hasLesson) phases = phases.filter((x) => x !== "lesson");
  if (plan.type === "tekrar" && !plan.focus.length) phases = phases.filter((x) => x !== "mini");
  const vrev = S.vocab.filter((v) => v.day < today()).sort((a, b) => (a.due < b.due ? -1 : 1)).slice(0, 5);
  if (!vrev.length) phases = phases.filter((x) => x !== "vrev");
  const vocabNew = phases.includes("vocab") ? newVocab(I.vocab) : [];
  if (!vocabNew.length) phases = phases.filter((x) => x !== "vocab");
  const warm = buildBankSet({ n: I.warm, warm: true, repFams: due.slice(0, half) }) || [];
  // Açık kapama: yalnızca üstüne gidilen türlerden; konu günü: konu türleri + edat + türetme + gizli tekrar
  const focusTopic: Topic | null = plan.type === "tekrar" ? (plan.focus.length ? { w: 0, id: "odak", t: "Açık kapama", f: plan.focus } : null) : t;
  const test = buildBankSet({ n: I.set, topic: focusTopic, repFams: due.slice(half, repN), tanima: S.tanima }) || [];
  return { ...base, review: false, plan, topic: t, phase: "plan", phases, warm, test, vocabNew, vrev };
}

export function SessionPlayer({ sk, review }: { sk: SK; review?: string }) {
  const c = useColors();
  const [P, redraw] = useMutable(() => init(sk, review));
  const [focus, setFocus] = useState(false);
  const running = P.phase !== "plan" && P.phase !== "eval";
  useTick(running);

  const next = () => {
    const i = P.phases.indexOf(P.phase);
    P.phase = P.phases[i + 1] || "eval";
    if (P.phase === "eval") finish();
    redraw();
  };

  const finish = () => {
    if (P.saved) return;
    P.saved = true;
    const all: Done[] = [];
    (["warm", "test"] as const).forEach((k) => {
      (k === "warm" ? P.warm : P.test).forEach((q, i) => {
        const st = P.cards[k + i];
        if (st && st.stage === "done") all.push({ q, st, k });
      });
    });
    const sum = summarize(all, P.t0);
    P.sum = sum;
    // Gün, test bitirildiyse tamamlanmış sayılır
    P.complete = P.test.length > 0 && P.ti >= P.test.length;
    P.wasTanima = S.tanima;
    if (sum.n) {
      const kind = P.review ? "konu-tekrar" : S.tanima ? "tanima" : P.sk === "short" ? "kisa" : P.sk === "A" || P.sk === "B" ? "telafi" : P.plan.type === "tekrar" ? "tekrar" : "oturum";
      S.sessions.push({
        id: uid(), date: today(), kind, type: P.review || P.sk === "short" ? undefined : P.plan.type, done: P.review || P.sk === "short" ? undefined : P.complete,
        topic: P.topic ? P.topic.id : null, n: sum.n, c: sum.c, cf: sum.cf, p: pct(sum.c, sum.n), pf: pct(sum.cf, sum.n), spq: sum.spq, dur: sum.dur,
      });
      const d = decisionFor(sum, P.topic, P.t0);
      S.decisions.push({ t: Date.now(), d });
      P.decision = d;
      save();
    }
    if (P.review || P.sk === "short" || !P.complete) return;
    if (P.plan.type === "konu" && P.topic && P.sk !== "B") {
      // Konu, konu sorularındaki ilk deneme sonucuna göre geçilir
      const tests = all.filter((x) => x.k === "test" && !x.q.rep && (!P.topic!.f.length || P.topic!.f.includes(x.q.fam)));
      P.result = applyTopicResult(P.topic, tests.filter((x) => x.st.first === x.q.a).length, tests.length);
    }
    if (P.plan.type === "tekrar") gapDayDone();
    P.tanimaDone = checkTanimaDone();
  };

  const close = () => {
    if (running && !P.leaveArm) {
      P.leaveArm = true;
      toast(P.review ? "Çıkmak için tekrar bas." : "Testi bitirmeden çıkarsan gün yarım kalır ve konu ilerlemez. Çıkmak için tekrar bas.", 6000);
      return;
    }
    if (P.phase !== "plan") finish();
    nav.close();
  };

  const quiz = (key: "warm" | "test") => {
    const qs = key === "warm" ? P.warm : P.test;
    const i = key === "warm" ? P.wi : P.ti;
    const q = qs[i];
    const name = key === "warm" ? "Isınma" : "Test";
    if (!q)
      return (
        <>
          <Notice text={qs.length ? `${name} bitti.` : `${name} için yeterli hazır soru bulunamadı.`} />
          <Row><Spacer /><Btn kind="pri" title="Devam ›" onPress={next} /></Row>
        </>
      );
    const ck = key + i;
    const st = (P.cards[ck] = P.cards[ck] || newCardState(`${key === "warm" ? "I" : "S"}${i + 1}`));
    const fast = key === "test" && qs.length >= 10 && i >= qs.length - 4;
    return (
      <QuestionCard
        key={ck}
        q={q}
        st={st}
        src={key === "warm" ? "warm" : "set"}
        meta={{ title: `${name} ${i + 1}`, pos: `${i + 1} / ${qs.length}`, last: i === qs.length - 1, fast }}
        onNext={() => {
          if (key === "warm") P.wi++;
          else P.ti++;
          const idx = key === "warm" ? P.wi : P.ti;
          if (key === "test" && idx >= 5) {
            const last5 = [...Array(5)].map((_, k) => P.cards["test" + (idx - 1 - k)]).filter(Boolean);
            const avg = last5.reduce((a, b) => a + b.sec, 0) / last5.length;
            if (avg && avg < 50) toast(`Hızlandın: son 5 soru ortalama ${Math.round(avg)} sn. Etiketi yazmadan geçme.`, 6000);
          }
          if (idx >= qs.length) next();
          else redraw();
        }}
      />
    );
  };

  let body: React.ReactNode = null;
  if (P.phase === "plan")
    body = (
      <Card>
        <Row>
          <T v="h3">{P.sk === "A" ? "Seans A" : P.sk === "B" ? "Seans B" : P.sk === "short" ? "Kısa ek set" : "Bugün"}</T>
          <Chip text={DAY_LABEL[P.plan.type]} color={c.guide} />
        </Row>
        <T v="small" muted>{P.plan.why}</T>
        <PlanLines lines={sessionPlanLines(P.sk === "short")} />
        <T v="small" muted>{S.profile.format === "step" ? "Adım adım ilerleyeceğiz: her ekranda tek adım. Yanlışta önce ipucu, sonra bir deneme hakkı daha." : "Konu anlatımı tek sayfada gelecek; test yine soru soru ilerler."}</T>
        <Row>
          <Btn kind="pri" title="Başla" onPress={() => { P.t0 = Date.now(); next(); }} />
          <Seg value={S.profile.format} onChange={(v) => { S.profile.format = v; save(); redraw(); }} items={[["step", "Adım adım"], ["all", "Hepsi"]]} />
        </Row>
      </Card>
    );
  else if (P.phase === "warm") body = quiz("warm");
  else if (P.phase === "test") body = quiz("test");
  else if (P.phase === "vocab")
    body = (
      <>
        <Card>
          <Row><T v="h3">Bugünün {P.vocabNew.length} kelimesi</T><Spacer /><T v="small" muted>🔹 = edat kalıbı</T></Row>
          <Row gap={8} style={{ alignItems: "stretch" }}>{P.vocabNew.map((v) => <VocabCard key={v.id} v={v} />)}</Row>
        </Card>
        <Row><Spacer /><Btn kind="pri" title="Listeme ekle ve devam ›" onPress={() => { addVocab(P.vocabNew); next(); }} /></Row>
      </>
    );
  else if (P.phase === "vrev") body = <VocabQuiz list={P.vrev} title="Dünkülerden 5 tekrar" onDone={next} doneLabel="Devam ›" />;
  else if (P.phase === "mini")
    body = (
      <>
        <MiniNotes fams={P.plan.focus} />
        <Row><Spacer /><Btn kind="pri" title="Sorulara geç ›" onPress={next} /></Row>
      </>
    );
  else if (P.phase === "lesson" && P.topic) {
    const d = LESSONS[P.topic.id];
    const n = d.parts.length;
    const all = S.profile.format === "all";
    body = (
      <>
        <Card>
          <T v="label">{P.topic.t}{all ? "" : ` · part ${P.lessonPart + 1}/${n}`}</T>
          <LessonView key={P.lessonPart} d={d} fams={P.topic.f} mode={all ? "all" : "step"} part={P.lessonPart} />
        </Card>
        <Row>
          {!all && P.lessonPart > 0 ? <Btn title="‹ Önceki part" onPress={() => { P.lessonPart--; redraw(); }} /> : null}
          <Spacer />
          {!all && P.lessonPart < n - 1 ? (
            <Btn kind="pri" title="Sonraki part ›" onPress={() => { P.lessonPart++; redraw(); }} />
          ) : (
            <Btn kind="pri" title="Teste geç ›" onPress={next} />
          )}
        </Row>
      </>
    );
  } else if (P.phase === "eval") body = <Eval P={P} />;

  const ci = P.phases.indexOf(P.phase);
  const steps = (
    <Row gap={6}>
      {P.phases.map((s, i) => (
        <View key={s} style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: i === ci ? c.guide : i < ci ? c.guideSoft : c.paper, borderWidth: 1, borderColor: i === ci ? c.guide : c.line }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: i === ci ? c.onGuide : c.muted }}>{i + 1} {LABS[s]}</Text>
        </View>
      ))}
    </Row>
  );

  return (
    <Shell
      title={`${P.review ? "Konu tekrarı · " : ""}${P.plan.type === "tekrar" ? "Açık kapama" : P.topic ? P.topic.t : "Oturum"} · ${fmtShort(today())}`}
      onClose={close}
      progress={(ci + (P.phase === "warm" ? P.wi / Math.max(1, P.warm.length) : P.phase === "test" ? P.ti / Math.max(1, P.test.length) : 0)) / Math.max(1, P.phases.length - 1)}
      scrollKey={`${P.phase}-${P.wi}-${P.ti}-${P.lessonPart}`}
      right={running ? (
        <Row gap={6} wrap={false}>
          <T v="mono" color={c.guide}>{mmss((Date.now() - P.t0) / 1000)}</T>
          {P.phase === "warm" || P.phase === "test" ? <Btn sm kind="ghost" title="Odak" onPress={() => setFocus(true)} /> : null}
        </Row>
      ) : null}
    >
      {steps}
      {body}
      <Modal visible={focus} transparent animationType="fade" onRequestClose={() => setFocus(false)}>
        <Pressable onPress={() => setFocus(false)} style={{ flex: 1, backgroundColor: "rgba(0,0,0,.4)", justifyContent: "center", padding: 24 }}>
          <Pressable onPress={() => {}}>
            <Card>
              <T v="h3">Kalan {Math.max(0, P.phase === "test" ? P.test.length - P.ti : P.warm.length - P.wi)} soru{P.phase === "test" ? "" : " (ısınma)"}</T>
              <T v="small" muted>Odaklanamıyor musun? Test bitmeden gün tamamlanmış sayılmaz; önce mola dene.</T>
              <Btn title="Mola: 5 dakika ara ver" onPress={() => { setFocus(false); toast("5 dakika mola. Kalemi bırak, 3 nefes al. Hazır olunca kaldığın yerden devam et.", 8000); }} />
              <Btn title="Bırak: gün yarım kalsın" onPress={() => { setFocus(false); P.phase = "eval"; finish(); redraw(); }} />
            </Card>
          </Pressable>
        </Pressable>
      </Modal>
    </Shell>
  );
}

/** Açık kapama günü: üstüne gidilen her hata türü için kural, kendi son hatan ve konunun hatırlanacakları */
function MiniNotes({ fams }: { fams: string[] }) {
  const c = useColors();
  return (
    <>
      <T v="small" muted>Sorulara geçmeden önce açık türlerin kısa notları. Her birinde kontrol aracını ve kendi son hatanı oku.</T>
      {fams.map((f) => {
        const m = lastMistakeOf(f);
        const topic = CURRICULUM.find((t) => t.f.includes(f) && LESSONS[t.id]);
        const keep = topic ? (LESSONS[topic.id].hatirlanacaklar || []).slice(0, 3) : [];
        return (
          <Card key={f}>
            <Row wrap={false}><T v="h3" style={{ flex: 1 }}>{FAMILIES[f].n}</T><LightBadge l={fam(f).light} /></Row>
            <Box kind="puf" title="Kontrol aracı"><T v="small">{FAMILIES[f].tool}</T></Box>
            {m ? (
              <Box kind="senin" title={`🧍 Senin son hatan · ${mistakeRef(m)}`}>
                <T v="small">{m.q}</T>
                <T v="small">Sen: <Text style={{ color: c.bad, fontWeight: "700" }}>{m.ua != null ? m.o[m.ua] : "boş"}</Text> → Doğrusu: <Text style={{ color: c.ok, fontWeight: "700" }}>{m.o[m.a]}</Text></T>
                {m.tip || m.x ? <T v="small" muted>{m.tip || m.x}</T> : null}
              </Box>
            ) : null}
            {keep.length ? <Box kind="hatirla" title={`✅ ${topic!.t}: hatırlanacaklar`}><List v="small" items={keep} /></Box> : null}
          </Card>
        );
      })}
    </>
  );
}

function Eval({ P }: { P: P }) {
  const c = useColors();
  const s = P.sum;
  if (!s || !s.n)
    return (
      <>
        <Notice text="Bu oturumda soru çözülmedi." />
        <Row><Spacer /><Btn kind="pri" title="Kapat" onPress={nav.close} /></Row>
      </>
    );
  const t = P.topic;
  const r = P.result;
  const stat = (l: string, v: string, color?: string) => (
    <View style={{ minWidth: 70 }}>
      <T v="label">{l}</T>
      <T v="h2" color={color}>{v}</T>
    </View>
  );
  // Günün sonucu: konu ilerledi mi, yarın ne var
  let verdict: React.ReactNode;
  if (P.review) verdict = <T v="small">Konu tekrarı tamam. Bu oturum konunun durumunu değiştirmez; yanlışların deftere ve hata türlerine işlendi.</T>;
  else if (P.sk === "short") verdict = <T v="small">Kısa ek set tamam.</T>;
  else if (!P.complete) verdict = <Notice warn text="Test bitirilmedi: gün yarım kaldı ve konu ilerlemedi. Bugün içinde yeniden başlatıp tamamlayabilirsin." />;
  else if (P.wasTanima) verdict = <T v="small">{P.tanimaDone ? "Seni tanıma aşaması tamamlandı. Eksiklerin belirlendi; bir sonraki oturumdan itibaren planına göre devam ediyoruz." : `${famsKnown()}/${TANIMA_GOAL} hata türünde veri var. Bir iki oturum daha teşhis ağırlıklı devam edeceğiz.`}</T>;
  else if (P.plan.type === "tekrar") verdict = <T v="small">Açık kapama günü tamam. Hâlâ açık kalan türler varsa yarın yine üstüne gideceğiz; kapandıysa konuya dönüyoruz.</T>;
  else if (r && r.outcome === "pass") verdict = <T v="small"><Text style={{ color: c.ok, fontWeight: "700" }}>✓ Konu tamamlandı (%{r.p}).</Text> {r.next ? `Sıradaki konu: ${r.next.t}.` : "Bütün konular bitti."}</T>;
  else if (r && r.outcome === "weakpass") verdict = <T v="small"><Text style={{ color: c.warn, fontWeight: "700" }}>Konu zayıf geçildi (%{r.p}).</Text> İki denemede de %{PASS} olmadı; takılıp kalmamak için ilerliyoruz. Bu konunun hata türleri önümüzdeki günlerde daha sık sorulacak. {r.next ? `Sıradaki konu: ${r.next.t}.` : ""}</T>;
  else if (r && r.outcome === "gap") verdict = <T v="small"><Text style={{ color: c.warn, fontWeight: "700" }}>Konu oturmak üzere (%{r.p}).</Text> Geçmek için %{PASS} gerekiyor. Yarın bu konunun açıklarını kapatacağız, ardından testi yeniden çözeceksin.</T>;
  else if (r && r.outcome === "retry") verdict = <T v="small"><Text style={{ color: c.bad, fontWeight: "700" }}>Konu henüz oturmadı (%{r.p}).</Text> Yarın konuyu yeniden çalışıp testi tekrar çözeceğiz.</T>;
  else verdict = <T v="small">Oturum tamam.</T>;

  return (
    <Stagger>
      <Card>
        <Row gap={18}>
          <View style={{ minWidth: 70 }}>
            <T v="label">İlk deneme</T>
            <Row gap={0} wrap={false}><Count to={s.c} /><T v="big">/{s.n}</T></Row>
          </View>
          {stat("Sonunda", `${s.cf}/${s.n}`)}
          {stat("Soru başına", `${s.spq ?? "—"} sn`, s.spq && s.spq < 75 ? c.bad : undefined)}
          {stat("Süre", `${s.dur} dk`)}
        </Row>
        {s.h1 !== null && s.h2 !== null ? <T v="small">Testin ilk yarısı %{s.h1}, ikinci yarısı %{s.h2}.{s.h2 < s.h1 - 10 ? " Yanlışlar hızlanan ikinci yarıda toplanmış." : ""}</T> : null}
        {s.unsure ? <T v="small">★ Emin olmadan işaretlediğin {s.unsure} sorunun {s.unsureOk} tanesi doğru.</T> : null}
        {s.sureWrong ? <T v="small"><Text style={{ fontWeight: "700" }}>Emin olup yanlış yaptığın {s.sureWrong} soru var:</Text> bilgi var ama kontrol eksik olabilir. 10 saniyelik kontrolü uygula: soru tipi → etiket → şık.</T> : null}
        {s.reps.length ? <T v="small">Gizli tekrarlar: {s.reps.map((x) => `${FAMILIES[x.fam].n} ${x.ok ? "✓" : "✗"}`).join(" · ")}</T> : null}
      </Card>
      <Card accent={!!r && r.outcome === "pass"}>
        <T v="h3">{P.plan.type === "konu" && t ? t.t : "Günün sonucu"}</T>
        {verdict}
        <Row><Btn kind="pri" title="Bitir" onPress={nav.close} /></Row>
      </Card>
      <Card>
        <T v="h3">Hata türleri</T>
        <Table rows={Object.entries(s.byFam).map(([k, b]) => [FAMILIES[k].n, `${b.c}/${b.n}`, <LightBadge key={k} l={fam(k).light} />])} />
      </Card>
      {P.decision ? (
        <Card>
          <T v="h3">Karar notu</T>
          <DecisionView d={P.decision} />
        </Card>
      ) : null}
    </Stagger>
  );
}
