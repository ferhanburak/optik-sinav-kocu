// Günlük oturum: plan → ısınma → kelimeler → kelime tekrarı → konu → set → değerlendirme
import React, { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { LESSONS } from "../content";
import { FAMILIES, TANIMA_GOAL } from "../data/catalog";
import { fmtShort, mmss, pct, today, uid } from "../lib/dates";
import { activeTopic, addVocab, advanceTopic, buildBankSet, checkTanimaDone, decisionFor, dueFams, fam, famsKnown, newCardState, newVocab, summarize, type Done, type Summary } from "../lib/engine";
import { nav } from "../lib/nav";
import { S, save } from "../lib/store";
import type { CardState, Decision, Question, Topic, VocabItem } from "../types";
import { LessonView } from "../ui/LessonView";
import { QuestionCard } from "../ui/QuestionCard";
import { Btn, Card, Count, LightBadge, Notice, Row, Seg, Spacer, T, Table, toast } from "../ui/kit";
import { FadeIn, Stagger, useFill } from "../ui/motion";
import { useColors } from "../ui/theme";
import { DecisionView, PlanLines, sessionPlanLines } from "../screens/Today";
import { VocabCard } from "../screens/Vocab";
import { VocabQuiz } from "./VocabQuiz";
import { Shell, useMutable, useTick } from "./Shell";

type Phase = "plan" | "warm" | "vocab" | "vrev" | "lesson" | "test" | "eval";
const LABS: Record<Phase, string> = { plan: "Plan", warm: "Isınma", vocab: "Kelimeler", vrev: "Kelime tekrarı", lesson: "Konu", test: "Set", eval: "Değerlendirme" };

interface P {
  sk: "normal" | "short" | "A" | "B";
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
  wasTanima?: boolean;
  tanimaDone?: boolean;
  saved?: boolean;
  leaveArm?: boolean;
}

function init(sk: P["sk"]): P {
  const t = activeTopic();
  const short = sk === "short";
  const B = sk === "B";
  const due = dueFams();
  const repN = short ? 1 : B ? Math.min(5, due.length) : Math.min(3, due.length);
  const half = Math.ceil(repN / 2) || 0;
  const lesson = !S.tanima && t && t.kind !== "review" && LESSONS[t.id];
  let phases: Phase[] = short ? ["plan", "warm", "vrev", "test", "eval"] : B ? ["plan", "warm", "test", "eval"] : ["plan", "warm", "vocab", "vrev", "lesson", "test", "eval"];
  if (!lesson) phases = phases.filter((x) => x !== "lesson");
  const vrev = S.vocab.filter((v) => v.day < today()).sort((a, b) => (a.due < b.due ? -1 : 1)).slice(0, 5);
  if (!vrev.length) phases = phases.filter((x) => x !== "vrev");
  const vocabNew = phases.includes("vocab") ? newVocab(15) : [];
  if (!vocabNew.length) phases = phases.filter((x) => x !== "vocab");
  const n = short ? 5 : 16;
  const warm = buildBankSet({ n: short ? 3 : 6, warm: true, repFams: due.slice(0, half) }) || [];
  const test = buildBankSet({ n, topic: t && t.kind !== "review" ? t : null, repFams: due.slice(half, repN), tanima: S.tanima }) || [];
  return { sk, topic: t, t0: Date.now(), phase: "plan", phases, warm, test, vocabNew, vrev, lessonPart: 0, wi: 0, ti: 0, cards: {} };
}

export function SessionPlayer({ sk }: { sk: P["sk"] }) {
  const c = useColors();
  const [P, redraw] = useMutable(() => init(sk));
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
    if (sum.n) {
      S.sessions.push({ id: uid(), date: today(), kind: S.tanima ? "tanima" : P.sk === "short" ? "kisa" : P.sk === "A" || P.sk === "B" ? "telafi" : "oturum", topic: P.topic ? P.topic.id : null, n: sum.n, c: sum.c, cf: sum.cf, p: pct(sum.c, sum.n), pf: pct(sum.cf, sum.n), spq: sum.spq, dur: sum.dur });
      const d = decisionFor(sum, P.topic, P.t0);
      S.decisions.push({ t: Date.now(), d });
      P.decision = d;
      save();
    }
    P.wasTanima = S.tanima;
    P.tanimaDone = checkTanimaDone();
  };

  const close = () => {
    if (running && !P.leaveArm) {
      P.leaveArm = true;
      toast("Çıkarsan buraya kadar çözdüklerin kaydedilir. Çıkmak için tekrar bas.");
      return;
    }
    if (P.phase !== "plan") finish();
    nav.close();
  };

  const quiz = (key: "warm" | "test") => {
    const qs = key === "warm" ? P.warm : P.test;
    const i = key === "warm" ? P.wi : P.ti;
    const q = qs[i];
    const name = key === "warm" ? "Isınma" : "Set";
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
        <T v="h3">{P.sk === "A" ? "Seans A" : P.sk === "B" ? "Seans B" : "Bugün"}</T>
        <PlanLines lines={sessionPlanLines(P.sk === "short")} />
        <T v="small" muted>{S.profile.format === "step" ? "Adım adım ilerleyeceğiz: her ekranda tek adım. Yanlışta önce ipucu, sonra bir deneme hakkı daha." : "Konu anlatımı tek sayfada gelecek; set yine soru soru ilerler."}</T>
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
            <>
              <Btn kind="ghost" title="Sete geç" onPress={next} />
              <Btn kind="pri" title="Sonraki part ›" onPress={() => { P.lessonPart++; redraw(); }} />
            </>
          ) : (
            <Btn kind="pri" title="Sete geç ›" onPress={next} />
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
          <Text style={{ fontSize: 12, fontWeight: "700", color: i === ci ? "#fff" : c.muted }}>{i + 1} {LABS[s]}</Text>
        </View>
      ))}
    </Row>
  );

  return (
    <Shell
      title={`${P.topic ? P.topic.t : "Oturum"} · ${fmtShort(today())}`}
      onClose={close}
      scrollKey={`${P.phase}-${P.wi}-${P.ti}-${P.lessonPart}`}
      right={running ? (
        <Row gap={6} wrap={false}>
          <T v="mono" color={c.guide}>{mmss((Date.now() - P.t0) / 1000)}</T>
          <Btn sm kind="ghost" title="Odak" onPress={() => setFocus(true)} />
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
              <T v="small" muted>Odaklanamıyor musun? Ne yapalım?</T>
              <Btn title="Mola: 5 dakika ara ver" onPress={() => { setFocus(false); toast("5 dakika mola. Kalemi bırak, 3 nefes al. Hazır olunca kaldığın yerden devam et.", 8000); }} />
              <Btn title="Kısa yol: kalan sette 3 soru bırak" onPress={() => { P.test = P.test.slice(0, Math.min(P.test.length, (P.phase === "test" ? P.ti : 0) + 3)); setFocus(false); toast("Set kısaltıldı."); redraw(); }} />
              <Btn title="Bırak: buraya kadarını değerlendir" onPress={() => { setFocus(false); P.phase = "eval"; finish(); redraw(); }} />
            </Card>
          </Pressable>
        </Pressable>
      </Modal>
    </Shell>
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
  const canAdv = t && S.topics.find((x) => x.id === t.id && x.status === "aktif");
  const stat = (l: string, v: string, big?: boolean, color?: string) => (
    <View style={{ minWidth: 70 }}>
      <T v="label">{l}</T>
      <T v={big ? "big" : "h2"} color={color}>{v}</T>
    </View>
  );
  return (
    <Stagger>
      <Card>
        <Row gap={18}>
          <View style={{ minWidth: 70 }}>
            <T v="label">İlk deneme</T>
            <Row gap={0} wrap={false}><Count to={s.c} /><T v="big">/{s.n}</T></Row>
          </View>
          {stat("Sonunda", `${s.cf}/${s.n}`)}
          {stat("Soru başına", `${s.spq ?? "—"} sn`, false, s.spq && s.spq < 75 ? c.bad : undefined)}
          {stat("Süre", `${s.dur} dk`)}
        </Row>
        {s.h1 !== null && s.h2 !== null ? <T v="small">Setin ilk yarısı %{s.h1}, ikinci yarısı %{s.h2}.{s.h2 < s.h1 - 10 ? " Yanlışlar hızlanan ikinci yarıda toplanmış." : ""}</T> : null}
        {s.unsure ? <T v="small">★ Emin olmadan işaretlediğin {s.unsure} sorunun {s.unsureOk} tanesi doğru.</T> : null}
        {s.sureWrong ? <T v="small"><Text style={{ fontWeight: "700" }}>Emin olup yanlış yaptığın {s.sureWrong} soru var:</Text> bilgi var ama kontrol eksik olabilir. 10 saniyelik kontrolü uygula: aile → etiket → şık.</T> : null}
        {s.reps.length ? <T v="small">Gizli tekrarlar: {s.reps.map((r) => `${FAMILIES[r.fam].n} ${r.ok ? "✓" : "✗"}`).join(" · ")}</T> : null}
      </Card>
      <Card>
        <T v="h3">Aileler</T>
        <Table rows={Object.entries(s.byFam).map(([k, b]) => [FAMILIES[k].n, `${b.c}/${b.n}`, <LightBadge key={k} l={fam(k).light} />])} />
      </Card>
      {P.decision ? (
        <Card>
          <T v="h3">Karar notu</T>
          <DecisionView d={P.decision} />
        </Card>
      ) : null}
      {P.wasTanima ? (
        <Card>
          <T v="h3">Seni tanıma aşaması</T>
          <T v="small">{P.tanimaDone ? "Tamamlandı. Eksiklerin belirlendi; bir sonraki oturumdan itibaren konu anlatımlarıyla devam ediyoruz." : `${famsKnown()}/${TANIMA_GOAL} hata ailesinde veri var. Bir iki oturum daha teşhis ağırlıklı devam edeceğiz.`}</T>
          <Row><Btn kind="pri" title="Bitir" onPress={nav.close} /></Row>
        </Card>
      ) : (
        <Card>
          <T v="h3">Konu</T>
          <T v="small" muted>{t ? `“${t.t}” konusunda` : "Bu oturumda"} kalmak ya da yeni konuya geçmek senin kararın.</T>
          <Row>
            {canAdv ? (
              <>
                <Btn kind="pri" title="Devam: sonraki konuya geç" onPress={() => { const n = advanceTopic(); save(); toast(n ? `Yeni konu: ${n.t}` : "Bütün konular tamam."); nav.close(); }} />
                <Btn title="Bu konuda kalalım" onPress={nav.close} />
              </>
            ) : (
              <Btn kind="pri" title="Bitir" onPress={nav.close} />
            )}
          </Row>
        </Card>
      )}
    </Stagger>
  );
}
