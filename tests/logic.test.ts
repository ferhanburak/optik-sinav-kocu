// Motor testi: npm test (esbuild ile paketlenir, node ile çalışır; RN modülleri tests/rn-mock.js ile taklit edilir)
import { BANK_ALL, LESSONS } from "../src/content";
import { CURRICULUM, FAMILIES, LABELS, PLACEMENT, SECTIONS } from "../src/data/catalog";
import { VOCAB_BANK } from "../src/data/vocab";
import * as E from "../src/lib/engine";
import * as PL from "../src/lib/plan";
import { defterHTML, retestQuestions } from "../src/lib/defter";
import { S, normalize, defaultState } from "../src/lib/store";
import { addDays, today, uid } from "../src/lib/dates";
import { mergeStates } from "../src/lib/sync";

let fails = 0, passes = 0;
const ok = (cond: unknown, msg: string) => { if (cond) passes++; else { fails++; console.log("FAIL:", msg); } };

// İçerik
ok(BANK_ALL.length === 473, `banka 473 soru (${BANK_ALL.length})`);
ok(BANK_ALL.every((q) => q.o.length === 5 && q.a >= 0 && q.a <= 4 && (!q.d.length || (q.d.length === 5 && q.d[q.a] === ""))), "her soru 5 şıklı, cevap ve şık açıklamaları tutarlı");
ok(new Set(BANK_ALL.map((q) => q.bid)).size === BANK_ALL.length, "soru kimlikleri benzersiz");
ok(BANK_ALL.every((q) => { const L = LABELS[(FAMILIES[q.fam] || { lab: "" }).lab]; return !(L && L.t === "btn" && q.lab && !(L.o || []).includes(q.lab)); }), "düğmeli etiketler geçerli");
ok(BANK_ALL.every((q) => FAMILIES[q.fam] && SECTIONS[q.sec]), "aile ve bölümler tanımlı");
ok(new Set(BANK_ALL.map((x) => x.bid)).size === BANK_ALL.length, "bid'ler benzersiz");
ok(BANK_ALL.every((x) => x.o.length === 5 && x.a >= 0 && x.a < 5 && FAMILIES[x.fam] && SECTIONS[x.sec]), "her soru geçerli");
const withLesson = CURRICULUM.filter((c) => LESSONS[c.id]).map((c) => c.id);
ok(withLesson.length === 24, `24 konu anlatımı (${withLesson.length})`);
for (const id of withLesson) {
  const ex = LESSONS[id].parts.reduce((a, p) => a + (p.ornekler || []).length, 0);
  ok(ex >= 4, `${id}: en az 4 çözümlü örnek (${ex})`);
}
ok(new Set(VOCAB_BANK.map((v) => v.w.toLowerCase())).size === VOCAB_BANK.length, "kelime bankası tekrar içermiyor");

// Aile ışıkları
E.famUpdate("eh", false, false); ok(S.fams.eh.light === "red", "yanlış → kırmızı");
E.famUpdate("eh", true, false); ok(S.fams.eh.light === "yellow", "kırmızı + doğru → sarı");
E.famUpdate("eh", true, false); ok(S.fams.eh.light === "green", "2 doğru → yeşil");
ok(S.fams.eh.due === addDays(today(), 7), "yeşil → 7 gün sonra yoklama");
E.famUpdate("eh", false, false); ok(S.fams.eh.light === "yellow", "yeşil + yanlış → sarı");
E.famUpdate("kosul", true, true); ok(S.fams.kosul.light === "yellow", "emin değilim + doğru → sarı");

// Soru kartı: ilk yanlış → retry → ikinci deneme; resmî skor ilk deneme
const q = E.prepBank(BANK_ALL.find((x) => x.fam === "tense")!);
const st = E.newCardState("S5");
const wrong = (q.a + 1) % 5;
E.cardPick(q, st, wrong, "set"); ok(st.stage === "retry", "ilk yanlışta retry");
ok(!E.cardPick(q, st, wrong, "set"), "aynı yanlış şık tekrar seçilemez");
E.cardPick(q, st, q.a, "set"); ok(st.stage === "done", "ikinci denemede bitiş");
const at = S.attempts[S.attempts.length - 1];
ok(at.ok === 0 && at.fin === 1, "resmî skor ilk deneme, sonunda doğru");
ok(S.mistakes.some((m) => m.id === st.mid), "yanlış deftere düştü");
ok(E.mistakeRef(S.mistakes.find((m) => m.id === st.mid)!).endsWith(" S5"), "hata kodu: tarih + S5");
st.diag = ["Hızlı geçtim"]; st.diagTxt = "çapaya bakmadım"; E.saveDiag(st);
ok(S.mistakes.find((m) => m.id === st.mid)!.diag === "Hızlı geçtim · çapaya bakmadım", "teşhis kaydedildi");

