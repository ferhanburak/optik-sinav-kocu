// Cep kartı: bütün kurallar tek bakışta. Defter PDF'inde ve Defter › Trickler sekmesinde gösterilir.
export interface PocketBox {
  t: string;
  warn?: boolean;
  items?: string[];
  table?: { cols: string[]; rows: string[][] };
  foot?: string;
}

export const POCKET: PocketBox[] = [
  {
    t: "1 · YAPI → ANLAM → ZAMAN",
    items: [
      "Şıklara bakma. Boşluktan virgüle kadar oku, **E / H / GZ** yaz.",
      "**E** (ana fiil var) → bağlaç · **H** → edat · `; ___ ,` → geçiş zarfı.",
      "**Parantez testi:** that'li / V3'lü kısmı paranteze al; kalanda ana fiil var mı? **that'i görünce durma.**",
      "be + V3, -s'li fiil ve **modal + V1** çekimlidir. the fact that…, isim + that + fiil, isim + V3, V-ing değildir.",
    ],
  },
  {
    t: "2 · Bağlaç ↔ edat",
    table: {
      cols: ["", "Bağlaç (+ cümle)", "Edat (+ isim / V-ing)"],
      rows: [
        ["Zıtlık", "although, even though, while, whereas", "despite, in spite of, notwithstanding"],
        ["Sebep", "because, since, as, given that", "because of, due to, owing to, on account of, in view of"],
        ["Amaç", "so that, in order that", "in order to / so as to + V1 · with a view to + V-ing"],
        ["Koşul", "if, unless, provided that, in case", "but for, without, in case of, in the event of"],
        ["Zaman", "while, once, until, by the time", "during, prior to, following, upon + V-ing"],
        ["Ekleme", "not only … but also", "in addition to, besides, as well as + V-ing"],
      ],
    },
  },
  {
    t: "3 · Geçiş zarfları (+/− koy)",
    items: [
      "`; ___ ,` ya da `. ___ ,` kalıbı geçiş zarfı ister.",
      "Yön dönüyor: however, nevertheless · aynı yön: moreover, furthermore · sonuç: therefore, thus, consequently · aksi: otherwise · red: on the contrary.",
    ],
  },
  {
    t: "4 · Koşul ve zaman",
    table: {
      cols: ["", "Yan cümle", "Ana cümle"],
      rows: [
        ["Tip 1 · when / until / once", "present (will yok)", "will + V1"],
        ["Tip 2", "V2 / were", "would + V1"],
        ["Tip 3", "had V3", "would have V3"],
        ["by the time", "past / present", "had V3 / will have V3"],
        ["since", "past", "present perfect"],
      ],
    },
    foot: "**Devrik koşul:** Should + özne + V1 · Were it not for · Had + özne + V3",
  },
  {
    t: "5 · Devrik",
    items: [
      "Başta Never, Rarely, Seldom, Hardly…when, No sooner…than, Not only, Little, On no account → **hemen arkası** devrik.",
      "Only after / when / by + X, Not until + X → **ana cümle** devrik (X düz).",
      "**Düz cümleyi yaz → soru yap.** be → be · have V3 → have · modal → modal · yoksa do / does / did + V1.",
      "Devrik edilgen: **normal cümleyi yaz** → V3 + nesne yok → be. been yoksa have / had seçilmez.",
      "Devrik değil: It was not until … that · Only + özne.",
    ],
  },
  {
    t: "6 · Anlam tuzakları",
    warn: true,
    items: [
      "**unless** = if not · unless + not çift olumsuz olur.",
      "**in case** = önlem · **only if** = ancak · **even if** varsayım / **even though** gerçek.",
      "**while** = -irken / oysa · until = süre · by the time = çoktan.",
      "so + sıfat · such (a) + sıfat + isim · thereby + V-ing · in addition ≠ in addition to + V-ing.",
    ],
  },
  {
    t: "7 · Edat kalıpları",
    items: [
      "**to:** attribute, contribute, give rise, subject, prone, object (+ V-ing), accustomed",
      "**from:** stem, result (sebep), refrain (+ V-ing), derive · **in:** result (sonuç), increase in",
      "**on:** depend, rely, focus · **with:** comply, cope, in accordance",
      "**of:** consist, regardless, in the wake · **for:** account, responsible",
      "Zarftan sonra boşluk → **zarfı atla, fiile dön** (attribute largely to).",
      "**İstisna:** aware / devoid / independent **of** · eligible **for** · vulnerable **to** · prevent sb **from** + V-ing",
    ],
  },
  {
    t: "8 · Kelime türetme: yer → tür (İ/S/Z/F yaz)",
    items: [
      "the / a / 's + (sıfat) + ___ + of → **isim**: -tion, -ment, -ity, -ance",
      "highly + ___ · prove / remain / find it + (zarf) + ___ → **sıfat**",
      "___ + sıfat · can ___ + fiil → **zarf** (-ly) · to / modal + ___ → **fiil**",
      "Önce sol, sonra sağ, sonra: **cümlede fiil zaten var mı?**",
    ],
  },
  {
    t: "9 · Tense: önce çapa (ipucu → tense)",
    items: [
      "since / so far / over the past → **has V3** · ago / in 1998 → **V2**",
      "by + gelecek → **will have V3** · by the time + past → **had V3**",
      "while → **was / were V-ing** · This is the first time + **has V3**",
      "said / claimed (past) + that → **would** · nesne yok ve iş özneye yapılıyor → **edilgen**.",
    ],
  },
  {
    t: "10 · 10 saniyelik kontrol",
    warn: true,
    items: [
      "Hangi aile? (E/H · çapa · devrik · T/E · tür) → **etiketi yaz** → sonra şık.",
      "Soru başına en az ~75 sn. Hızlanınca bilinen kural kaçıyor.",
      "Okumada **kanıt yoksa cevap yok**: parçadan 4–6 kelimelik satırı göster.",
      "Odak dağıldıysa 30 sn reset: kalemi bırak, 3 nefes, soru kökünü yeniden oku.",
    ],
  },
];
