// Pencereler: sınav ayarları (sınava özel), profil (bütün sınavlar için ortak) ve "seviye testi olmadan mı başlayalım?" onayı
import React, { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Switch, View } from "react-native";
import { PLACEMENT } from "../data/catalog";
import { EXAMS, examName } from "../data/exams";
import { DOW, isHm, isYmd } from "../lib/dates";
import { nav, useNav } from "../lib/nav";
import { syncReminders } from "../lib/notify";
import { resetAll, S, save, useStore } from "../lib/store";
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
  const n = useNav();
  const [f, setF] = useState({ examDate: p.examDate, target: String(p.target), dailyMin: String(p.dailyMin), time: p.time, vocabTime: p.vocabTime, defterDay: p.defterDay, defterTime: p.defterTime, days: p.days, format: p.format });
  const up = (k: keyof typeof f) => (v: any) => setF({ ...f, [k]: v });
  const close = () => nav.modal(null);
  const submit = async () => {
    if (!isYmd(f.examDate)) return toast("Sınav tarihini YYYY-AA-GG biçiminde yaz.");
    if (![f.time, f.vocabTime, f.defterTime].every(isHm)) return toast("Saatleri SS:DD biçiminde yaz, ör. 13:58.");
    Object.assign(p, {
      examDate: f.examDate, examSet: true, target: +f.target || p.target, dailyMin: +f.dailyMin || p.dailyMin, time: f.time, vocabTime: f.vocabTime,
      defterDay: f.defterDay, defterTime: f.defterTime, days: f.days.length ? f.days : [0, 1, 2, 3, 4, 5, 6], format: f.format,
    });
    save();
    close();
    const ok = await syncReminders();
    toast(p.remind && !ok ? "Ayarlar kaydedildi. Bildirim izni verilmedi." : "Ayarlar kaydedildi.");
  };
  return (
    <Sheet onClose={close}>
      <Row><T v="h3">{examName(n.exam)} ayarları</T><Spacer /><Btn sm kind="ghost" title="Kapat" onPress={close} /></Row>
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
      <Row><Btn kind="pri" title="Kaydet" onPress={submit} /></Row>
      <View style={{ borderTopWidth: 1, borderColor: c.line, paddingTop: 12, gap: 6 }}>
        <T v="small" style={{ fontWeight: "700" }}>Başlangıç</T>
        <T v="small" muted>Seviye testini yeniden çözüp planını güncelleyebilirsin.</T>
        <Row><Btn title="Seviye testini yeniden çöz" onPress={() => nav.open({ kind: "place" })} /></Row>
      </View>
      <View style={{ borderTopWidth: 1, borderColor: c.line, paddingTop: 12, gap: 6 }}>
        <T v="small" muted>Ad, bildirimler ve veriler bütün sınavlar için ortaktır; onlar Profil'de durur.</T>
        <Row><Btn sm title="Profili aç" onPress={() => nav.modal({ kind: "profile" })} /></Row>
      </View>
    </Sheet>
  );
}

/** Profil: bütün sınavlar için ortak olanlar (ad, eklenen sınavlar, bildirimler, veriler) */
function Profile() {
  const c = useColors();
  const n = useNav();
  const s = useStore();
  const [name, setName] = useState(n.name);
  const [armed, setArmed] = useState(false);
  const close = () => {
    if (name.trim() !== n.name) nav.setName(name);
    nav.modal(null);
  };
  const mine = EXAMS.filter((x) => n.exams.includes(x.id));
  const section = { borderTopWidth: 1, borderColor: c.line, paddingTop: 12, gap: 8 } as const;
  return (
    <Sheet onClose={close}>
      <Row><T v="h3">Profil</T><Spacer /><Btn sm kind="ghost" title="Kapat" onPress={close} /></Row>
      <Field label="Adın (isteğe bağlı)">
        <Input value={name} onChangeText={setName} placeholder="Sana nasıl seslenelim?" maxLength={40} onEndEditing={() => nav.setName(name)} />
      </Field>

      <View style={section}>
        <T v="small" style={{ fontWeight: "700" }}>Sınavlarım</T>
        {mine.length ? (
          mine.map((x) => (
            <Row key={x.id} wrap={false}>
              <View style={{ flex: 1 }}>
                <T v="small" style={{ fontWeight: "600" }}>{x.name}</T>
                <T v="small" muted>{x.desc}</T>
              </View>
              <Btn sm kind="ghost" title="Listeden kaldır" onPress={() => { nav.removeExam(x.id); toast(`${x.name} listeden kaldırıldı. Çalışma verilerin duruyor; yeniden ekleyince kaldığın yerden devam edersin.`, 6000); }} />
            </Row>
          ))
        ) : (
          <T v="small" muted>Henüz sınav eklemedin.</T>
        )}
      </View>

      <View style={section}>
        <Row wrap={false}>
          <View style={{ flex: 1 }}>
            <T v="small" style={{ fontWeight: "700" }}>Bildirimler</T>
            <T v="small" muted>Oturum, kelime tekrarı ve defter hatırlatıcıları. Saatler her sınavın kendi ayarlarında.</T>
          </View>
          <Switch
            accessibilityLabel="Bildirimler"
            value={s.profile.remind}
            trackColor={{ true: c.guide }}
            onValueChange={async (v) => {
              S.profile.remind = v;
              save();
              const ok = await syncReminders();
              if (v && !ok) toast("Bildirim izni verilmedi. Telefon ayarlarından açabilirsin.");
            }}
          />
        </Row>
      </View>

      <View style={section}>
        <T v="small" style={{ fontWeight: "700" }}>Görünüm</T>
        <T v="small" muted>Açık ve koyu tema, telefonun kendi ayarını izler.</T>
      </View>

      <View style={section}>
        <T v="small" style={{ fontWeight: "700" }}>Hesap ve yedekleme</T>
        <T v="small" muted>Verilerin şu an yalnızca bu telefonda tutuluyor. Hesap açma ve yedekleme sonraki sürümde gelecek; uygulamayı silersen veriler de silinir.</T>
      </View>

      <View style={section}>
        <T v="small" style={{ fontWeight: "700" }}>Çalışma verileri</T>
        <T v="small" muted>Oturumlar, yanlışlar, kelimeler ve sınav ayarları silinir. Geri alınamaz.</T>
        <Row>
          <Btn
            sm
            title={armed ? "Emin misin? Hepsini sil" : "Çalışma verilerini sıfırla"}
            kind={armed ? "pri" : "def"}
            onPress={() => {
              if (!armed) return setArmed(true);
              resetAll();
              setArmed(false);
              toast("Çalışma verileri sıfırlandı.");
            }}
          />
          {armed ? <Btn sm kind="ghost" title="Vazgeç" onPress={() => setArmed(false)} /> : null}
        </Row>
      </View>
    </Sheet>
  );
}

function IntroChoice({ sk }: { sk: "normal" | "short" | "A" | "B" }) {
  const close = () => nav.modal(null);
  return (
    <Sheet onClose={close}>
      <T v="h3">Seviye testi olmadan mı başlayalım?</T>
      <T>Testi atlarsan ilk günlerde konu anlatımından çok <T style={{ fontWeight: "700" }}>seni tanımaya yönelik</T> çalışacağız. Oturumlar her hata türünden karışık teşhis soruları ağırlıklı olacak. Eksiklerin belirlenince (yaklaşık 3 oturum) konulara geçeceğiz.</T>
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
  if (n.modal.kind === "profile") return <Profile />;
  return <IntroChoice sk={n.modal.sk} />;
}
