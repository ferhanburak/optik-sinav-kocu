// Defter: yanlış defteri (aileye göre), konu notları (yerleşik anlatımlar), trickler, karar notları, haftalık defter
import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { LESSONS } from "../content";
import { CURRICULUM, FAMILIES, TRICKS, WEEK_NAMES } from "../data/catalog";
import { addDays, dayOf, DOW, fmtDate, fmtShort, today } from "../lib/dates";
import { fam, topicStatus } from "../lib/engine";
import { LIGHT_ORDER } from "../data/catalog";
import { shareDefter, weekTopics } from "../lib/defter";
import { nav, useNav } from "../lib/nav";
import { useStore } from "../lib/store";
import type { Mistake } from "../types";
import { LessonView } from "../ui/LessonView";
import { Opt, Passage } from "../ui/QuestionCard";
import { Box, Btn, Card, Chip, Empty, Inl, LightBadge, Row, Seg, T, Table, st, toast } from "../ui/kit";
import { useColors } from "../ui/theme";
import { DecisionView } from "./Today";

type DT = "yanlis" | "notlar" | "trick" | "karar" | "haftalik";

function MistakeRow({ m }: { m: Mistake }) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ borderTopWidth: 1, borderColor: c.line, paddingTop: 8, gap: 8 }}>
      <Pressable onPress={() => setOpen(!open)} style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: m.un ? c.warn : c.bad }} />
        <T v="mono" muted style={{ width: 50 }}>{fmtShort(dayOf(m.t))}</T>
        <T v="small" numberOfLines={open ? undefined : 1} style={{ flex: 1 }}>{m.q}</T>
        {m.un ? <Chip text="★" color={c.warn} /> : null}
      </Pressable>
      {open ? (
        <View style={{ gap: 8 }}>
          {m.p ? <Passage text={m.p} /> : null}
          {m.o.map((o, j) => (
            <Opt key={j} i={j} text={o + (j === m.ua && j !== m.a ? "  ❌ senin cevabın" : "")} state={j === m.a ? "right" : j === m.ua ? "wrong" : ""} />
          ))}
          <View style={{ backgroundColor: c.bg, borderRadius: 8, padding: 10, gap: 4 }}>
            <Inl v="small" text={`**Neden:** ${m.x}`} />
            {m.tip ? <T v="small">💡 Püf: {m.tip}</T> : null}
            {m.diag ? <T v="small">Senin teşhisin: {m.diag}</T> : null}
            {m.lab ? <T v="small" muted>Beklenen etiket: {m.lab}</T> : null}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function FamCard({ k }: { k: string }) {
  const s = useStore();
  const f = fam(k);
  const ms = s.mistakes.filter((m) => m.fam === k);
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <Row wrap={false} style={{ alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <T v="h3">{FAMILIES[k].n}</T>
          <T v="small" muted>{f.wrong} yanlış toplam · üst üste {f.streak} doğru{f.due ? ` · sonraki yoklama ${fmtShort(f.due)}` : ""}{f.note ? ` · ${f.note}` : ""}</T>
        </View>
        <LightBadge l={f.light} />
      </Row>
      <Box kind="puf" title="Kontrol aracı"><T v="small">{FAMILIES[k].tool}</T></Box>
      <Row>
        <Btn sm kind="pri" title="Bu aileden 3 soru çöz" onPress={() => nav.open({ kind: "drill", f: k })} />
        {ms.length ? <Btn sm title={open ? "Kayıtları gizle" : `${ms.length} kaydı göster`} onPress={() => setOpen(!open)} /> : null}
      </Row>
      {open ? ms.slice().reverse().map((m) => <MistakeRow key={m.id} m={m} />) : null}
    </Card>
  );
}

export function Defter() {
  const s = useStore();
  const n = useNav();
  const [tab, setTab] = useState<DT>((n.defterTab as DT) || "yanlis");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (n.defterTab) setTab(n.defterTab as DT);
  }, [n.defterTab]);

  let body: React.ReactNode = null;
  if (tab === "yanlis") {
    const ids = [...new Set([...Object.keys(s.fams), ...s.mistakes.map((m) => m.fam)])].filter((k) => FAMILIES[k]).sort((a, b) => LIGHT_ORDER[fam(a).light] - LIGHT_ORDER[fam(b).light]);
    body = ids.length ? ids.map((k) => <FamCard key={k} k={k} />) : <Empty text="Henüz yanlış yok. Oturumlarda yaptığın her yanlış ve emin olmadan doğru yaptığın her soru burada ailesine göre birikir." />;
  } else if (tab === "notlar") {
    const tc = note ? CURRICULUM.find((x) => x.id === note) : null;
    body = tc && LESSONS[tc.id] ? (
      <>
        <Row><Btn sm title="‹ Notlar" onPress={() => setNote(null)} /></Row>
        <Card>
          <T v="label">Hafta {tc.w} · {WEEK_NAMES[tc.w] || ""}</T>
          <T v="h2">{tc.t}</T>
          <LessonView d={LESSONS[tc.id]} fams={tc.f} mode="all" />
        </Card>
      </>
    ) : (
      <Card>
        <T v="h3">Konu anlatımları</T>
        <T v="small" muted>Her konunun not almaya uygun anlatımı: adım kutusu, tablolar, çözümlü örnekler ve hatırlanacaklar.</T>
        {CURRICULUM.filter((x) => LESSONS[x.id]).map((x) => {
          const stt = topicStatus(x.id);
          return (
            <Row key={x.id} wrap={false}>
              <View style={{ flex: 1 }}>
                <T v="small" style={{ fontWeight: "700" }}>{x.t}</T>
                <T v="small" muted>Hafta {x.w}{stt === "aktif" ? " · aktif konu" : stt === "tamam" ? " · tamamlandı" : ""}</T>
              </View>
              <Btn sm title="Aç" onPress={() => setNote(x.id)} />
            </Row>
          );
        })}
      </Card>
    );
  } else if (tab === "trick") {
    body = (
      <>
        <Card>
          <T v="small" muted>Kısa ve hatırlanabilir kurallar. Her biri tekrar eden bir hata türüne karşı.</T>
          <Table firstBold rows={TRICKS.map(([a, b]) => [a, b])} />
        </Card>
        <Card>
          <T v="h3">Kontrol araçları</T>
          <Table cols={["Hata ailesi", "Kontrol"]} rows={Object.values(FAMILIES).map((f) => [f.n, f.tool])} />
        </Card>
      </>
    );
  } else if (tab === "karar") {
    body = s.decisions.length ? (
      s.decisions.slice().reverse().map((d, i) => (
        <Card key={i}>
          <T v="label">{fmtDate(dayOf(d.t))}</T>
          <DecisionView d={d.d} />
        </Card>
      ))
    ) : (
      <Empty text="Her oturumdan sonra yazılan karar notları burada birikir." />
    );
  } else {
    const ws = addDays(today(), -6);
    const wm = s.mistakes.filter((m) => dayOf(m.t) >= ws).length;
    const wv = s.vocab.filter((v) => v.day >= ws).length;
    body = (
      <Card>
        <T v="h3">Haftalık çalışma defteri</T>
        <T v="small" muted>Son 7 günün konu anlatımları, çözümlü örnekler, yanlışların, hata tekrar testi, kelimeler ve cep kartı tek bir PDF'te. Her {DOW[s.profile.defterDay]} {s.profile.defterTime}'da hatırlatılır.</T>
        <Row gap={16}>
          {[[weekTopics().length, "konu"], [wm, "yanlış"], [wv, "kelime"]].map(([v, l]) => (
            <View key={l as string}><T v="h2">{v}</T><T v="small" muted>{l}</T></View>
          ))}
        </Row>
        <Row>
          <Btn kind="pri" disabled={busy} title={busy ? "Hazırlanıyor…" : "Haftalık defteri PDF olarak paylaş"} onPress={async () => {
            setBusy(true);
            try {
              if (!(await shareDefter())) toast("Bu cihazda paylaşım kullanılamıyor.");
            } catch {
              toast("Defter oluşturulamadı.");
            }
            setBusy(false);
          }} />
        </Row>
      </Card>
    );
  }

  return (
    <ScrollView contentContainerStyle={st.screen}>
      <T v="h2">Defter</T>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Seg<DT> value={tab} onChange={(k) => { setTab(k); setNote(null); nav.tab("defter", k); }} items={[["yanlis", "Yanlış defteri"], ["notlar", "Konu notları"], ["trick", "Trickler"], ["karar", "Karar notları"], ["haftalik", "Haftalık defter"]]} />
      </ScrollView>
      {body}
    </ScrollView>
  );
}