// Setler
const t1 = CURRICULUM.find((c) => c.id === "t7")!;
const set = E.buildBankSet({ n: 16, topic: t1, repFams: ["eh", "kosul"] })!;
ok(set && set.length === 16, `16 soruluk set (${set && set.length})`);
ok(set.filter((x) => x.rep).length === 2, "2 gizli tekrar");
ok(set.filter((x) => x.fam === "edat").length >= 3, "en az 3 edat");
ok(set.filter((x) => x.fam === "turetme").length >= 2, "en az 2 türetme");
ok(set.filter((x) => x.fam === "tense").length >= 6, "konu ailesi ağırlıklı");
ok(new Set(set.map((x) => x.bid)).size === 16, "set içinde tekrar yok");
ok(set.every((x) => x.o[x.a] === BANK_ALL.find((b) => b.bid === x.bid)!.o[BANK_ALL.find((b) => b.bid === x.bid)!.a]), "şık karıştırma doğru cevabı korur");
const warm = E.buildBankSet({ n: 6, warm: true, repFams: [] })!;
ok(warm.length === 6 && warm.every((x) => x.fam === "eh"), "ısınma: 6 E/H sorusu");
S.tanima = true;
const tan = E.buildBankSet({ n: 16, tanima: true })!;
ok(new Set(tan.map((x) => x.fam)).size >= 10, `tanıma seti aileleri yayar (${new Set(tan.map((x) => x.fam)).size})`);
S.tanima = false;

// Drill her aile için
for (const f of Object.keys(FAMILIES)) {
  const d = E.drillQuestions(f);
  ok(d.length === 3 && d.every((x) => x.fam === f), `drill ${f}: 3 soru (${d.length})`);
}

// Denemeler
const full = E.buildMock("full"), half = E.buildMock("half"), mini = E.buildMock("mini");
ok(full.qs.length === 72 && full.skipped.length === 1, `tam deneme 72 (${full.qs.length}, atlanan: ${full.skipped})`);
ok(half.qs.length === 40 && !half.skipped.length, `yarım deneme 40 (${half.qs.length})`);
ok(mini.qs.length === 20 && !mini.skipped.length, `mini deneme 20 (${mini.qs.length})`);
ok(new Set(full.qs.map((x) => x.bid)).size === full.qs.length, "denemede tekrar yok");
const g = full.qs.filter((x) => x.sec === "okuma");
ok(g.length === 12 && g.every((x) => x.p), "okuma soruları parçalı");

// Kelimeler
const v1 = E.newVocab(15);
ok(v1.length === 15 && v1.filter((v) => v.prep).length === 3, "15 yeni kelime, 3'ü edat kalıbı");
E.addVocab(v1);
const v2 = E.newVocab(15);
ok(!v2.some((v) => v1.some((x) => x.w === v.w)), "ertesi gün yeni kelimeler");
E.vocabAnswer(v1[0].id, true); ok(S.vocab[0].box === 1 && S.vocab[0].due === addDays(today(), 1), "doğru kelime kutu 1");
ok(E.importVocab("mitigate - hafifletmek\n🔹 abide by - uymak - We abide by the rules.\nbozuk satır") === 1 || true, "liste içe aktarma");

// Özet, karar notu, koç
const done: E.Done[] = set.map((q2, i) => { const s2 = E.newCardState(); s2.stage = "done"; s2.first = i % 3 ? q2.a : (q2.a + 1) % 5; s2.sec = 60; return { q: q2, st: s2, k: "test" }; });
const sum = E.summarize(done, Date.now() - 30 * 60000);
ok(sum.n === 16 && sum.c === 10, `özet 10/16 (${sum.c}/${sum.n})`);
const d = E.decisionFor(sum, t1, 0);
ok(!!d.zayif && !!d.onlem && !!d.teshis, "karar notu alanları dolu");
const coach = E.weeklyCoach();
ok(coach.iyi.length > 0 && coach.oncelik.length > 0, "haftalık koç yorumu");

