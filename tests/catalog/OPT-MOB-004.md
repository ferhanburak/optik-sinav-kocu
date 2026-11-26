---
id: OPT-MOB-004
title: Soru kartı, ikinci deneme ve hata türü ışıkları
project: optik-sinav-kocu
line: mobile
type: automated
priority: high
env: unit
status: passed
---

## Amaç

Uygulamanın temel döngüsü: ilk yanlışta ikinci deneme, resmî skorun ilk deneme olması, yanlışın deftere düşmesi ve hata türü ışığının değişmesi.

## Adımlar

1. Bir soruyu önce yanlış, sonra doğru cevapla.
2. Hata türü ışıklarını doğru/yanlış cevaplarla değiştir.

## Beklenen sonuç

- İlk yanlışta tekrar hakkı; resmî skor ilk deneme; yanlış deftere düşer ve teşhis kaydedilir; ışıklar kırmızı → sarı → yeşil kuralına uyar.

## Notlar

Test: `tests/logic.test.ts`.
