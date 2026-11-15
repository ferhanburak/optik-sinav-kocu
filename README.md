# Optik Sınav Koçu (YDS)

YDS'ye hazırlanan öğrenciler için günlük koçluk uygulaması: ısınma → kelimeler → konu → çözümlü örnekler → set → değerlendirme döngüsü, hata ailelerine göre gizli tekrar, yanlış defteri, deneme ve ilerleme.

Yayındaki sürüm: https://claude.ai/artifact/LQfjaZwVp3nT6S4bCU3Rvg

## Dosyalar

| Dosya | Ne işe yarar |
|---|---|
| `optik.html` | Uygulamanın kendisi (tek sayfa). İçerik bu dosyanın içine gömülüdür. |
| `content/bank1.js` | Soru bankası, yapı aileleri (E/H, edat, koşul, devrik, edilgen, tense, gerçek dışı, cümlecikler, modals, fiil kalıpları, used to) |
| `content/bank2.js` | Soru bankası: türetme, kelime, çeviri, okuma, cloze, diyalog, anlamca en yakın, paragraf, anlamı bozan cümle |
| `content/lessons1.js` | Konu anlatımları, Hafta 1–2 (t1–t11) |
| `content/lessons2.js` | Konu anlatımları, Hafta 2 sonu – 4 (t12–t21) |
| `content/lessons3.js` | t14 ve t17–t20 için ikinci partlar |
| `content/build.js` | İçeriği `optik.html` içine gömer |

## İçeriği düzenledikten sonra

```bash
node content/build.js
```

Komut, `content/` altındaki dosyaları `optik.html` içindeki `/*CONTENT-START*/ … /*CONTENT-END*/` işaretlerinin arasına yazar.

## Soru biçimi

`{f: aile, s: bölüm, q: kök, o: [5 şık], a: doğru şıkkın sırası (0–4), l: beklenen etiket, h: ipucu, x: açıklama, d: [şık başına neden yanlış], t: püf}`
Okuma ve cloze parçalarında `g` (grup numarası) ve ilk soruda `p` (parça metni) bulunur.

## Durum

- 169 soru ve 21 konu anlatımı; tümü bağımsız bir çözümle anahtara karşı doğrulandı (295/295 uyum).
- Yeni kelimeler, karar notları, koç yorumu ve bankada yetmeyen kısımlar (ör. tam denemede okumanın son 8 sorusu) Claude ile canlı yazılır.
