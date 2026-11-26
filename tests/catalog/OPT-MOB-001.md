---
id: OPT-MOB-001
title: Repoda gizli anahtar yok
project: optik-sinav-kocu
line: mobile
type: automated
priority: critical
env: unit
status: passed
---

## Amaç

Repo public. Supabase gizli anahtarı, service_role anahtarı, imza anahtarı ya da `.env` commit'lenirse herkes görür.

## Adımlar

1. Git'te izlenen tüm dosyaları tara.
2. `.env` (`.env.example` hariç), imza anahtarı ve servis hesabı dosyası ara.
3. Metin dosyalarında gizli anahtar ve token kalıpları ara.

## Beklenen sonuç

- Hiçbiri bulunmaz. Supabase anon anahtarı public olduğu için sorun sayılmaz.

## Notlar

Test: `tests/security/secrets.test.ts`.
