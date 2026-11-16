// Soru kartı: önce etiket → şıklar → yanlışta ipucu + ikinci deneme → açıklama ve "Neden bunu seçtin?"
import React, { useReducer } from "react";
import { Animated, Text, View } from "react-native";
import { DIAG, FAMILIES, LABELS, LETTERS, SECTIONS } from "../data/catalog";
import { cardPick, labelType, lightLabel, saveDiag } from "../lib/engine";
import type { CardState, Question } from "../types";
import { Btn, Chip, Inl, Input, Row, Spacer, T } from "./kit";
import { FadeIn, Press, haptic, useAnswerFx } from "./motion";
import { elev, radius, useColors } from "./theme";

export function Passage({ text }: { text: string }) {
  const c = useColors();
  return (
    <View style={{ backgroundColor: c.bg, borderLeftWidth: 3, borderLeftColor: c.guideLine, borderRadius: radius.input, padding: 14 }}>
      <T v="small" style={{ lineHeight: 21 }}>{text}</T>
    </View>
  );
}

export function Opt({ i, text, state, onPress, disabled, sub }: { i: number; text: string; state?: "right" | "wrong" | "tried" | "picked" | ""; onPress?: () => void; disabled?: boolean; sub?: string }) {
  const c = useColors();
  const border = state === "right" ? c.ok : state === "wrong" ? c.bad : state === "picked" ? c.ink : c.line;
  const bg = state === "right" ? c.okSoft : state === "wrong" ? c.badSoft : c.paper;
  const bubble = state === "picked" || state === "right" || state === "wrong";
  const fx = useAnswerFx(state);
  return (
    <Animated.View style={fx}>
    <Press
      accessibilityRole="button"
      accessibilityLabel={`${LETTERS[i]}) ${text}`}
      accessibilityState={{ selected: state === "picked", disabled: disabled || !onPress }}
      disabled={disabled || !onPress}
      onPress={onPress}
      scaleTo={0.985}
      inner={{ flexDirection: "row", gap: 12, alignItems: "center", borderWidth: 1.5, borderColor: border, backgroundColor: bg, borderRadius: radius.opt, paddingVertical: 11, paddingHorizontal: 12, opacity: state === "tried" ? 0.45 : 1 }}
    >
      {/* Optik form balonu: boşken pembe kılavuz çizgisi, işaretlenince dolu ve hafif kabartmalı */}
      <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: bubble ? border : c.guide, backgroundColor: state === "picked" ? c.ink : state === "right" ? c.ok : state === "wrong" ? c.bad : c.guideSoft, alignItems: "center", justifyContent: "center", boxShadow: bubble ? `inset 0px 1px 0px ${c.shine}` : undefined }}>
        <Text style={{ fontSize: 12, fontWeight: "800", color: bubble ? c.paper : c.guide }}>{LETTERS[i]}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <T>{text}</T>
        {sub ? <T v="small" muted>{sub}</T> : null}
      </View>
    </Press>
    </Animated.View>
  );
}

export interface Meta {
  title: string;
  pos: string;
  last: boolean;
  fast?: boolean;
}

