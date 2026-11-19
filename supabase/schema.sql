-- Optik: kullanıcı başına tek satırlık çalışma durumu.
-- Supabase panelinde SQL Editor'a yapıştırıp bir kez çalıştır.

create table if not exists public.user_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.user_state enable row level security;

-- Data API erişimi: yalnızca giriş yapmış kullanıcılar (satırları aşağıdaki kurallar sınırlar).
-- Projede "Grant API access to new tables automatically" kapalıysa bu satır gerekir.
revoke all on public.user_state from anon;
grant select, insert, update, delete on public.user_state to authenticated;

-- Herkes yalnızca kendi satırını görür ve değiştirir.
drop policy if exists "kendi satırını oku" on public.user_state;
create policy "kendi satırını oku" on public.user_state
  for select using (auth.uid() = user_id);

drop policy if exists "kendi satırını ekle" on public.user_state;
create policy "kendi satırını ekle" on public.user_state
  for insert with check (auth.uid() = user_id);

drop policy if exists "kendi satırını güncelle" on public.user_state;
create policy "kendi satırını güncelle" on public.user_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "kendi satırını sil" on public.user_state;
create policy "kendi satırını sil" on public.user_state
  for delete using (auth.uid() = user_id);
