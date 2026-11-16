// Katalog: bölümler, hata aileleri, etiketler, müfredat, trickler, deneme düzeni, seviye testi
import type { Topic } from "../types";

export interface LabelDef { t: "btn" | "txt"; o?: string[]; q: string; h?: string; ph?: string }
export type MockMode = "full" | "half" | "mini";
export interface PlacementQ { fam: string; sec: string; q: string; o: string[]; a: number; lab?: string; x: string; p?: string }

export const SECTIONS: Record<string, string> = {kelime:"Kelime",gramer:"Dilbilgisi",cloze:"Cloze test",tamamlama:"Cümle tamamlama",ceviri:"Çeviri",okuma:"Okuma",diyalog:"Diyalog",restatement:"Anlamca en yakın",paragraf:"Paragraf tamamlama",bozan:"Anlamı bozan cümle"};
export const FAMILIES: Record<string, { n: string; lab: string; tool: string }> = {
  eh:{n:"Bağlaç / edat yapısı (E/H)",lab:"EH",tool:"E/H etiketi + parantez testi + çapraz kontrol: H yazdıysan sadece edat şıklarına bak."},
  turetme:{n:"Kelime türetme (yer → tür)",lab:"ISZF",tool:"İ/S/Z/F etiketini şıklara bakmadan yaz, sonra eke bak."},
  edat:{n:"Edat kalıpları",lab:"",tool:"Türkçe ek → edat: -e → to, -den → from, ile → with. Zarfı atla, fiile dön (attribute largely to)."},
  kosul:{n:"Koşul (unless, in case, tense)",lab:"CAPA",tool:"unless yerine 'if not' koyup düz çevir; çapayı yaz."},
  devrik:{n:"Devrik yapı ve devrik edilgen",lab:"NORMAL",tool:"normal cümle:____ yaz → soru yap → yardımcı fiili öne al. been yoksa have/had seçilemez."},
  edilgen:{n:"Edilgen yapı",lab:"",tool:"Nesne yoksa ve iş özneye yapılıyorsa → be + V3. Geçişsiz fiiller edilgen olmaz."},
  tense:{n:"Tense çapası",lab:"CAPA",tool:"Çapa: ipucu → tense yaz (ör. since → has V3, by the time + past → had V3)."},
  gercekdisi:{n:"Gerçek dışı yapılar (if, wish, as if, high time)",lab:"CAPA",tool:"wish: şimdi → V2, geçmiş → had V3. high time + V2. Gerçek durumun bir zaman gerisi."},
  isimcumle:{n:"İsim cümlecikleri",lab:"TE",tool:"Parantez testi: that / whether / what sonrası tam mı eksik mi?"},
  relative:{n:"Relative clauses",lab:"TE",tool:"T/E testi: tam → where / when / edat + which · eksik → who / which / that · iyelik → whose."},
  modal:{n:"Modals",lab:"",tool:"Geçmiş çıkarım: must have V3 · gereksiz yapılan: needn't have V3 · pişmanlık: should have V3."},
  fiilkalip:{n:"Fiil kalıpları (to V / V-ing)",lab:"",tool:"avoid / deny / consider + V-ing · decide / manage / fail + to V · to edatlı kalıplar + V-ing (look forward to)."},
  usedto:{n:"used to / be used to",lab:"",tool:"be yoksa V1, be varsa V-ing."},
  kelime:{n:"Kelime anlamı ve geçişlilik",lab:"TR",tool:"Önce boşluğa kendi Türkçe kelimeni koy, sonra şıklarda ara."},
  okuma:{n:"Okuma: kanıt",lab:"KANIT",tool:"Her cevaba parçadan 4–6 kelimelik kanıt satırı. Kanıt yoksa cevap yok."},
  paragraf:{n:"Paragraf tipleri ve diyalog",lab:"",tool:"Yer = görev: zamir, yön, odak, köprü kontrolü. Çıkar-birleştir testi."},
  ceviri:{n:"Çeviri",lab:"",tool:"Zamanı, edilgeni ve bağlacı eşle; fazladan anlam ekleyen şıkkı ele."}
};
export const LABELS: Record<string, LabelDef> = {
  EH:{t:"btn",o:["E","H","GZ"],q:"Virgüle kadar ana fiil var mı?",h:"E = evet, fiil var → bağlaç · H = hayır → edat · GZ = geçiş zarfı"},
  ISZF:{t:"btn",o:["İ","S","Z","F"],q:"Boşluk hangi türü istiyor?",h:"İsim · Sıfat · Zarf · Fiil. Şıklara bakmadan karar ver."},
  TE:{t:"btn",o:["T","E","İyelik"],q:"Boşluktan sonrası tam mı, eksik mi?",h:"T → where / when / edat + which · E → who / which / that · İyelik → whose"},
  CAPA:{t:"txt",q:"Çapa: ipucu → tense",ph:"ör. since → has V3"},
  NORMAL:{t:"txt",q:"normal cümle:",ph:"tetikleyiciyi sil, cümleyi düz yaz"},
  KANIT:{t:"txt",q:"Kanıt satırı",ph:"parçadan 4–6 kelime"},
  TR:{t:"txt",q:"Boşluğa kendi Türkçe kelimen",ph:"ör. hafifletmek"}
};
export const CURRICULUM: Topic[] = [
  {w:0,id:"t0",t:"Seviye testi",kind:"mock",f:[]},
  {w:1,id:"tf",t:"Altın kural: “Fiil var mı?”",f:["eh"]},
  {w:1,id:"t1",t:"Bağlaçlar: zıtlık",f:["eh"]},
  {w:1,id:"t2",t:"Bağlaçlar: sebep, sonuç, amaç",f:["eh"]},
  {w:1,id:"t3",t:"Bağlaçlar: koşul",f:["kosul","eh"]},
  {w:1,id:"t4",t:"Bağlaçlar: ekleme ve zaman",f:["eh"]},
  {w:1,id:"t5",t:"Karma bağlaç ve geçiş ifadeleri",f:["eh"]},
  {w:1,id:"t6",t:"Devrik yapı",f:["devrik"]},
  {w:2,id:"t7",t:"Zaman uyumu (tense)",f:["tense"]},
  {w:2,id:"t8",t:"Sıfat cümlecikleri (relative clauses)",f:["relative"]},
  {w:2,id:"t9",t:"İsim cümlecikleri",f:["isimcumle"]},
  {w:2,id:"t10",t:"Edilgen ve devrik edilgen",f:["edilgen","devrik"]},
  {w:2,id:"t11",t:"Gerçek dışı yapılar: if, wish, as if, high time",f:["gercekdisi"]},
  {w:2,id:"t12",t:"Modals ve used to",f:["modal","usedto"]},
  {w:3,id:"t13",t:"Edatlar 2: Türkçe ek → edat, sıfat + edat",f:["edat"]},
  {w:3,id:"t14",t:"Phrasal verbs",f:["kelime"]},
  {w:3,id:"t15",t:"Kelime türetme",f:["turetme"]},
  {w:3,id:"tk",t:"Kelime ve anlam tuzakları",f:["kelime"]},
  {w:3,id:"tc",t:"10 saniyelik kontrol kartı",f:[]},
  {w:4,id:"t16",t:"Okuma stratejileri",f:["okuma"]},
  {w:4,id:"t17",t:"Paragraf tamamlama",f:["paragraf"]},
  {w:4,id:"t18",t:"Anlamı bozan cümle",f:["paragraf"]},
  {w:4,id:"t19",t:"Anlamca en yakın cümle (restatement)",f:["paragraf"]},
  {w:4,id:"t20",t:"Diyalog tamamlama",f:["paragraf"]},
  {w:4,id:"t21",t:"Çeviri",f:["ceviri"]},
  {w:5,id:"t22",t:"Tam denemeler, hata analizi ve zayıf konular",kind:"review",f:[]},
  {w:5,id:"t23",t:"Hafif tekrar ve sınav günü taktikleri",kind:"review",f:[]}
];
export const WEEK_NAMES: Record<number, string> = {0:"Başlangıç",1:"Bağlaçlar ve geçiş ifadeleri",2:"Yapılar",3:"Edatlar ve kelime",4:"Okuma ve paragraf",5:"Son hafta"};
export const TRICKS: [string, string][] = [
  ["E/H","Virgüle kadar ana fiil var mı? Evet → bağlaç, Hayır → edat."],
  ["Parantez testi","that'li, V3'lü ya da wh-'li kısmı paranteze al, kalan kısımda fiil ara."],
  ["Nokta testi","Kısmı büyük harfle başlatıp sonuna nokta koy. Tam cümle mi?"],
  ["Türkçe test","-an / -en / -ilen / -dığı ile çevrilebiliyorsa isim öbeğidir → H."],
  ["T/E","Sonrası tam → where / when / edat + which. Eksik → who / which / that. İyelik → whose."],
  ["Yer → tür","the ___ of → isim · highly / prove / remain + ___ → sıfat · ___ + fiil → zarf."],
  ["that","that'i görünce durma, virgüle kadar oku."],
  ["Zarfı atla","Zarfı atla, fiile dön: attribute largely to, depend heavily on."],
  ["Türkçe ek → edat","-e → to, -den → from, ile → with."],
  ["unless","unless = if not. unless + not çift olumsuz olur."],
  ["wish","şimdi → V2, geçmiş → had V3. high time + V2."],
  ["used to","be yoksa V1, be varsa V-ing."],
  ["Edilgen","Nesne yoksa ve iş özneye yapılıyorsa → be."],
  ["Devrik","Cümleyi soru yap. Soru hâlindeki sıra, devrik sıranın aynısıdır. been yoksa have / had seçilmez."],
  ["Çapa","Tense'e şıklara bakarak değil, çapaya bakarak karar ver: ipucu → tense."],
  ["Kanıt","Kanıt yoksa cevap yok. Yorum yapma, parçada ne yazıyorsa o."],
  ["Hız","Soru başına en az ~75 sn. Hızlanınca bilinen kural kaçıyor."],
  ["10 sn kontrol","Hangi soru tipi? (E/H, çapa, devrik, T/E, kelime türü) → etiketi yaz → sonra şık."],
  ["30 sn reset","Kalemi bırak, 3 nefes al, soru kökünü yeniden oku, kanıtı yaz."]
];
export const DIAG = ["Kuralı bilmiyordum","Kuralı karıştırdım","Hızlı geçtim","Etiketi yazmadım","Kelimeyi bilmiyordum","Şıkları yanlış eledim","Yanlış tıkladım"];
export const MOCK_LAYOUT: [string, number][] = [["kelime",6],["gramer",10],["cloze",10],["tamamlama",10],["ceviri",6],["okuma",20],["diyalog",5],["restatement",4],["paragraf",4],["bozan",5]];
export const MOCK_MODES: Record<MockMode, { l: string; n: number; min: number }> = {full:{l:"Tam deneme",n:80,min:180},half:{l:"Yarım deneme (1–40)",n:40,min:90},mini:{l:"Mini deneme",n:20,min:45}};
export const AREAS = [
  {id:"kelime",l:"Kelime bilgisi ve türetme",f:["kelime","turetme"]},
  {id:"baglac",l:"Bağlaç / edat ayrımı ve koşul",f:["eh","kosul"]},
  {id:"edat",l:"Edat kalıpları",f:["edat"]},
  {id:"yapi",l:"Yapılar: tense, edilgen, devrik, cümlecikler",f:["tense","edilgen","devrik","relative","isimcumle","gercekdisi","modal","fiilkalip","usedto"]},
  {id:"okuma",l:"Okuma parçaları",f:["okuma"]},
  {id:"paragraf",l:"Paragraf, diyalog, yakın anlam",f:["paragraf"]},
  {id:"ceviri",l:"Çeviri",f:["ceviri"]}
];
export const RATE_LABEL = ["Çok zayıf","Zayıf","Orta","İyi","Çok iyi"];