export function QuestionCard({ q, st, meta, src, onNext }: { q: Question; st: CardState; meta: Meta; src: string; onNext: () => void }) {
  const c = useColors();
  const [, redraw] = useReducer((x: number) => x + 1, 0);
  const lt = labelType(q);
  const L = lt ? LABELS[lt] : null;
  const done = st.stage === "done";
  const retry = st.stage === "retry";
  const showLabel = !!L && st.stage === "label";
  if (!L && st.stage === "label") st.stage = "opts";
  const fam = FAMILIES[q.fam];

  const pick = (j: number) => {
    if (!cardPick(q, st, j, src)) return;
    if (j === q.a) haptic.ok();
    else haptic.bad();
    redraw();
  };
  const toOpts = () => {
    st.stage = "opts";
    st.t0 = Date.now();
    redraw();
  };
  const ok1 = st.first === q.a;
  const ok2 = st.second === q.a;
  const fc = st.famChange;

  return (
    <FadeIn y={14} style={{ backgroundColor: c.paper, borderColor: c.line, borderWidth: 1, borderRadius: radius.card, padding: 16, gap: 14, boxShadow: elev(c) }}>
      <Row>
        <T v="mono" color={c.guide}>{meta.title}</T>
        <Chip text={SECTIONS[q.sec] || ""} />
        {meta.fast ? <Chip text="⏱ hızlı bölüm" color={c.bad} /> : null}
        <Spacer />
        {!done ? <Btn sm title="★ Emin değilim" on={st.un} onPress={() => { st.un = !st.un; redraw(); }} /> : null}
      </Row>
      {q.p ? <Passage text={q.p} /> : null}
      <T style={{ fontSize: 16, lineHeight: 24 }}>{q.q}</T>

      {showLabel && L ? (
        <View style={{ backgroundColor: c.guideSoft, borderColor: c.guideLine, borderWidth: 1, borderRadius: radius.opt, padding: 14, gap: 10 }}>
          <T v="small" style={{ fontWeight: "700" }}>Önce etiket: {L.q}</T>
          {L.t === "btn" ? (
            <>
              <Row>
                {(L.o || []).map((o) => (
                  <Btn key={o} title={o} on={st.label === o} onPress={() => { st.label = o; toOpts(); }} />
                ))}
              </Row>
              <T v="small" muted>{L.h}</T>
            </>
          ) : (
            <>
              <Input placeholder={L.ph} defaultValue={st.label} onChangeText={(t) => (st.label = t.trim())} onSubmitEditing={toOpts} returnKeyType="next" />
              <Row><Btn sm kind="pri" title="Şıklara geç" onPress={toOpts} /></Row>
            </>
          )}
          <Row><Btn sm kind="ghost" title="Etiketsiz geç" onPress={() => { st.label = ""; toOpts(); }} /></Row>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {q.o.map((o, j) => {
            let s: "right" | "wrong" | "tried" | "" = "";
            if (done) s = j === q.a ? "right" : j === st.first || j === st.second ? "wrong" : "";
            else if (retry && j === st.first) s = "tried";
            return <Opt key={j} i={j} text={o} state={s} disabled={done || (retry && j === st.first)} onPress={() => pick(j)} />;
          })}
        </View>
      )}

      {retry ? (
        <FadeIn style={{ backgroundColor: c.markSoft, borderRadius: radius.opt, padding: 14, gap: 4 }}>
          <T v="small"><Text style={{ fontWeight: "700" }}>💡 İpucu: </Text>{q.hint || fam.tool}</T>
          <T v="small" muted>Bir kez daha dene. Resmî skor ilk denemen.</T>
        </FadeIn>
      ) : null}

      {done ? (
        <FadeIn delay={120} style={{ backgroundColor: c.bg, borderRadius: radius.opt, padding: 14, gap: 8 }}>
          <T style={{ fontWeight: "700" }} color={ok1 ? c.ok : ok2 ? c.warn : c.bad}>
            {ok1 ? (st.un ? "Doğru (emin değildin, yarım sayıldı)." : "İlk denemede doğru.") : ok2 ? "İkinci denemede doğru. Puana sayılmaz, “sonunda” olarak not edildi." : `Doğrusu ${LETTERS[q.a]}.`}
          </T>
          <Inl text={q.x} v="small" />
          {q.d.some(Boolean) ? (
            <View style={{ gap: 2 }}>
              {q.d.map((t, j) => (t && j !== q.a ? <T key={j} v="small"><Text style={{ fontWeight: "700" }}>{LETTERS[j]}) </Text>{t}</T> : null))}
            </View>
          ) : null}
          {q.tip ? <T v="small">💡 <Text style={{ fontWeight: "700" }}>Püf: </Text>{q.tip}</T> : null}
          {st.label ? (
            L && L.t === "btn" ? (
              <T v="small">
                Etiketin <Text style={{ fontWeight: "700" }}>{st.label}</Text>
                {q.lab ? <>, beklenen <Text style={{ fontWeight: "700" }}>{q.lab}</Text> {st.label === q.lab ? "✓" : "✗"}</> : null}
                {q.lab && st.label !== q.lab && ok1 ? " (şık doğru ama etiket yanlış: puana yansımaz)" : ""}
              </T>
            ) : (
              <T v="small">Senin yazdığın: <Text style={{ fontStyle: "italic" }}>{st.label}</Text>{q.lab ? ` · örnek: ${q.lab}` : ""}</T>
            )
          ) : q.lab && L ? (
            <T v="small" muted>Beklenen etiket: {q.lab}</T>
          ) : null}
          <T v="small" muted>Aile: {fam.n} · {fam.tool}</T>
          {q.rep ? (
            <T v="small" color={c.guide}>
              🔁 Bu bir gizli tekrardı: {q.repFrom ? `${q.repFrom} tarihli ` : ""}“{fam.n}” tuzağının aynısı.{fc && fc.before !== fc.after ? ` Durum: ${lightLabel(fc.before)} → ${lightLabel(fc.after)}.` : ""}
            </T>
          ) : fc && fc.before !== fc.after ? (
            <T v="small" color={c.guide}>Aile durumu: {lightLabel(fc.before)} → {lightLabel(fc.after)}</T>
          ) : null}
        </FadeIn>
      ) : null}

      {done && (!ok1 || st.un) ? (
        <FadeIn delay={220} style={{ gap: 8 }}>
          <T v="small" style={{ fontWeight: "700" }}>Neden bunu seçtin?</T>
          <Row gap={6}>
            {DIAG.map((d) => (
              <Btn key={d} sm title={d} on={st.diag.includes(d)} onPress={() => {
                const i = st.diag.indexOf(d);
                if (i >= 0) st.diag.splice(i, 1);
                else st.diag.push(d);
                saveDiag(st);
                redraw();
              }} />
            ))}
          </Row>
          <Input placeholder="Kendi cümlenle (isteğe bağlı)" defaultValue={st.diagTxt} onChangeText={(t) => (st.diagTxt = t)} onEndEditing={() => saveDiag(st)} />
        </FadeIn>
      ) : null}

      <Row>
        <T v="small" muted>{meta.pos}</T>
        <Spacer />
        {done ? <Btn kind="pri" title={meta.last ? "Bitir ›" : "Sonraki ›"} onPress={() => { saveDiag(st); onNext(); }} /> : null}
      </Row>
    </FadeIn>
  );
}