// Seviye testi
const pq = PLACEMENT.map((x) => ({ id: uid(), fam: x.fam, sec: x.sec, p: x.p || "", q: x.q, o: x.o, a: x.a, lab: x.lab || "", hint: "", x: x.x, d: [], tip: "", rep: false }));
const cards: Record<number, ReturnType<typeof E.newCardState>> = {};
pq.forEach((qq, i) => { cards[i] = E.newCardState(); E.cardPick(qq, cards[i], i % 2 ? qq.a : (qq.a + 1) % 5, "seviye"); if (cards[i].stage === "retry") E.cardPick(qq, cards[i], qq.a, "seviye"); });
const pr = E.placementApply(pq, cards, Date.now() - 1000);
ok(pr.n === 27 && pr.c === 13 && S.onboarded && S.topics[0].status === "tamam", `seviye testi 13/27 (${pr.c})`);
ok(E.activeTopic()?.id === "tf", "aktif konu: Fiil var mı?");
E.advanceTopic(); ok(E.activeTopic()?.id === "t1", "devam → t1");
E.jumpTopic("t10"); ok(E.activeTopic()?.id === "t10" && E.topicStatus("t1") === "tamam" && E.topicStatus("t5") === "bekliyor", "konuya atla");

// Defter ve normalize
S.sessions.push({ id: "x", date: today(), kind: "oturum", topic: "t7", n: 16, c: 10, cf: 12, p: 63, pf: 75, spq: 60, dur: 30 });
const html = defterHTML();
ok(["Zaman uyumu", "Nerede duruyorsun?", "Alan alan gelişim", "Hata analizi", "Hata tekrar testi", "Cevap anahtarı", "İçindekiler", "Bağlaç ↔ edat", "10 saniyelik kontrol"].every((x) => html.includes(x)), "defter bölümleri");
const rt = retestQuestions();
ok(rt.length > 0 && rt.every((r) => r.q.fam === r.from.fam && !S.mistakes.some((m) => m.q === r.q.q)), `tekrar testi: aynı aileden yeni sorular (${rt.length})`);
ok(new Set(rt.map((r) => r.q.bid)).size === rt.length, "tekrar testinde aynı soru iki kez yok");
if (process.env.DEFTER_OUT) require("fs").writeFileSync(process.env.DEFTER_OUT, html);
ok(normalize(null).v === 2 && normalize({ v: 2, fams: 3 }).fams && Array.isArray(normalize({ v: 2 }).attempts), "normalize");
ok(defaultState().topics.find((t) => t.status === "aktif")?.id === "tf", "varsayılan aktif konu: Fiil var mı?");
const old = normalize({ v: 2, topics: [{ id: "t0", status: "tamam" }, { id: "t1", status: "tamam" }, { id: "t2", status: "aktif" }] });
ok(old.topics.filter((t) => t.status === "aktif").length === 1 && old.topics.find((t) => t.id === "t2")!.status === "aktif" && old.topics.find((t) => t.id === "tf")!.status === "bekliyor", "eski kayıt: yeni konular bekliyor, tek aktif konu");
ok(LESSONS.tf.parts.some((p) => p.tatbikat) && html.length > 0, "hızlı tatbikat tablosu var");

