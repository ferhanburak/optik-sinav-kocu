// Pencereler: sınav ayarları (sınava özel), profil (bütün sınavlar için ortak) ve "seviye testi olmadan mı başlayalım?" onayı
import React, { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Switch, View } from "react-native";
import { PLACEMENT } from "../data/catalog";
import { EXAMS, examName } from "../data/exams";
import { diffDays, dow, DOW, fmtDate, fmtShort, isHm, isYmd, today } from "../lib/dates";
import { profileStats } from "../lib/profile";
import { nav, useNav } from "../lib/nav";
import { syncReminders } from "../lib/notify";
import { expectedFinish, INTENSITY, model, MODELS, schedulePlanChange, systemIntensity, type PlanModel } from "../lib/plan";
import { cloudReady, resetCloud, signInGoogle, signOut, syncNow, useCloud } from "../lib/cloud";
import { resetAll, S, save, useStore } from "../lib/store";
import { Btn, Card, Field, Input, Notice, Row, Seg, Spacer, T, toast } from "../ui/kit";
import { radius, useColors } from "../ui/theme";

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(0,0,0,.4)", justifyContent: "center", padding: 16 }}>
        <Pressable onPress={() => {}} style={{ maxHeight: "90%" }}>
          {/* flexShrink: kart en fazla pencerenin %90'ı kadar uzar, fazlası kaydırılır */}
          <Card style={{ flexShrink: 1, minHeight: 0 }}>
            <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 10 }}>{children}</ScrollView>
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

/** Plan modeli seçici: üç model, seçilenin açıklaması altında */
export function ModelPick({ value, onChange }: { value: PlanModel; onChange: (m: PlanModel) => void }) {
  return (
    <View style={{ gap: 6 }}>
      <Row gap={6}>
        {(Object.keys(MODELS) as PlanModel[]).map((k) => (
          <Btn key={k} sm title={MODELS[k].l + (k === "uyarlanan" ? " (önerilen)" : "")} on={value === k} onPress={() => onChange(k)} />
        ))}
      </Row>
      <T v="small" muted>{MODELS[value].d}</T>
    </View>
  );
}

