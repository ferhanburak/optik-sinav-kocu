---
id: OPT-MOB-003
title: Soru bankası ve konu anlatımları tutarlı
project: optik-sinav-kocu
line: mobile
type: automated
priority: high
env: unit
status: passed
---

## Amaç

473 soru ve 24 konu anlatımı. Şık sayısı, cevap anahtarı ve kimlikler bozulursa sorular yanlış değerlendirilir.

## Adımlar

1. Bankayı ve anlatımları tara.

## Beklenen sonuç

- Her soru 5 şıklı ve cevabı geçerli; kimlikler benzersiz; aile ve bölümler tanımlı; her anlatımda en az 4 çözümlü örnek; kelime bankasında tekrar yok.

## Notlar

Test: `tests/logic.test.ts`.
