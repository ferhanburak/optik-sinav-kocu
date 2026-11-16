// Kelime tekrarı: anlamını 4 şıktan seç (yeterli kelime yoksa "Biliyorum / Bilmiyorum")
import React, { useMemo, useState } from "react";
import { View } from "react-native";
import { shuffle } from "../lib/dates";
import { vocabAnswer } from "../lib/engine";
import { S } from "../lib/store";
import type { VocabItem } from "../types";
import { Opt } from "../ui/QuestionCard";
import { Btn, Card, Notice, Row, Spacer, T } from "../ui/kit";
import { useColors } from "../ui/theme";

export function VocabQuiz({ list, title, onDone, doneLabel }: { list: VocabItem[]; title: string; onDone: () => void; doneLabel: string }) {
  const c = useColors();
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [res, setRes] = useState<boolean[]>([]);
  const v = list[i];
  const opts = useMemo(() => {
    if (!v) return [];
    const pool = shuffle(S.vocab.filter((x) => x.id !== v.id && x.m !== v.m)).slice(0, 3).map((x) => x.m);
    return shuffle([v.m, ...pool]);
  }, [v]);
  if (!list.length)
    return <Row><Spacer /><Btn kind="pri" title={doneLabel} onPress={onDone} /></Row>;
  if (!v)
    return (
      <>
        <Notice text={`Kelime tekrarı bitti: ${res.filter(Boolean).length}/${list.length} doğru.`} />
        <Row><Spacer /><Btn kind="pri" title={doneLabel} onPress={onDone} /></Row>
      </>
    );
  const answer = (ok: boolean, j: number) => {
    setPick(j);
    const r = res.slice();
    r[i] = ok;
    setRes(r);
    vocabAnswer(v.id, ok);
  };
  const mcq = opts.length >= 3;
  return (
    <Card>
      <Row><T v="mono" color={c.guide}>{title}</T><Spacer /><T v="small" muted>{i + 1} / {list.length}</T></Row>
      <T v="h1">{v.prep ? "🔹 " : ""}{v.w}</T>
      {mcq ? (
        <View style={{ gap: 8 }}>
          {opts.map((o, j) => (
            <Opt key={j} i={j} text={o} disabled={pick !== null} state={pick === null ? "" : o === v.m ? "right" : j === pick ? "wrong" : ""} onPress={() => answer(o === v.m, j)} />
          ))}
        </View>
      ) : pick === null ? (
        <Row><Btn title="Biliyorum" onPress={() => answer(true, -1)} /><Btn title="Bilmiyorum" onPress={() => answer(false, -1)} /></Row>
      ) : null}
      {pick !== null ? (
        <>
          <View style={{ backgroundColor: c.bg, borderRadius: 8, padding: 10 }}>
            <T style={{ fontWeight: "700" }}>{v.m}</T>
            {v.ex ? <T v="small" muted style={{ fontStyle: "italic" }}>{v.ex}</T> : null}
          </View>
          <Row><Spacer /><Btn kind="pri" title="Sonraki ›" onPress={() => { setI(i + 1); setPick(null); }} /></Row>
        </>
      ) : null}
    </Card>
  );
}
