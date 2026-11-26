---
id: OPT-MOB-002
title: Çalışma verisi yalnızca sahibine açık (RLS)
project: optik-sinav-kocu
line: mobile
type: automated
priority: critical
env: ci-supabase
status: passed
---

## Amaç

Eşitlenen çalışma durumu `user_state` tablosunda. Başkası okuyamamalı, değiştirememeli, silememeli.

## Adımlar

1. Yerel Supabase'de iki kullanıcı ve satırlarını oluştur.
2. A olarak oku, kendi satırını güncelle ve sil.
3. A olarak B'nin satırını güncellemeyi ve silmeyi, başka id ile satır yazmayı, kendi satırını başka id'ye taşımayı dene.
4. Oturumsuz (anon) olarak okumayı dene.
5. public şemadaki tüm tablolarda RLS açık mı bak.

## Beklenen sonuç

- A yalnızca kendi satırını görür, günceller ve siler.
- B'nin satırı değişmez; başka id ile yazma ve taşıma reddedilir.
- Anon hiçbir şeye erişemez.
- RLS kapalı tablo yoktur.

## Notlar

Test: `tests/rls/user-state.test.ts` (CI'da Supabase CLI ile; lokalde Docker yoksa atlanır).
