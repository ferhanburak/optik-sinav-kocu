// Deneme: ileri sayan süre, bölüm çipleri, cevap haritası, 🔖 sonra dön, ★ emin değilim, 16/26/40 kontrol noktaları
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { FAMILIES, LETTERS, MOCK_MODES, SECTIONS, type MockMode } from "../data/catalog";
import { hhmmss, pct, today, uid } from "../lib/dates";
import { buildMock, famUpdate, recordAttempt } from "../lib/engine";
import { nav } from "../lib/nav";
import { S, save } from "../lib/store";
import { Opt, Passage } from "../ui/QuestionCard";
import { Bar, Btn, Card, Chip, Inl, Notice, Row, Spacer, T, Table, toast } from "../ui/kit";
import { levelColor, useColors } from "../ui/theme";
import { Shell, useMutable, useTick } from "./Shell";

interface Result {
  c: number; w: number; n: number; dur: number; score: number; un: number; unOk: number;
  sureWrong: number[];
  bySec: Record<string, { n: number; c: number; w: number }>;
}

export function MockPlayer({ mode }: { mode: MockMode }) {
  const c = useColors();
  const M = MOCK_MODES[mode];
  const [P, redraw] = useMutable(() => {
    const { qs, skipped } = buildMock(mode);
    const secs: { s: string; from: number; n: number }[] = [];
    qs.forEach((q, i) => {
      const last = secs[secs.length - 1];
      if (last && last.s === q.sec) last.n++;
      else secs.push({ s: q.sec, from: i, n: 1 });
    });
    return {
      qs, secs, skipped, total: qs.length, limit: Math.round((qs.length / M.n) * M.min * 60),
      ans: qs.map(() => null as number | null), uns: qs.map(() => false), flg: qs.map(() => false),
      cur: 0, t0: Date.now(), cp: {} as Record<number, number>, showMap: false, confirm: false, leaveArm: false, result: null as Result | null,
    };
  });
  useTick(!P.result);

  const go = (i: number) => {
    P.cur = i;
    P.confirm = false;
    redraw();
  };
  const finish = () => {
    if (P.result) return;
    const qs = P.qs;
    let cc = 0, w = 0, un = 0, unOk = 0;
    const bySec: Result["bySec"] = {};
    const sureWrong: number[] = [];
    qs.forEach((q, i) => {
      if (q.bid) S.seen[q.bid] = today();
      const a = P.ans[i];
      const b = (bySec[q.sec] = bySec[q.sec] || { n: 0, c: 0, w: 0 });
      b.n++;
      if (a === null) return;
      const ok = a === q.a;
      if (ok) { cc++; b.c++; } else { w++; b.w++; }
      if (P.uns[i]) { un++; if (ok) unOk++; } else if (!ok) sureWrong.push(i);
      recordAttempt(q, ok, ok, P.uns[i], 0, "deneme", "");
      famUpdate(q.fam, ok, P.uns[i]);
      if (!ok || P.uns[i]) S.mistakes.push({ id: uid(), t: Date.now(), fam: q.fam, sec: q.sec, p: q.p || "", q: q.q, o: q.o, a: q.a, ua: a, x: q.x, tip: q.tip, lab: q.lab, un: ok && P.uns[i] ? 1 : 0, diag: "" });
    });
    const dur = Math.round((Date.now() - P.t0) / 1000);
    const n = qs.length;
    const score = n === 80 ? +(cc * 1.25).toFixed(2) : +((cc / Math.max(1, n)) * 100).toFixed(1);
    P.result = { c: cc, w, n, dur, bySec, sureWrong, un, unOk, score };
    S.mocks.push({ id: uid(), date: today(), label: M.l, n, c: cc, w, score, dur, t40: P.cp[40] || null, cp: P.cp, bySec });
    S.sessions.push({ id: uid(), date: today(), kind: "mock", n, c: cc, cf: cc, p: pct(cc, n), pf: pct(cc, n), spq: cc + w ? Math.round(dur / (cc + w)) : null, dur: Math.round(dur / 60) });
    save();
    redraw();
  };
  const close = () => {
    if (!P.result && !P.leaveArm) {
      P.leaveArm = true;
      toast("Deneme kaydedilmeden kapanacak. Çıkmak için tekrar Çık'a bas.");
      return;
    }
    nav.close();
  };

  if (!P.qs.length)
    return (
      <Shell title={M.l} onClose={nav.close}>
        <Notice text="Bu deneme için yeterli hazır soru bulunamadı." />
      </Shell>
    );

  if (P.result) return <ResultView P={P} label={M.l} />;

  const e = (Date.now() - P.t0) / 1000;
  const answered = P.ans.filter((a) => a !== null).length;
  const q = P.qs[P.cur];
  const sec = P.secs.find((s) => P.cur >= s.from && P.cur < s.from + s.n);
  return (
    <Shell
      title={`${M.l} · ${P.total} soru`}
      onClose={close}
      scrollKey={P.cur}
      right={<View style={{ alignItems: "flex-end" }}><T v="mono">{hhmmss(e)}</T><T v="small" color={P.limit - e < 600 ? c.bad : c.muted}>kalan {hhmmss(Math.max(0, P.limit - e))}</T></View>}
    >
      {P.skipped.length ? <Notice text={`Hazır soru bankasında yetmeyen bölümler atlandı: ${P.skipped.join(", ")}. Deneme ${P.total} soruyla devam ediyor.`} /> : null}
      <Row gap={6}>
        {P.secs.map((s) => (
          <Btn key={s.from} sm on={sec === s} title={`${SECTIONS[s.s]} ${s.from + 1}–${s.from + s.n}`} onPress={() => go(s.from)} />
        ))}
      </Row>
      <Row>
        <Btn sm title={`Harita · ${answered}/${P.total}`} onPress={() => { P.showMap = !P.showMap; redraw(); }} />
        <Spacer />
        <Btn sm kind="pri" title={P.confirm ? "Emin misin? Bitir" : "Bitir"} onPress={() => { if (!P.confirm) { P.confirm = true; redraw(); } else finish(); }} />
      </Row>
      {P.showMap ? (
        <Card>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {P.qs.map((_, i) => (
              <Pressable key={i} onPress={() => go(i)} accessibilityLabel={`Soru ${i + 1}`} style={{ width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", borderWidth: P.flg[i] ? 1.5 : 1, borderStyle: P.flg[i] ? "dashed" : "solid", borderColor: i === P.cur ? c.guide : P.flg[i] ? c.guide : c.line, backgroundColor: P.ans[i] !== null ? c.ink : c.paper }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: P.ans[i] !== null ? c.paper : c.ink }}>{i + 1}</Text>
                {P.uns[i] ? <View style={{ position: "absolute", top: 1, right: 1, width: 8, height: 8, borderRadius: 4, backgroundColor: c.warn }} /> : null}
              </Pressable>
            ))}
          </View>
          <T v="small" muted>Dolu: işaretli · kesik çizgi: sonra dön · sarı nokta: emin değilim</T>
          <Row>
            <Btn sm title="İlk boş soruya git" onPress={() => { const i = P.ans.findIndex((a) => a === null); if (i >= 0) go(i); }} />
            <Btn sm title="Sonraki “sonra dön”" onPress={() => {
              for (let k = 1; k <= P.total; k++) {
                const i = (P.cur + k) % P.total;
                if (P.flg[i]) return go(i);
              }
              toast("“Sonra dön” işaretli soru yok.");
            }} />
          </Row>
        </Card>
      ) : null}
      <Card>
        <Row>
          <T v="mono" color={c.guide}>{P.cur + 1}</T>
          <Chip text={sec ? SECTIONS[sec.s] : ""} />
          <Spacer />
          <Btn sm title="🔖 Sonra dön" on={P.flg[P.cur]} onPress={() => { P.flg[P.cur] = !P.flg[P.cur]; redraw(); }} />
          <Btn sm title="★ Emin değilim" on={P.uns[P.cur]} onPress={() => { P.uns[P.cur] = !P.uns[P.cur]; redraw(); }} />
        </Row>
        {q.p ? <Passage text={q.p} /> : null}
        <T style={{ fontSize: 16, lineHeight: 24 }}>{q.q}</T>
        <View style={{ gap: 8 }}>
          {q.o.map((o, j) => (
            <Opt key={j} i={j} text={o} state={P.ans[P.cur] === j ? "picked" : ""} onPress={() => {
              P.ans[P.cur] = P.ans[P.cur] === j ? null : j;
              const qn = P.cur + 1;
              if ([16, 26, 40].includes(qn) && P.ans[P.cur] !== null && !P.cp[qn]) P.cp[qn] = Math.round((Date.now() - P.t0) / 1000);
              P.confirm = false;
              redraw();
            }} />
          ))}
        </View>
        <Row>
          <Btn title="‹ Önceki" disabled={P.cur === 0} onPress={() => go(P.cur - 1)} />
          {P.ans[P.cur] !== null ? <Btn sm kind="ghost" title="Cevabı sil" onPress={() => { P.ans[P.cur] = null; redraw(); }} /> : null}
          <Spacer />
          <Btn kind="pri" title="Sonraki ›" disabled={P.cur >= P.total - 1} onPress={() => go(P.cur + 1)} />
        </Row>
      </Card>
    </Shell>
  );
}

function ResultView({ P, label }: { P: any; label: string }) {
  const c = useColors();
  const r: Result = P.result;
  const blank = r.n - r.c - r.w;
  const cps = ([[16, 20], [26, 35], [40, 60]] as const).filter(([k]) => k <= r.n);
  const [open, setOpen] = useState<number | null>(null);
  const stat = (l: string, v: string, color?: string, big?: boolean) => (
    <View style={{ minWidth: 64 }}><T v="label">{l}</T><T v={big ? "big" : "h2"} color={color}>{v}</T></View>
  );
  return (
    <Shell title={`${label} · sonuç`} onClose={nav.close}>
      <Card>
        <Row gap={16}>
          {stat(r.n === 80 ? "YDS puanı" : "Tahmini puan", String(r.score), undefined, true)}
          {stat("Doğru", String(r.c), c.ok)}
          {stat("Yanlış", String(r.w), c.bad)}
          {stat("Boş", String(blank))}
          {stat("Süre", `${Math.round(r.dur / 60)} dk`)}
        </Row>
        {cps.length ? <T v="small"><Text style={{ fontWeight: "700" }}>Zaman kontrol noktaları: </Text>{cps.map(([k, exp]) => `${k}. soru ${P.cp[k] ? Math.round(P.cp[k] / 60) + " dk" : "—"} (hedef ~${exp} dk)`).join(" · ")}</T> : null}
        <T v="small"><Text style={{ fontWeight: "700" }}>★ isabeti: </Text>{r.un ? `emin olmadan işaretlediğin ${r.un} sorunun ${r.unOk} tanesi doğru.` : "★ işaretli soru yok."}</T>
        {r.sureWrong.length ? <T v="small"><Text style={{ fontWeight: "700" }}>Emin olup yanlış yaptıkların (bilgi var, kontrol yok): </Text>{r.sureWrong.map((i) => `${i + 1} (${FAMILIES[P.qs[i].fam].n})`).join(", ")}</T> : null}
      </Card>
      <Card>
        <T v="h3">Bölüm bölüm</T>
        <Table cols={["Bölüm", "Soru", "D", "Y", "Başarı"]} rows={Object.entries(r.bySec).map(([k, b]) => [SECTIONS[k], String(b.n), String(b.c), String(b.w), <Bar key={k} value={pct(b.c, b.n)} color={levelColor(c, b.c / b.n)} />])} />
      </Card>
      <Card>
        <T v="h3">Soruları incele</T>
        <T v="small" muted>Yanlışların ve emin olmadan doğru yaptıkların yanlış defterine ailesiyle eklendi.</T>
        {P.qs.map((q: any, i: number) => {
          const a = P.ans[i];
          const s = a === null ? c.muted : a === q.a ? c.ok : c.bad;
          return (
            <View key={q.id} style={{ borderTopWidth: 1, borderColor: c.line, paddingTop: 8, gap: 8 }}>
              <Pressable onPress={() => setOpen(open === i ? null : i)} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s }} />
                <T v="mono" style={{ width: 34 }}>{i + 1}{P.uns[i] ? "★" : ""}</T>
                <T v="small" numberOfLines={open === i ? undefined : 1} style={{ flex: 1 }}>{q.q}</T>
              </Pressable>
              {open === i ? (
                <View style={{ gap: 8 }}>
                  {q.p ? <Passage text={q.p} /> : null}
                  {q.o.map((o: string, j: number) => <Opt key={j} i={j} text={o} state={j === q.a ? "right" : j === a ? "wrong" : ""} />)}
                  <View style={{ backgroundColor: c.bg, borderRadius: 8, padding: 10, gap: 4 }}>
                    <Inl v="small" text={q.x} />
                    {q.tip ? <T v="small">💡 {q.tip}</T> : null}
                    <T v="small" muted>{FAMILIES[q.fam].n} · doğrusu {LETTERS[q.a]}</T>
                  </View>
                </View>
              ) : null}
            </View>
          );
        })}
      </Card>
      <Row><Spacer /><Btn kind="pri" title="Bitir" onPress={nav.close} /></Row>
    </Shell>
  );
}
