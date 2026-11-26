---
id: OPT-MOB-009
title: Günlük plan motoru
project: optik-sinav-kocu
line: mobile
type: automated
priority: high
env: unit
status: passed
---

## Amaç

Günün türü (konu, açık kapama, deneme), konu geçme kuralları, yoğunluk, son düzlük, ayar değişikliği ve konu atlama.

## Adımlar

1. Farklı plan modelleri, açık türleri, deneme geçmişi ve sınav tarihleriyle planı üret.

## Beklenen sonuç

- Kurallar README'deki plan açıklamasıyla uyumlu; öngörü sınav gününde biter.

## Notlar

Test: `tests/logic.test.ts`.