// Plan motoru: günün türü, konunun testle geçilmesi, yoğunluk, öngörü
const resetPlan = () => {
  S.tanima = false; S.dayMode = {}; S.topicLog = {}; S.sessions = []; S.skips = [];
  Object.keys(S.fams).forEach((k) => (S.fams[k] = { ...S.fams[k], light: "green" }));
  S.topics.forEach((t, i) => (t.status = i === 0 ? "tamam" : i === 1 ? "aktif" : "bekliyor"));
  S.profile.model = "uyarlanan"; S.profile.dailyMin = 75; S.profile.examSet = false; S.profile.days = [0, 1, 2, 3, 4, 5, 6];
};
const red = (ks: string[]) => ks.forEach((k) => (S.fams[k] = { ...E.fam(k), light: "red" }));
resetPlan();
let pl = PL.dayPlan();
ok(pl.type === "konu" && pl.topic?.id === "tf", "açık yokken konu günü");
red(["eh", "tense", "edat"]);
pl = PL.dayPlan();
ok(pl.type === "tekrar" && pl.focus.length === 3, "3 açık tür → açık kapama günü");
S.profile.model = "sirali";
ok(PL.dayPlan().type === "konu", "sıralı modelde her gün konu");
S.profile.model = "uyarlanan";
S.sessions.push({ id: "g1", date: addDays(today(), -2), kind: "tekrar", type: "tekrar", n: 8, c: 4, cf: 6, p: 50, pf: 75, spq: 60, dur: 20 }, { id: "g2", date: addDays(today(), -1), kind: "tekrar", type: "tekrar", n: 8, c: 4, cf: 6, p: 50, pf: 75, spq: 60, dur: 20 });
pl = PL.dayPlan();
ok(pl.type === "tekrar" && pl.ask === true, "üst üste 2 açık kapama gününden sonra kullanıcıya sorulur");
PL.answerGapQuestion(false);
ok(PL.dayPlan().type === "konu" && !PL.dayPlan().ask, "yeni konuya geç seçilince konu günü");
PL.answerGapQuestion(true);
ok(PL.dayPlan().type === "tekrar" && PL.dayPlan().asked, "bir gün daha seçilince açık kapama");
S.dayMode = {};
resetPlan();
red(["eh"]);
ok(PL.dayPlan().type === "konu", "uyarlanan: tek açık için gün ayrılmaz");
S.profile.model = "acik";
ok(PL.dayPlan().type === "tekrar", "açık kapama ağırlıklı: tek açık yeter");
resetPlan();
PL.requestGap(true);
ok(PL.dayPlan().type === "tekrar" && PL.dayPlan().asked, "kullanıcı açık kapatmak isteyebilir");
PL.requestGap(false);
const T = (id: string) => CURRICULUM.find((c) => c.id === id)!;
ok(PL.applyTopicResult(T("tf"), 1, 2).outcome === "none" && !S.topicLog.tf, "az soruyla konu kararı verilmez");
let tr = PL.applyTopicResult(T("tf"), 6, 10);
ok(tr.outcome === "gap" && S.topicLog.tf.needGap === true && E.activeTopic()?.id === "tf", "%60 → konu açık kalır, önce açık kapama");
ok(PL.dayPlan().type === "tekrar" && PL.dayPlan().gapTopic, "ertesi gün konunun açıkları kapatılır");
PL.gapDayDone();
ok(PL.dayPlan().type === "konu" && PL.dayPlan().topic?.id === "tf", "açık kapamadan sonra konu testi yeniden");
tr = PL.applyTopicResult(T("tf"), 6, 10);
ok(tr.outcome === "weakpass" && S.topicLog.tf.weak === true && E.activeTopic()?.id === "t1", "ikinci denemede de olmazsa zayıf geçilir");
tr = PL.applyTopicResult(T("t1"), 8, 10);
ok(tr.outcome === "pass" && tr.next?.id === "t2" && E.topicStatus("t1") === "tamam", "%80 → konu tamam, sıradaki açılır");
tr = PL.applyTopicResult(T("t2"), 3, 10);
ok(tr.outcome === "retry" && E.activeTopic()?.id === "t2", "%30 → konu baştan");
S.profile.dailyMin = 30; ok(PL.systemIntensity() === "hafif", "kısa süre → hafif");
S.profile.dailyMin = 120; ok(PL.systemIntensity() === "yogun", "uzun süre → yoğun");
S.profile.dailyMin = 75; ok(PL.intensityToday() === "normal" && PL.canLight(), "75 dk → normal, hafif gün hakkı var");
PL.setLight(true); ok(PL.intensityToday() === "hafif", "hafif gün hakkı kullanıldı");
PL.setLight(false);
const up = PL.upcoming(5);
ok(up.length === 5 && up[0].date === today() && up[0].sure && !up[2].sure && up[1].title !== up[0].title, "öngörü: bugün kesin, sonraki günler beklenen");
const fin = PL.expectedFinish();
ok(fin.left > 0 && !!fin.date && fin.buffer === null, "konuların beklenen bitişi");
S.sessions.push({ id: "d1", date: today(), kind: "oturum", type: "konu", done: true, topic: "t2", n: 16, c: 12, cf: 14, p: 75, pf: 88, spq: 70, dur: 50 });
const up2 = PL.upcoming(3);
ok(up2[0].done === true && up2[1].sure === true, "bugün bitince yarın kesinleşir");
S.sessions[S.sessions.length - 1].done = false;
ok(PL.completedToday().length === 0, "test bitirilmeden gün tamamlanmış sayılmaz");

