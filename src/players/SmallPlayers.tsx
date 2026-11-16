// Drill (bir aileden 3 soru), seviye testi ve 10 dk kelime tekrarı
import React from "react";
import { View } from "react-native";
import { FAMILIES, PLACEMENT } from "../data/catalog";
import { pct, shuffle, today, uid } from "../lib/dates";
import { drillQuestions, fam, newCardState, placementApply } from "../lib/engine";
import { nav } from "../lib/nav";
import { S } from "../lib/store";
import type { CardState, Question } from "../types";
import { QuestionCard } from "../ui/QuestionCard";
import { Btn, Card, Count, LightBadge, Notice, Row, Spacer, T, Table, toast } from "../ui/kit";
import { Shell, useMutable } from "./Shell";
import { VocabQuiz } from "./VocabQuiz";

export function DrillPlayer({ f }: { f: string }) {
  const [P, redraw] = useMutable(() => ({ qs: drillQuestions(f), i: 0, cards: {} as Record<number, CardState> }));
  const done = P.i >= P.qs.length;
  const c = P.qs.filter((q, i) => P.cards[i] && P.cards[i].first === q.a).length;
  return (
    <Shell title={FAMILIES[f].n} onClose={nav.close} scrollKey={P.i} progress={P.qs.length ? P.i / P.qs.length : 0}>
      {!P.qs.length ? (
        <Notice text="Bu aile için hazır soru bulunamadı." />
      ) : done ? (
        <>
          <Card>
            <Row gap={24}>
              <View><T v="label">Sonuç</T><Row gap={0} wrap={false}><Count to={c} /><T v="big">/{P.qs.length}</T></Row></View>
              <View><T v="label">Durum</T><LightBadge l={fam(f).light} /></View>
            </Row>
          </Card>
          <Row><Spacer /><Btn kind="pri" title="Bitir" onPress={nav.close} /></Row>
        </>
      ) : (
        <QuestionCard
          key={P.i}
          q={P.qs[P.i]}
          st={(P.cards[P.i] = P.cards[P.i] || newCardState(`D${P.i + 1}`))}
          src="drill"
          meta={{ title: `Soru ${P.i + 1}`, pos: `${P.i + 1} / ${P.qs.length}`, last: P.i === P.qs.length - 1 }}
          onNext={() => { P.i++; redraw(); }}
        />
      )}
    </Shell>
  );
}

export function PlacementPlayer() {
  const [P, redraw] = useMutable(() => ({
    qs: PLACEMENT.map((q): Question => ({ id: uid(), fam: q.fam, sec: q.sec, p: q.p || "", q: q.q, o: q.o, a: q.a, lab: q.lab || "", hint: "", x: q.x, d: [], tip: "", rep: false })),
    i: 0,
    cards: {} as Record<number, CardState>,
    t0: Date.now(),
    result: null as null | { n: number; c: number },
  }));
  const n = P.qs.length;
  const close = () => {
    if (!P.result && P.i > 0) toast("Seviye testi yarım kaldı; Bugün ekranından yeniden başlatabilirsin.");
    nav.close();
  };
  if (P.i >= n && !P.result) P.result = placementApply(P.qs, P.cards, P.t0);
  const by: Record<string, { n: number; c: number }> = {};
  if (P.result)
    P.qs.forEach((q, i) => {
      const b = (by[q.fam] = by[q.fam] || { n: 0, c: 0 });
      b.n++;
      if (P.cards[i] && P.cards[i].first === q.a) b.c++;
    });
  return (
    <Shell title="Seviye testi" onClose={close} scrollKey={P.i} progress={P.i / n}>
      {P.result ? (
        <>
          <Card>
            <Row gap={24}>
              <View><T v="label">Seviye testi</T><Row gap={0} wrap={false}><Count to={P.result.c} /><T v="big">/{n}</T></Row></View>
              <View><T v="label">Tahmini seviye</T><T v="h2">~{pct(P.result.c, n)}</T></View>
            </Row>
            <T v="small" muted>{n} soruluk kısa testten kaba bir tahmin. Denemeler çözdükçe netleşir.</T>
          </Card>
          <Card>
            <T v="h3">Aileler</T>
            <Table rows={Object.entries(by).sort((a, b) => a[1].c / a[1].n - b[1].c / b[1].n).map(([k, b]) => [FAMILIES[k].n, `${b.c}/${b.n}`, <LightBadge key={k} l={fam(k).light} />])} />
          </Card>
          <Row><Spacer /><Btn kind="pri" title="Başlayalım ›" onPress={() => { nav.close(); nav.tab("bugun"); toast("Hazırız. Bugünün oturumu “Başla” ile açılır.", 6000); }} /></Row>
        </>
      ) : (
        <QuestionCard
          key={P.i}
          q={P.qs[P.i]}
          st={(P.cards[P.i] = P.cards[P.i] || newCardState(`T${P.i + 1}`))}
          src="seviye"
          meta={{ title: `Soru ${P.i + 1}`, pos: `${P.i + 1} / ${n}`, last: P.i === n - 1 }}
          onNext={() => { P.i++; redraw(); }}
        />
      )}
    </Shell>
  );
}

export function VocabReviewPlayer() {
  const [P] = useMutable(() => {
    const due = S.vocab.filter((v) => v.due <= today());
    const todays = S.vocab.filter((v) => v.day === today());
    const list = [...new Map([...due, ...todays].map((v) => [v.id, v])).values()].slice(0, 20);
    return { list: list.length ? list : shuffle(S.vocab).slice(0, 10) };
  });
  return (
    <Shell title="10 dk kelime tekrarı" onClose={nav.close}>
      <VocabQuiz list={P.list} title="Kelime" onDone={nav.close} doneLabel="Bitir" />
    </Shell>
  );
}