function Settings() {
  const c = useColors();
  const p = S.profile;
  const n = useNav();
  const [f, setF] = useState({ examDate: p.examDate, target: String(p.target), dailyMin: String(S.pending?.dailyMin ?? p.dailyMin), time: p.time, vocabTime: p.vocabTime, defterDay: p.defterDay, defterTime: p.defterTime, days: S.pending?.days ?? p.days, format: p.format, model: S.pending?.model ?? model() });
  const up = (k: keyof typeof f) => (v: any) => setF({ ...f, [k]: v });
  const close = () => nav.modal(null);
  const newDays = f.days.length ? f.days : [0, 1, 2, 3, 4, 5, 6];
  const now = expectedFinish();
  const then = expectedFinish(newDays);
  const submit = async () => {
    if (!isYmd(f.examDate)) return toast("Sınav tarihini YYYY-AA-GG biçiminde yaz.");
    if (![f.time, f.vocabTime, f.defterTime].every(isHm)) return toast("Saatleri SS:DD biçiminde yaz, ör. 13:58.");
    Object.assign(p, {
      examDate: f.examDate, examSet: true, target: +f.target || p.target, time: f.time, vocabTime: f.vocabTime,
      defterDay: f.defterDay, defterTime: f.defterTime, format: f.format,
    });
    const ch = { model: f.model, days: newDays, dailyMin: +f.dailyMin || p.dailyMin };
    // Henüz hiç çalışılmadıysa hemen, yoksa yarından geçerli olur
    let later = false;
    if (S.sessions.length) later = schedulePlanChange(ch);
    else Object.assign(p, ch, { modelSet: true });
    save();
    close();
    const ok = await syncReminders();
    toast(later ? "Kaydedildi. Plan modeli, günler ve süre değişikliği yarından geçerli olacak." : p.remind && !ok ? "Ayarlar kaydedildi. Bildirim izni verilmedi." : "Ayarlar kaydedildi.", 6000);
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
      <Field label="Plan modeli"><ModelPick value={f.model} onChange={up("model")} /></Field>
      <T v="small" muted>Günün türünü, konu sırasını ve yoğunluğu sistem belirler. Yoğunluk günlük süreden çıkar: 45 dk altı hafif, 100 dk üstü yoğun.</T>
      {then.date ? (
        <Notice warn={then.buffer !== null && then.buffer < 0} text={`Bu ayarlarla: konuların beklenen bitişi ${fmtShort(then.date)}${now.date && now.date !== then.date ? ` (şimdi ${fmtShort(now.date)})` : ""}${then.buffer !== null ? (then.buffer < 0 ? ` · sınavdan ${-then.buffer} gün sonra` : ` · sınava ${then.buffer} gün pay`) : ""} · yoğunluk ${INTENSITY[systemIntensity(+f.dailyMin || p.dailyMin)].l.toLocaleLowerCase("tr-TR")}.${S.sessions.length ? " Model, günler ve süre değişikliği yarından geçerli olur." : ""}`} />
      ) : null}
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
  const cl = useCloud();
  const ps = profileStats(s);
  const shown = name.trim() || n.name;
  const hours = ps.minutes >= 60 ? `${Math.floor(ps.minutes / 60)} sa ${ps.minutes % 60} dk` : `${ps.minutes} dk`;
  const left = s.profile.examSet ? diffDays(today(), s.profile.examDate) : null;
  return (
    <Sheet onClose={close}>
      <Row><T v="h3">Profil</T><Spacer /><Btn sm kind="ghost" title="Kapat" onPress={close} /></Row>

      <Row wrap={false} gap={12}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: c.guideSoft, borderWidth: 1, borderColor: c.guideLine, alignItems: "center", justifyContent: "center" }}>
          <T v="h3" color={c.guide}>{shown ? shown.charAt(0).toLocaleUpperCase("tr-TR") : "?"}</T>
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <T style={{ fontWeight: "700" }}>{shown || "İsimsiz çalışan"}</T>
          <T v="small" muted>{cl.email ? cl.email : "Misafir · veriler bu cihazda"}</T>
          {ps.since ? <T v="small" muted>{fmtDate(ps.since)} tarihinden beri çalışıyorsun</T> : null}
        </View>
      </Row>

      <View style={{ backgroundColor: c.glass, borderColor: c.glassLine, borderWidth: 1, borderRadius: radius.tile, padding: 12, gap: 10 }}>
        <Row wrap={false} gap={12}>
          <View style={{ flex: 1 }}>
            <T v="h3">{ps.streak} gün seri</T>
            <T v="small" muted>{ps.streak ? "Bugün de çalışırsan seri uzar." : ps.days ? "Bugün bir oturumla yeni seri başlar." : "İlk oturumla serin başlar."}</T>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <T style={{ fontWeight: "700" }}>{ps.best}</T>
            <T v="small" muted>en uzun seri</T>
          </View>
        </Row>
        <View accessible accessibilityLabel={`Son 7 gün: ${ps.week.filter((w) => w.on).length} gün çalıştın`} style={{ flexDirection: "row", gap: 6 }}>
          {ps.week.map((w) => (
            <View key={w.date} style={{ flex: 1, alignItems: "center", gap: 4 }}>
              <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: w.on ? c.guide : "transparent", borderWidth: 1.5, borderColor: w.on ? c.guide : c.line }} />
              <T v="small" muted style={{ fontSize: 11 }}>{DOW[dow(w.date)]}</T>
            </View>
          ))}
        </View>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Stat v={ps.days} l="çalışılan gün" sub={`${ps.sessions} oturum`} />
        <Stat v={hours} l="toplam süre" />
        <Stat v={ps.questions} l="çözülen soru" sub={ps.mistakes ? `${ps.mistakes} yanlış defterde` : undefined} />
        <Stat v={ps.accuracy === null ? "—" : `%${ps.accuracy}`} l="doğruluk" sub={ps.recent === null ? undefined : `son 14 gün %${ps.recent}`} />
        <Stat v={ps.mocks} l="deneme" sub={ps.bestMock === null ? undefined : `en iyi ${ps.bestMock} · son ${ps.lastMock}`} />
        <Stat v={ps.vocab} l="kelime" sub={ps.vocab ? `${ps.vocabSolid} tanesi oturdu` : undefined} />
        <Stat v={`${ps.topicsDone}/${ps.topicsAll}`} l="konu bitti" />
        <Stat v={`${ps.green}/${ps.famsAll}`} l="hata türü yeşil" />
      </View>
      {ps.strong || ps.weak ? (
        <T v="small" muted>
          {ps.strong ? `En güçlü olduğun tür: ${ps.strong}.` : ""}
          {ps.strong && ps.weak ? " " : ""}
          {ps.weak ? `En çok zorlandığın: ${ps.weak}.` : ""}
        </T>
      ) : null}

      <View style={section}>
        <T v="small" style={{ fontWeight: "700" }}>Kişisel bilgiler</T>
        <Field label="Adın (isteğe bağlı)">
          <Input value={name} onChangeText={setName} placeholder="Sana nasıl seslenelim?" maxLength={40} onEndEditing={() => nav.setName(name)} />
        </Field>
        <T v="small" muted>{cl.email ? `E-posta: ${cl.email} (Google hesabından)` : "E-posta yok; Google ile giriş yaparsan hesabın burada görünür."}</T>
      </View>

      <View style={section}>
        <T v="small" style={{ fontWeight: "700" }}>Sınavlarım</T>
        {mine.length ? (
          mine.map((x) => (
            <Row key={x.id} wrap={false}>
              <View style={{ flex: 1 }}>
                <T v="small" style={{ fontWeight: "600" }}>{x.name}</T>
                <T v="small" muted>{x.desc}</T>
                {x.id === "yds" ? (
                  <T v="small" muted>
                    {left === null ? "Sınav tarihi girilmedi" : `${fmtDate(s.profile.examDate)} · ${left > 0 ? `${left} gün kaldı` : left === 0 ? "sınav bugün" : "sınav geçti"}`} · hedef {s.profile.target}
                  </T>
                ) : null}
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
        <Seg value={n.theme} onChange={(v) => nav.setTheme(v)} items={[["system", "Telefonun ayarı"], ["light", "Açık"], ["dark", "Koyu"]]} />
      </View>

      <Account section={section} />

      <View style={section}>
        <T v="small" style={{ fontWeight: "700" }}>Çalışma verileri</T>
        <T v="small" muted>Oturumlar, yanlışlar, kelimeler ve sınav ayarları silinir. Geri alınamaz.</T>
        <Row>
          <Btn
            sm
            title={armed ? "Emin misin? Hepsini sil" : "Çalışma verilerini sıfırla"}
            kind={armed ? "pri" : "def"}
            onPress={async () => {
              if (!armed) return setArmed(true);
              await resetCloud().catch(() => {}); // girişliyse buluttaki kopya da sıfırlanır
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
  const [m, setM] = useState<PlanModel>(model());
  const keep = () => {
    S.profile.model = m;
    S.profile.modelSet = true;
  };
  return (
    <Sheet onClose={close}>
      <T v="h3">Seviye testi olmadan mı başlayalım?</T>
      <T>Testi atlarsan ilk günlerde konu anlatımından çok <T style={{ fontWeight: "700" }}>seni tanımaya yönelik</T> çalışacağız. Oturumlar her hata türünden karışık teşhis soruları ağırlıklı olacak. Eksiklerin belirlenince (yaklaşık 3 oturum) konulara geçeceğiz.</T>
      <T v="small" muted>{PLACEMENT.length} soruluk seviye testi (~40 dk) bu süreci tek seferde kısaltır; analizle planın ilk günden sana göre kurulur.</T>
      <Field label="Plan modelin"><ModelPick value={m} onChange={setM} /></Field>
      <T v="small" muted>Modeli sonra sınav ayarlarından değiştirebilirsin. Seçtikten sonra günleri sistem yönetir.</T>
      <T style={{ fontWeight: "700" }}>Seviye testi olmadan başlamayı kabul ediyor musun? Emin misin?</T>
      <Btn kind="pri" title="Seviye testini çözeyim (önerilen)" onPress={() => { keep(); save(); nav.open({ kind: "place" }); }} />
      <Btn title="Evet, eminim: beni tanıyarak başla" onPress={() => { keep(); S.onboarded = true; S.tanima = true; save(); nav.open({ kind: "session", sk }); }} />
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

/** Hesap: isteğe bağlı Google girişi ve cihazlar arası eşitleme */
function Account({ section }: { section: object }) {
  const cl = useCloud();
  const [busy, setBusy] = useState(false);
  const run = async (f: () => Promise<void>) => {
    setBusy(true);
    await f();
    setBusy(false);
  };
  const last = cl.last ? new Date(cl.last).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : null;
  return (
    <View style={section}>
      <T v="small" style={{ fontWeight: "700" }}>Hesap ve eşitleme</T>
      {!cloudReady ? (
        <T v="small" muted>Verilerin şu an yalnızca bu telefonda tutuluyor. Hesapla giriş bu sürümde henüz açık değil.</T>
      ) : cl.email ? (
        <>
          <T v="small" muted>
            {cl.email} ile giriş yaptın. Çalışma verilerin bu hesapla eşitleniyor; başka bir telefonda aynı hesapla girersen kaldığın yerden devam edersin.
          </T>
          <T v="small" muted>
            {cl.status === "syncing" ? "Eşitleniyor…" : cl.status === "error" ? `Eşitlenemedi: ${cl.err}. İnternet gelince yeniden denenecek.` : last ? `Son eşitleme: ${last}` : "Henüz eşitlenmedi."}
          </T>
          <Row>
            <Btn sm title="Şimdi eşitle" onPress={() => run(syncNow)} />
            <Btn sm kind="ghost" title="Çıkış yap" onPress={() => run(signOut)} />
          </Row>
          <T v="small" muted>Çıkış yapınca bu telefondaki verilerin silinmez, yalnızca eşitleme durur.</T>
        </>
      ) : (
        <>
          <T v="small" muted>
            Giriş yapmadan da her şey çalışır; veriler bu telefonda kalır. Google ile giriş yaparsan çalışmaların hesabına yedeklenir ve başka cihazlarla eşitlenir. Bu telefondaki mevcut verilerin de hesaba taşınır.
          </T>
          <Row>
            <Btn sm kind="pri" title={busy ? "Bekleniyor…" : "Google ile giriş yap"} onPress={() => !busy && run(signInGoogle)} />
          </Row>
          {cl.err ? <T v="small" muted>Giriş yapılamadı: {cl.err}</T> : null}
        </>
      )}
    </View>
  );
}

/** Profil istatistik kutusu */
function Stat({ v, l, sub }: { v: React.ReactNode; l: string; sub?: string }) {
  const c = useColors();
  return (
    <View style={{ flexBasis: "45%", flexGrow: 1, minWidth: 120, backgroundColor: c.glass, borderColor: c.glassLine, borderWidth: 1, borderRadius: radius.tile, paddingVertical: 10, paddingHorizontal: 12, gap: 1 }}>
      <T v="h3" style={{ fontVariant: ["tabular-nums"] }}>{v}</T>
      <T v="small" style={{ fontWeight: "600" }}>{l}</T>
      {sub ? <T v="small" muted style={{ fontSize: 11.5, lineHeight: 15 }}>{sub}</T> : null}
    </View>
  );
}