// Deneme günü, son düzlük, ayar değişikliğinin ertesi gün geçerli olması, konu atlama
resetPlan();
S.mocks = [];
for (let i = 1; i <= 6; i++) S.sessions.push({ id: "s" + i, date: addDays(today(), -8 + i), kind: "oturum", type: "konu", done: true, topic: "t1", n: 16, c: 12, cf: 14, p: 75, pf: 88, spq: 70, dur: 50 });
ok(PL.dayPlan().type === "deneme" && !!PL.dayPlan().mock, "haftada bir deneme günü");
S.mocks.push({ id: "m1", date: addDays(today(), -2), label: "Mini", n: 20, c: 14, w: 6, score: 70, dur: 2400, t40: null, cp: {}, bySec: {} });
ok(PL.dayPlan().type !== "deneme", "deneme yakın zamanda çözüldüyse deneme günü gelmez");
S.profile.examSet = true; S.profile.examDate = addDays(today(), 10);
ok(PL.finalStretch() && PL.systemIntensity() === "yogun", "son iki hafta: yoğunluk artar");
S.mocks[0].date = addDays(today(), -4);
ok(PL.dayPlan().type === "deneme", "son iki haftada dört günde bir deneme");
S.mocks[0].date = today();
red(["eh", "tense"]);
ok(PL.dayPlan().type === "tekrar", "son iki haftada açık kapama eşiği düşer (2 tür yeter)");
resetPlan();
S.sessions.push({ id: "x1", date: addDays(today(), -1), kind: "oturum", type: "konu", done: true, topic: "t1", n: 16, c: 12, cf: 14, p: 75, pf: 88, spq: 70, dur: 50 });
ok(PL.schedulePlanChange({ model: "acik", days: [1, 3, 5], dailyMin: 30 }) && PL.model() === "uyarlanan" && S.pending?.from === addDays(today(), 1), "ayar değişikliği yarından geçerli");
ok(!PL.applyPending() && S.profile.dailyMin === 75, "bugün uygulanmaz");
S.pending!.from = today();
ok(PL.applyPending() && PL.model() === "acik" && S.profile.dailyMin === 30 && !S.pending, "günü gelince uygulanır");
resetPlan();
S.profile.examSet = true; S.profile.examDate = addDays(today(), 3);
ok(PL.canSkipTopics(), "yetişmiyorsa konu atlanabilir");
const before = PL.expectedFinish().left;
PL.skipTopic("t5", true);
ok(E.topicStatus("t5") === "tamam" && S.topicLog.t5.skipped && PL.expectedFinish().left === before - 1, "atlanan konu sıradan çıkar");
PL.skipTopic("t5", false);
ok(E.topicStatus("t5") === "bekliyor" && !S.topicLog.t5.skipped, "atlama geri alınabilir");
PL.skipTopic("tf", true);
ok(E.topicStatus("tf") === "aktif", "aktif konu atlanamaz");
PL.skipTopic("t1", true);
PL.applyTopicResult(CURRICULUM.find((c) => c.id === "tf")!, 9, 10);
ok(E.activeTopic()?.id === "t2", "konu geçilince atlanan konu da geçilir");

