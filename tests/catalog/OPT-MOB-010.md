---
id: OPT-MOB-010
title: Cihazlar arası bulut eşitlemesi
project: optik-sinav-kocu
line: mobile
type: automated
priority: high
env: unit
status: passed
---

## Amaç

İki cihazdan gelen durumların birleştirilmesi: veri kaybı ya da çift sayım olmamalı.

## Adımlar

1. İki farklı durumu iki yönde birleştir.

## Beklenen sonuç

- Tek değerli alanlarda son değişen kazanır; listeler birleşir ve aynı kayıt bir kez sayılır; silinen yapılacak geri gelmez; yön fark etmez.

## Notlar

Test: `tests/logic.test.ts`.
