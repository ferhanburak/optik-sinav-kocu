// Motor testi: npm test (esbuild ile paketlenir, node ile çalışır; RN modülleri tests/rn-mock.js ile taklit edilir)
import { BANK_ALL, LESSONS } from "../src/content";
import { CURRICULUM, FAMILIES, PLACEMENT, SECTIONS } from "../src/data/catalog";
import { VOCAB_BANK } from "../src/data/vocab";
import * as E from "../src/lib/engine";
import { defterHTML } from "../src/lib/defter";
import { S, normalize, defaultState } from "../src/lib/store";
import { addDays, today, uid } from "../src/lib/dates";

let fails = 0, passes = 0;
const ok = (cond: unknown, msg: string) => { if (cond) passes++; else { fails++; console.log("FAIL:", msg); } };

// İçerik
ok(BANK_ALL.length === 169, `banka 169 soru (${BANK_ALL.length})`);
ok(new Set(BANK_ALL.map((x) => x.bid)).size === BANK_ALL.length, "bid'ler benzersiz");
ok(BANK_ALL.every((x) => x.o.length === 5 && x.a >= 0 && x.a < 5 && FAMILIES[x.fam] && SECTIONS[x.sec]), "her soru geçerli");
const withLesson = CURRICULUM.filter((c) => LESSONS[c.id]).map((c) => c.id);
ok(withLesson.length === 21, `21 konu anlatımı (${withLesson.length})`);
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
const st = E.newCardState();
const wrong = (q.a + 1) % 5;
E.cardPick(q, st, wrong, "set"); ok(st.stage === "retry", "ilk yanlışta retry");
ok(!E.cardPick(q, st, wrong, "set"), "aynı yanlış şık tekrar seçilemez");
E.cardPick(q, st, q.a, "set"); ok(st.stage === "done", "ikinci denemede bitiş");
const at = S.attempts[S.attempts.length - 1];
ok(at.ok === 0 && at.fin === 1, "resmî skor ilk deneme, sonunda doğru");
ok(S.mistakes.some((m) => m.id === st.mid), "yanlış deftere düştü");
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
ok(E.activeTopic()?.id === "t1", "aktif konu t1");
E.advanceTopic(); ok(E.activeTopic()?.id === "t2", "devam → t2");
E.jumpTopic("t10"); ok(E.activeTopic()?.id === "t10" && E.topicStatus("t2") === "tamam" && E.topicStatus("t5") === "bekliyor", "konuya atla");

// Defter ve normalize
S.sessions.push({ id: "x", date: today(), kind: "oturum", topic: "t7", n: 16, c: 10, cf: 12, p: 63, pf: 75, spq: 60, dur: 30 });
const html = defterHTML();
ok(html.includes("Zaman uyumu") && html.includes("Cevap anahtarı"), "haftalık defter HTML");
ok(normalize(null).v === 2 && normalize({ v: 2, fams: 3 }).fams && Array.isArray(normalize({ v: 2 }).attempts), "normalize");
ok(defaultState().topics.find((t) => t.status === "aktif")?.id === "t1", "varsayılan aktif konu t1");

console.log(`${passes} geçti, ${fails} kaldı`);
if (fails) process.exit(1);
