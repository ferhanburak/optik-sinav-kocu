# Optik Sınav Koçu (YDS)

Optik Sınav Koçu, YDS'ye hazırlanan öğrenciler için günlük bir koçluk uygulamasıdır. React Native ve Expo ile yazılmıştır.

Her gün aynı döngü işler: ısınma, kelimeler, konu, çözümlü örnekler, set ve değerlendirme. Ayrıca şunlar vardır:

- **Sınavlarım:** Uygulamanın merkezi. Eklenen sınavlar durumlarıyla (kalan gün, bugünün oturumu, son skor) görünür; yeni sınav buradan eklenir. Şu an YDS hazır; YÖKDİL, KPSS, ALES, TUS ve DUS "Yakında". Tek sınavı olan doğrudan o sınavın menüsüne, birden fazla sınavı olan bu ekrana açılır.
- **Profil ve ayarlar:** Ad, eklenen sınavlar, bildirimler ve veri sıfırlama Profil'de durur (bütün sınavlar için ortak); sınav tarihi, hedef ve saatler her sınavın kendi ayarlarındadır.
- **Plan:** Kullanıcı başta plan modelini (Uyarlanan, Sıralı, Açık kapama ağırlıklı), çalışma günlerini ve günlük süreyi seçer; sonrasını sistem yönetir. Günün türü (konu günü ya da açık kapama günü) ve yoğunluk sistemce belirlenir. Konu, testinde %70 ve üzeri alınca tamamlanır; biten konu yeniden açılabilir. Plan ekranında bugün ve yarın kesin, sonraki günler beklenen olarak görünür.
- **Esneklik hakları:** Haftada iki hafif gün; gün atlamak serbesttir ama ertesi gün telafi gelir ve beklenen bitiş kayar. Açık kapatmayı istemek her zaman serbesttir.
- **Gizli tekrar:** Hatalar türlerine göre gruplanır. Bir hata türünden yaptığın yanlış, sonraki günlerde yeni bir cümleyle yeniden sorulur.
- **Defterler:** Yanlış defteri, karar notları, cep kartı ve çalışma defteri (PDF olarak paylaşılır).
- **Çalışma defteri:** İlk oturumdan bugüne birikimlidir. Haftalık skorlar, alan alan gelişim, çalışılan konuların anlatımı, türüne göre hata analizi, her tuzak için yeni soruyla hata tekrar testi, kelimeler, cep kartı ve açıklamalı cevap anahtarı içerir.
- **Deneme ve ilerleme:** Tam, yarım ve mini denemeler; skor eğrisi ve hata türlerinin durumu.
- **Hatırlatıcılar:** Telefon bildirimleriyle çalışır.

## Çalıştırma

```bash
npm install
```

```bash
npx expo start
```

Telefona **Expo Go** uygulamasını kur ve terminalde çıkan QR kodu okut. Tarayıcıda denemek istersen `npx expo start --web` komutunu çalıştır.

## Komutlar

| Komut | Ne yapar |
|---|---|
| `npm test` | Motor testlerini çalıştırır: içerik, ışıklar, setler, denemeler, kelimeler, karar notu |
| `npm run typecheck` | TypeScript tip kontrolü yapar |
| `npm run build:web` | `src/content` içeriğini web sürümüne (`web/optik.html`) gömer |

## Klasörler

| Yol | İçerik |
|---|---|
| `App.tsx` | Ana kabuk: üst çubuk, sekmeler, tam ekran oynatıcı, pencereler |
| `src/content/` | Soru bankası (`bank1.ts`, `bank2.ts`) ve 24 konu anlatımı (`lessons1–4.ts`) |
| `src/data/` | Katalog (bölümler, hata türleri, müfredat, seviye testi), kelime bankası ve cep kartı |
| `src/lib/` | Motor (`engine.ts`), kayıt (`store.ts`, AsyncStorage), tarih, gezinme, bildirimler, çalışma defteri (`defter.ts`) |
| `src/ui/` | Ortak bileşenler, soru kartı, konu anlatımı görünümü, grafikler |
| `src/screens/` | Sınavlarım, Bugün, Plan, Deneme, Defter (kelimeler dahil), İlerleme, profil ve sınav ayarları |
| `src/players/` | Günlük oturum, drill, seviye testi, deneme, kelime tekrarı |
| `tests/` | Motor testleri |
| `web/` | Tek sayfalık önceki web sürümü (Claude Artifact) |

## Soru biçimi

Her soru şu alanlardan oluşur:

`{f: hata türü, s: bölüm, q: kök, o: [5 şık], a: doğru şıkkın sırası (0–4), l: beklenen etiket, h: ipucu, x: açıklama, d: [şık başına neden yanlış], t: püf}`

Okuma ve cloze sorularında ayrıca `g` (grup numarası) bulunur. Grubun ilk sorusunda parça metni `p` alanındadır.

## Durum

- **İçerik:** 169 soru ve 24 konu anlatımı var; 169 sorunun anahtarı bağımsız bir çözümle doğrulandı.
- **Hata kodları:** Her yanlış kısa bir kodla kaydedilir: `I3` ısınma 3, `S5` set 5, `D2` drill 2, `T7` seviye testi 7, `M41` deneme 41.
- **Seviye testi:** 27 soru, 17 hata türünün hepsini kapsıyor.
- **Kelime bankası:** 150 kelime ve kalıp; bunların 30'u edat kalıbı.
- **Uygulama tamamen çevrimdışı çalışır.** Karar notu ve haftalık koç yorumu, oturum verisinden kurallara göre yazılır.
- **Tam deneme:** Okuma bölümünün son 8 sorusu bankada henüz yok, bu yüzden tam deneme şimdilik 72 soruyla açılıyor.
- **Web sürümü:** `web/optik.html` eski 21 konuyla duruyor; yeni üç konu, cep kartı ve yeni defter yalnızca mobil uygulamada var.