export const PLACEMENT: PlacementQ[] = [
  {fam:"tense",sec:"gramer",q:"Since the 1990s, the number of people working from home ---- steadily, especially in developed countries.",o:["increases","has increased","had increased","was increasing","will increase"],a:1,lab:"since → has V3",x:"Çapa 'since + geçmiş nokta' bugüne uzanan süreci gösterir: Present Perfect."},
  {fam:"modal",sec:"gramer",q:"You ---- your umbrella; the forecast said it would be sunny all day, and it was.",o:["mustn't bring","couldn't have brought","should have brought","might bring","needn't have brought"],a:4,x:"Şemsiye getirilmiş ama gerek yokmuş: needn't have V3."},
  {fam:"edilgen",sec:"gramer",q:"The ancient manuscripts ---- in a monastery in 1947 by a group of shepherds.",o:["discovered","have been discovered","were discovered","had discovered","are discovering"],a:2,x:"İşi özne yapmıyor (by a group of shepherds) ve tarih belli (1947): Past Simple edilgen."},
  {fam:"gercekdisi",sec:"gramer",q:"Were the company to lower its prices, it ---- more customers.",o:["had attracted","attracts","will have attracted","would attract","attracted"],a:3,lab:"were to → would V1",x:"'Were + özne + to V' devrik Type 2 koşuldur; ana cümle would + V1."},
  {fam:"relative",sec:"gramer",q:"The scientist ---- theory was rejected at first later won the Nobel Prize.",o:["who","whose","whom","which","what"],a:1,lab:"İyelik",x:"'onun teorisi': sahiplik → whose."},
  {fam:"isimcumle",sec:"gramer",q:"Researchers still do not know ---- some people are immune to the disease.",o:["what","whom","why","which","whose"],a:2,lab:"T",x:"Sonrası tam cümle, eksik öğe yok; sebep soruluyor: why."},
  {fam:"eh",sec:"gramer",q:"---- the roads were icy, the bus driver drove extremely carefully.",o:["Unless","Despite","As","Because of","Whereas"],a:2,lab:"E",x:"Virgüle kadar fiil var (were) → E → bağlaç. Anlam sebep: As. Despite / Because of edattır."},
  {fam:"fiilkalip",sec:"gramer",q:"The government has decided ---- the tax on fuel next year.",o:["reducing","to reduce","reduce","to have reduced","reduced"],a:1,x:"decide + to V."},
  {fam:"eh",sec:"gramer",q:"The match was postponed ---- the heavy snow that had blocked most of the roads.",o:["although","because","owing to","since","even though"],a:2,lab:"H",x:"Parantez testi: (that had blocked...) çıkınca 'the heavy snow' kalır, ana fiil yok → H → edat: owing to."},
  {fam:"edat",sec:"gramer",q:"The decline in bird populations has been attributed largely ---- the loss of natural habitats.",o:["for","to","with","on","from"],a:1,x:"Zarfı atla, fiile dön: attribute ... to."},
  {fam:"turetme",sec:"kelime",q:"The new treatment has proved highly ---- in reducing the symptoms of the disease.",o:["effect","effectively","effective","effectiveness","effects"],a:2,lab:"S",x:"prove + highly + ___ → sıfat: effective."},
  {fam:"kelime",sec:"kelime",q:"Rising temperatures are expected to ---- the shortage of water in the region.",o:["alleviate","abandon","confine","retrieve","exacerbate"],a:4,lab:"kötüleştirmek",x:"Sıcaklık artışı sıkıntıyı kötüleştirir: exacerbate. alleviate tam tersi."},
  {fam:"kelime",sec:"kelime",q:"The concert had to be ---- because of the heavy storm.",o:["looked after","taken up","set out","called off","turned up"],a:3,lab:"iptal etmek",x:"Fırtına yüzünden iptal: call off."},
  {fam:"eh",sec:"cloze",q:"Honeybees play a vital role in agriculture. ----, their numbers have fallen sharply in recent decades, largely due to pesticides and disease.",o:["Therefore","Similarly","However","For instance","In addition"],a:2,lab:"GZ",x:"'; ___ ,' konumu geçiş zarfı ister; yön zıt (+ → −): However."},
  {fam:"tense",sec:"cloze",q:"The museum, which ---- to the public in 1998, now attracts more than a million visitors a year.",o:["opened","has opened","was opening","had been opened","opens"],a:0,lab:"in 1998 → past",x:"Çapa 'in 1998' → Past Simple."},
  {fam:"eh",sec:"tamamlama",q:"Even though the experiment was carefully designed, ----.",o:["it was conducted in a modern laboratory","the results were not as expected","the researchers were highly experienced","because the equipment was expensive","so it took three years to complete"],a:1,x:"Even though zıtlık ister: dikkatli tasarlandı ama sonuç beklendiği gibi değil."},
  {fam:"gercekdisi",sec:"tamamlama",q:"----, the city would not have been able to host the Olympic Games.",o:["If it hadn't received government funding","Since it receives government funding","Unless it receives government funding","Although it received government funding","As long as it receives funding"],a:0,lab:"would have V3 → had V3",x:"Ana cümle would not have been (Type 3) → yan cümle Past Perfect."},
  {fam:"ceviri",sec:"ceviri",q:"The more we learn about the brain, the more we realise how little we actually know.",o:["Beyin hakkında çok şey öğrendik ama hâlâ az şey biliyoruz.","Beyni öğrenmek, ne kadar az bildiğimizi fark etmemizi sağlar.","Beyin hakkında ne kadar çok şey öğrenirsek, aslında ne kadar az şey bildiğimizi o kadar çok fark ederiz.","Beyin hakkında bildiklerimiz, öğrendiklerimizden azdır.","Beyin hakkında daha çok şey öğrenmek için ne kadar az bildiğimizi fark etmeliyiz."],a:2,x:"The more ..., the more ... → ne kadar çok ..., o kadar çok ..."},
  {fam:"ceviri",sec:"ceviri",q:"Bu ilacın yan etkileri henüz tam olarak bilinmemektedir.",o:["The side effects of this drug are well known.","The side effects of this drug are not yet fully known.","This drug has no known side effects yet.","Scientists have not yet tested this drug for side effects.","The side effects of this drug were known before."],a:1,x:"henüz = not yet, tam olarak = fully, bilinmemektedir = are not known."},
  {fam:"okuma",sec:"okuma",p:"Octopuses are known for their intelligence. They can solve puzzles, open jars and even escape from closed tanks. Unlike most intelligent animals, however, they live only one to two years and have little contact with their parents, so most of their abilities cannot be learned from others.",q:"It can be inferred from the passage that octopuses ----.",o:["learn most skills from their parents","live longer than most intelligent animals","cannot solve puzzles","spend their lives in closed tanks","develop most of their abilities on their own"],a:4,lab:"cannot be learned from others",x:"Kanıt: 'cannot be learned from others' → becerileri kendi geliştiriyorlar."},
  {fam:"okuma",sec:"okuma",p:"Although remote work offers flexibility, a recent survey found that many employees feel isolated and miss informal conversations with colleagues. As a result, a growing number of companies are adopting hybrid models, in which staff spend part of the week in the office.",q:"According to the passage, companies are adopting hybrid models because ----.",o:["employees working remotely may feel isolated","remote work is more expensive","offices are becoming cheaper","employees prefer to work only at home","the survey was criticised"],a:0,lab:"feel isolated ... As a result",x:"Kanıt: 'feel isolated' + 'As a result'."},
  {fam:"kosul",sec:"gramer",q:"You will not be allowed to board the plane ---- you show a valid passport at the gate.",o:["if","unless","in case","as long as","provided that"],a:1,lab:"if not",x:"unless = if not: geçerli pasaport göstermezsen uçağa binemezsin. if / as long as / provided that anlamı tersine çevirir."},
  {fam:"usedto",sec:"gramer",q:"When I was a child, I ---- to the seaside with my grandparents every summer.",o:["am used to going","used to go","use to go","get used to going","have used to go"],a:1,x:"Geçmişteki alışkanlık ve be yok → used to + V1. am / get used to + V-ing şimdiye ait; use to go ancak did ile kullanılır."},
  {fam:"paragraf",sec:"diyalog",q:"Sarah: I can't believe the exam was moved to next week!\nDavid: ----\nSarah: True, I'll have more time to revise the reading section.",o:["Really? I thought it was cancelled.","I've already taken that exam.","The exam was very difficult.","Well, look on the bright side.","Who told you about the exam?"],a:3,x:"Sarah'nın 'True, daha çok zamanım olacak' cevabı olumlu tarafa bakıldığını gösterir."},
  {fam:"devrik",sec:"restatement",q:"No sooner had she left the house than it started to rain.",o:["It started to rain as soon as she left the house.","She left the house because it was raining.","It had been raining before she left the house.","She didn't leave the house until it stopped raining.","It rarely rains when she leaves the house."],a:0,lab:"She had left the house",x:"No sooner ... than = as soon as."},
  {fam:"paragraf",sec:"paragraf",q:"Many people believe that goldfish have a memory span of only three seconds. ----. In one study, goldfish were trained to push a lever for food and remembered the task for several months.",o:["Goldfish are popular pets in many countries","Therefore, goldfish cannot be trained","However, research has shown that this is a myth","Goldfish can live for more than ten years","Some fish change colour as they grow older"],a:2,x:"Yer = görev: inanç → (karşı çıkış) → kanıt. Köprü: However."},
  {fam:"paragraf",sec:"bozan",q:"(I) Walking is one of the simplest forms of exercise. (II) It requires no special equipment and can be done almost anywhere. (III) Regular walking has been shown to reduce the risk of heart disease. (IV) Many cities are investing in electric buses to reduce pollution. (V) It can also improve mood and help people sleep better.",o:["I","II","III","IV","V"],a:3,x:"I. cümlenin odağı yürüyüş. IV. cümle şehir ulaşımına geçiyor."}
];

export const LIGHT_LABEL: Record<string, string> = { red: "açık", yellow: "düzeliyor", green: "oturdu", none: "veri yok" };
export const LIGHT_ORDER: Record<string, number> = { red: 0, yellow: 1, green: 2, none: 3 };
export const LETTERS = "ABCDE";
export const TANIMA_GOAL = 12;
