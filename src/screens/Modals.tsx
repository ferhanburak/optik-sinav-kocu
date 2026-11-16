// Pencereler: ayarlar ve "seviye testi olmadan mı başlayalım?" onayı
import React, { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Switch, View } from "react-native";
import { PLACEMENT } from "../data/catalog";
import { DOW, isHm, isYmd } from "../lib/dates";
import { nav, useNav } from "../lib/nav";
import { syncReminders } from "../lib/notify";
import { S, save } from "../lib/store";
import { Btn, Card, Field, Input, Row, Seg, Spacer, T, toast } from "../ui/kit";
import { useColors } from "../ui/theme";

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,.4)", justifyContent: "center", padding: 16 }}>
        <Pressable onPress={() => {}} style={{ maxHeight: "90%" }}>
          <Card>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 10 }}>{children}</ScrollView>
          </Card>
        </Pressable>
      </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function DayPick({ value, onChange }: { value: number[]; onChange: (d: number[]) => void }) {
  return (
    <Row gap={6}>
      {[1, 2, 3, 4, 5, 6, 0].map((d) => (
        <Btn key={d} sm title={DOW[d]} on={value.includes(d)} onPress={() => onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d])} />
      ))}
    </Row>
  );
}

function Settings() {
  const c = useColors();
  const p = S.profile;
  const [f, setF] = useState({ examDate: p.examDate, target: String(p.target), dailyMin: String(p.dailyMin), time: p.time, vocabTime: p.vocabTime, defterDay: p.defterDay, defterTime: p.defterTime, days: p.days, format: p.format, remind: p.remind });
  const up = (k: keyof typeof f) => (v: any) => setF({ ...f, [k]: v });
  const close = () => nav.modal(null);
  const submit = async () => {
    if (!isYmd(f.examDate)) return toast("Sınav tarihini YYYY-AA-GG biçiminde yaz.");
    if (![f.time, f.vocabTime, f.defterTime].every(isHm)) return toast("Saatleri SS:DD biçiminde yaz, ör. 13:58.");
    Object.assign(p, {
      examDate: f.examDate, examSet: true, target: +f.target || p.target, dailyMin: +f.dailyMin || p.dailyMin, time: f.time, vocabTime: f.vocabTime,
      defterDay: f.defterDay, defterTime: f.defterTime, days: f.days.length ? f.days : [0, 1, 2, 3, 4, 5, 6], format: f.format, remind: f.remind,
    });
    save();
    close();
    const ok = await syncReminders();
    toast(f.remind && !ok ? "Ayarlar kaydedildi. Bildirim izni verilmedi." : "Ayarlar kaydedildi.");
  };
  return (
    <Sheet onClose={close}>
      <Row><T v="h3">Ayarlar</T><Spacer /><Btn sm kind="ghost" title="Kapat" onPress={close} /></Row>
      <Row gap={10} style={{ alignItems: "flex-start" }}>
        <Field label="Sınav tarihi"><Input value={f.examDate} onChangeText={up("examDate")} placeholder="YYYY-AA-GG" /></Field>
        <Field label="Hedef puan"><Input value={f.target} onChangeText={up("target")} keyboardType="numeric" /></Field>
        <Field label="Günlük süre (dk)"><Input value={f.dailyMin} onChangeText={up("dailyMin")} keyboardType="numeric" /></Field>
      </Row>
      <Row gap={10} style={{ alignItems: "flex-start" }}>
        <Field label="Oturum saati"><Input value={f.time} onChangeText={up("time")} placeholder="13:58" /></Field>
        <Field label="Kelime tekrarı"><Input value={f.vocabTime} onChangeText={up("vocabTime")} placeholder="21:30" /></Field>
        <Field label="Defter saati"><Input value={f.defterTime} onChangeText={up("defterTime")} placeholder="18:57" /></Field>
      </Row>
      <Field label="Haftalık defter günü">
        <Row gap={6}>{[1, 2, 3, 4, 5, 6, 0].map((d) => <Btn key={d} sm title={DOW[d]} on={f.defterDay === d} onPress={() => up("defterDay")(d)} />)}</Row>
      </Field>
      <Field label="Çalışma günleri"><DayPick value={f.days} onChange={up("days")} /></Field>
      <Field label="Oturum formatı"><Seg value={f.format} onChange={up("format")} items={[["step", "Adım adım (önerilen)"], ["all", "Hepsi tek seferde"]]} /></Field>
      <Row wrap={false}>
        <T v="small" style={{ flex: 1 }}>Telefon bildirimleriyle hatırlat</T>
        <Switch value={f.remind} onValueChange={up("remind")} trackColor={{ true: c.guide }} />
      </Row>
      <Row><Btn kind="pri" title="Kaydet" onPress={submit} /></Row>
      <View style={{ borderTopWidth: 1, borderColor: c.line, paddingTop: 12, gap: 6 }}>
        <T v="small" style={{ fontWeight: "700" }}>Başlangıç</T>
        <T v="small" muted>Seviye testini yeniden çözüp planını güncelleyebilirsin.</T>
        <Row><Btn title="Seviye testini yeniden çöz" onPress={() => nav.open({ kind: "place" })} /></Row>
      </View>
      <T v="small" muted>Diğer sınavlar (YÖKDİL, KPSS, ALES) sonraki sürümlerde tek tek eklenecek.</T>
    </Sheet>
  );
}

function IntroChoice({ sk }: { sk: "normal" | "short" | "A" | "B" }) {
  const close = () => nav.modal(null);
  return (
    <Sheet onClose={close}>
      <T v="h3">Seviye testi olmadan mı başlayalım?</T>
      <T>Testi atlarsan ilk günlerde konu anlatımından çok <T style={{ fontWeight: "700" }}>seni tanımaya yönelik</T> çalışacağız. Oturumlar her hata ailesinden karışık teşhis soruları ağırlıklı olacak. Eksiklerin belirlenince (yaklaşık 3 oturum) konulara geçeceğiz.</T>
      <T v="small" muted>{PLACEMENT.length} soruluk seviye testi (~40 dk) bu süreci tek seferde kısaltır; analizle planın ilk günden sana göre kurulur.</T>
      <T style={{ fontWeight: "700" }}>Bunu kabul ediyor musun? Emin misin?</T>
      <Btn kind="pri" title="Seviye testini çözeyim (önerilen)" onPress={() => nav.open({ kind: "place" })} />
      <Btn title="Evet, eminim: beni tanıyarak başla" onPress={() => { S.onboarded = true; S.tanima = true; save(); nav.open({ kind: "session", sk }); }} />
      <Btn kind="ghost" title="Vazgeç" onPress={close} />
    </Sheet>
  );
}

export function Modals() {
  const n = useNav();
  if (!n.modal) return null;
  if (n.modal.kind === "settings") return <Settings />;
  return <IntroChoice sk={n.modal.sk} />;
}
