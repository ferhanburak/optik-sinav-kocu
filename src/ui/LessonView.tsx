// Konu anlatımı: adım kutusu → kontrol listesi → partlar (anlatım, sence neden, tablo, kutular, çözümlü örnekler, örnek soru) → tuzaklar → senin hataların → hatırlanacaklar
import React, { useState } from "react";
import { Text, View } from "react-native";
import { LETTERS } from "../data/catalog";
import { S } from "../lib/store";
import type { Lesson, LessonPart } from "../types";
import { Opt } from "./QuestionCard";
import { Box, Btn, Inl, Input, List, Md, Row, T, Table } from "./kit";
import { useColors } from "./theme";

function Sence({ p, reveal }: { p: LessonPart; reveal: boolean }) {
  const [txt, setTxt] = useState("");
  const [ans, setAns] = useState<string | null>(null);
  if (!p.sence || !p.sence.soru) return null;
  return (
    <Box kind="puf" title="Sence neden?">
      <T v="small">{p.sence.soru}</T>
      {reveal ? (
        <T v="small"><Text style={{ fontWeight: "700" }}>Cevap: </Text>{p.sence.cevap}</T>
      ) : ans !== null ? (
        <>
          <T v="small" muted>Senin cevabın: {ans || "(boş)"}</T>
          <T v="small" style={{ fontWeight: "700" }}>✅ {p.sence.cevap}</T>
        </>
      ) : (
        <Row>
          <Input placeholder="Kendi cümlenle yaz" value={txt} onChangeText={setTxt} style={{ flex: 1, minWidth: 180 }} />
          <Btn sm kind="pri" title="Cevapla" onPress={() => setAns(txt.trim())} />
        </Row>
      )}
    </Box>
  );
}

function SampleQ({ q }: { q: NonNullable<LessonPart["ornek_soru"]> }) {
  const [open, setOpen] = useState(false);
  const c = useColors();
  return (
    <View style={{ borderWidth: 1, borderColor: c.line, borderRadius: 10, padding: 12, gap: 6 }}>
      <T v="label">Örnek soru</T>
      <T>{q.q}</T>
      {(q.o || []).map((o, k) => <T key={k} v="small">{LETTERS[k]}) {o}</T>)}
      {open ? (
        <View style={{ backgroundColor: c.bg, borderRadius: 8, padding: 10 }}>
          <Inl v="small" text={`**Cevap ${LETTERS[+q.a] || ""}.** ${q.cevap || ""}`} />
        </View>
      ) : (
        <Row><Btn sm kind="ghost" title="Cevabı göster" onPress={() => setOpen(true)} /></Row>
      )}
    </View>
  );
}

function Tatbikat({ t, reveal }: { t: NonNullable<LessonPart["tatbikat"]>; reveal: boolean }) {
  const [open, setOpen] = useState(reveal);
  return (
    <View style={{ gap: 6 }}>
      <T v="label">Hızlı tatbikat</T>
      <T v="small" muted>Önce kendin dene, sonra cevapları aç.</T>
      <Table cols={open ? t.cols : [t.cols[0]]} rows={t.rows.map((r) => (open ? r : [r[0]]))} />
      {open ? null : <Row><Btn sm kind="ghost" title="Cevapları göster" onPress={() => setOpen(true)} /></Row>}
    </View>
  );
}

function Part({ p, n, reveal }: { p: LessonPart; n: number; reveal: boolean }) {
  const c = useColors();
  return (
    <View style={{ gap: 10, marginTop: 8 }}>
      <Row wrap={false}>
        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c.guide, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ color: c.onGuide, fontWeight: "700" }}>{n + 1}</Text>
        </View>
        <T v="h3" style={{ flex: 1 }}>{p.baslik}</T>
      </Row>
      <Md src={p.anlatim} />
      <Sence p={p} reveal={reveal} />
      {p.tablo && Array.isArray(p.tablo.cols) ? <Table cols={p.tablo.cols} rows={p.tablo.rows || []} /> : null}
      {p.tatbikat ? <Tatbikat t={p.tatbikat} reveal={reveal} /> : null}
      {(p.kutular || []).map((b, i) => {
        const kind = (["kural", "tuzak", "puf"].includes(b.tur) ? b.tur : "kural") as "kural" | "tuzak" | "puf";
        return (
          <Box key={i} kind={kind} title={{ kural: "📌 Kural", tuzak: "⚠️ Tuzak", puf: "💡 Püf" }[kind]}>
            <Md src={b.metin} v="small" />
          </Box>
        );
      })}
      {(p.ornekler || []).map((e, j) => (
        <View key={j} style={{ borderWidth: 1, borderColor: c.line, borderRadius: 10, padding: 12, gap: 8 }}>
          <T v="label">Çözümlü örnek</T>
          <T>{e.q}</T>
          {(e.o || []).map((o, k) => (
            <Opt key={k} i={k} text={o} state={k === +e.a ? "right" : ""} sub={e.celdiriciler && e.celdiriciler[k] && k !== +e.a ? e.celdiriciler[k] : undefined} />
          ))}
          <Inl v="small" text={`**Çünkü:** ${e.neden || ""}`} />
        </View>
      ))}
      {p.ornek_soru && p.ornek_soru.q ? <SampleQ q={p.ornek_soru} /> : null}
    </View>
  );
}

/** mode "all": tüm partlar ve cevaplar açık · "step": tek part, sence sorusu cevaplanmalı */
export function LessonView({ d, fams, mode, part = 0 }: { d: Lesson; fams: string[]; mode: "all" | "step"; part?: number }) {
  const parts = d.parts || [];
  const show = mode === "all" ? parts.map((p, i) => [p, i] as const) : parts[part] ? [[parts[part], part] as const] : [];
  const mine = S.mistakes.filter((m) => fams.includes(m.fam)).slice(-4);
  const head = mode === "all" || part === 0;
  const tail = mode === "all" || part === parts.length - 1;
  return (
    <View style={{ gap: 10 }}>
      {head && d.mantik ? <Box kind="kural" title="📌 Adım kutusu"><Md src={d.mantik} v="small" /></Box> : null}
      {head && (d.kontrol || []).length ? <Box kind="terim" title="Kontrol listesi"><List ordered items={d.kontrol!} v="small" /></Box> : null}
      {head && (d.terimler || []).length ? (
        <Box kind="terim" title="Terimler">
          {d.terimler!.map((t, i) => (
            <T key={i} v="small"><Text style={{ fontWeight: "700" }}>{t.terim}: </Text>{t.tanim}{t.ornek ? `  Örnek: ${t.ornek}` : ""}</T>
          ))}
        </Box>
      ) : null}
      {show.map(([p, i]) => <Part key={`${i}`} p={p} n={i} reveal={mode === "all"} />)}
      {tail && (d.tuzaklar || []).length ? <Box kind="tuzak" title="⚠️ Önemli: sınavda en çok kaçanlar"><List items={d.tuzaklar!} v="small" /></Box> : null}
      {tail && mine.length ? (
        <Box kind="senin" title="🧍 Senin hataların">
          <List v="small" items={mine.map((m) => `${m.q.slice(0, 120)}${m.q.length > 120 ? "…" : ""} → **${m.o[m.a]}**${m.diag ? ` (${m.diag})` : ""}`)} />
        </Box>
      ) : null}
      {tail && (d.hatirlanacaklar || []).length ? <Box kind="hatirla" title="✅ Hatırlanacaklar"><List ordered items={d.hatirlanacaklar!.slice(0, 5)} v="small" /></Box> : null}
    </View>
  );
}
