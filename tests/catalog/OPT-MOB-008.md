---
id: OPT-MOB-008
title: Hata defteri ve eski kayıtların uyumu
project: optik-sinav-kocu
line: mobile
type: automated
priority: medium
env: unit
status: passed
---

## Amaç

Çalışma defteri (PDF) bölümleri ve eski sürümden gelen kayıtların yeni yapıya uyarlanması.

## Adımlar

1. Defter HTML'ini üret, hata tekrar testi oluştur, eski kayıtları normalize et.

## Beklenen sonuç

- Defterde tüm bölümler var; tekrar testi aynı aileden yeni sorular; eski kayıtta tek aktif konu.

## Notlar

Test: `tests/logic.test.ts`.