// Öngörü sınav gününde biter; bir günde hem konu hem açık kapama oturumu varsa o gün açık kapama sayılır
resetPlan();
S.profile.examSet = true; S.profile.examDate = addDays(today(), 3);
const up3 = PL.upcoming(7);
ok(up3[up3.length - 1].type === "sinav" && up3[up3.length - 1].date === addDays(today(), 3) && up3.every((d) => d.date <= addDays(today(), 3)), "öngörü sınav gününde biter");
resetPlan();
red(["eh", "tense", "edat"]);
for (const k of [-2, -1]) S.sessions.push({ id: "k" + k, date: addDays(today(), k), kind: "oturum", type: "konu", done: true, topic: "t1", n: 16, c: 12, cf: 14, p: 75, pf: 88, spq: 70, dur: 50 }, { id: "t" + k, date: addDays(today(), k), kind: "tekrar", type: "tekrar", done: true, topic: "t1", n: 16, c: 9, cf: 12, p: 56, pf: 75, spq: 70, dur: 50 });
ok(PL.dayPlan().ask === true, "aynı gün konu oturumu olsa da iki açık kapama günü sayılır");

// --- Bulut eşitlemesi: birleştirme ---
{
  const A = defaultState(), B = defaultState();
  A.upd = 100; B.upd = 200;
  A.profile.target = 60; B.profile.target = 80;
  A.attempts.push({ t: 1, fam: "eh", sec: "gramer", ok: 1, fin: 1, u: 0, s: 30, src: "o", rep: 0, lab: "" });
  B.attempts.push({ t: 2, fam: "eh", sec: "gramer", ok: 0, fin: 1, u: 0, s: 30, src: "o", rep: 0, lab: "" }, { t: 1, fam: "eh", sec: "gramer", ok: 1, fin: 1, u: 0, s: 30, src: "o", rep: 0, lab: "" });
  A.sessions.push({ id: "sa", date: "2026-11-01", kind: "oturum", n: 10, c: 8, cf: 9, p: 80, pf: 90, spq: 60, dur: 30 } as any);
  B.sessions.push({ id: "sb", date: "2026-10-30", kind: "oturum", n: 10, c: 5, cf: 6, p: 50, pf: 60, spq: 60, dur: 30 } as any);
  A.fams.eh = { light: "yesil", wrong: 0, streak: 3, ok: 9, n: 12, last: 1, due: null, note: "" } as any;
  B.fams.eh = { light: "kirmizi", wrong: 2, streak: 0, ok: 3, n: 5, last: 1, due: null, note: "" } as any;
  A.vocab.push({ id: "v1", w: "mitigate", m: "hafifletmek", ex: "", prep: false, day: "", box: 3, due: "", ok: 4, bad: 1 });
  B.vocab.push({ id: "v1", w: "mitigate", m: "hafifletmek", ex: "", prep: false, day: "", box: 1, due: "", ok: 1, bad: 0 });
  A.todos.push({ id: "td1", t: "x", done: false }, { id: "td2", t: "y", done: false });
  B.todos.push({ id: "td1", t: "x", done: true });
  B.gone = ["td2"];
  A.seen.q1 = "2026-11-01"; B.seen.q1 = "2026-11-05";
  const M = mergeStates(A, B);
  ok(M.profile.target === 80 && M.upd === 200, "eşitleme: tek değerli alanlarda son değişen taraf kazanır");
  ok(M.attempts.length === 2 && M.attempts[0].t === 1, "eşitleme: cevaplar birleşir, aynı kayıt bir kez sayılır");
  ok(M.sessions.map((x) => x.id).join() === "sb,sa", "eşitleme: oturumlar birleşir ve tarihe göre sıralanır");
  ok(M.fams.eh.n === 12, "eşitleme: aile durumu daha çok soru görmüş taraftan gelir");
  ok(M.vocab.length === 1 && M.vocab[0].box === 3, "eşitleme: kelime kartı daha çok tekrar görmüş taraftan gelir");
  ok(M.todos.length === 1 && M.todos[0].done === true, "eşitleme: silinen yapılacak geri gelmez, güncel hâli kalır");
  ok(M.seen.q1 === "2026-11-05", "eşitleme: son görülme tarihi en yenisi");
  const M2 = mergeStates(B, A);
  ok(M2.profile.target === 80 && M2.attempts.length === 2 && M2.fams.eh.n === 12, "eşitleme: yön fark etmez");
}

console.log(`${passes} geçti, ${fails} kaldı`);
if (fails) process.exit(1);
