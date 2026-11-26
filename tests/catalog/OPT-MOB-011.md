---
id: OPT-MOB-011
title: Profil istatistikleri
project: optik-sinav-kocu
line: mobile
type: automated
priority: medium
env: unit
status: passed
---

## Amaç

Seri, toplam süre, doğruluk, deneme skorları ve en güçlü/zayıf hata türü.

## Adımlar

1. Örnek oturum, cevap ve denemelerle istatistikleri hesapla.

## Beklenen sonuç

- Seri, gün sayısı, süre, doğruluk ve deneme değerleri doğru; boş durumda sıfır.

## Notlar

Test: `tests/logic.test.ts`.
