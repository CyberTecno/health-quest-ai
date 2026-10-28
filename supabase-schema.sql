-- Tahap 4: skema awal Supabase untuk akun, memori, progres, dan misi.
-- Jalankan di Supabase SQL Editor setelah membuat project.
create extension if not exists pgcrypto;

create table if not exists public.hq_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  food_preferences jsonb not null default '{}'::jsonb,
  schedule_preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.hq_profiles add column if not exists username text;
create unique index if not exists hq_profiles_username_unique on public.hq_profiles (lower(username)) where username is not null;

create table if not exists public.hq_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  progress_date date not null default current_date,
  habits jsonb not null default '[]'::jsonb,
  meal_days jsonb not null default '[]'::jsonb,
  workout_days jsonb not null default '[]'::jsonb,
  weight_kg numeric(5,2),
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  streak integer not null default 0 check (streak >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, progress_date)
);

create table if not exists public.hq_chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null check (char_length(content) <= 5000),
  created_at timestamptz not null default now()
);

create table if not exists public.hq_missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_date date not null default current_date,
  title text not null,
  description text not null default '',
  xp_reward integer not null default 10 check (xp_reward between 0 and 100),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.hq_profiles enable row level security;
alter table public.hq_progress enable row level security;
alter table public.hq_chat_messages enable row level security;
alter table public.hq_missions enable row level security;

drop policy if exists "profiles own row" on public.hq_profiles;
create policy "profiles own row" on public.hq_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "progress own rows" on public.hq_progress;
create policy "progress own rows" on public.hq_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "chat own rows" on public.hq_chat_messages;
create policy "chat own rows" on public.hq_chat_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "missions own rows" on public.hq_missions;
create policy "missions own rows" on public.hq_missions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Sinkronisasi satu payload per akun agar profil, program, chat, dan progres
-- tersimpan terpisah untuk setiap pengguna yang masuk.
create table if not exists public.hq_user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.hq_user_data enable row level security;
drop policy if exists "user data own row" on public.hq_user_data;
create policy "user data own row" on public.hq_user_data
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Batasi pendaftaran seluruh proyek menjadi maksimal tiga akun uji coba.
-- Trigger database membuat batas ini tetap berlaku saat ada pendaftaran bersamaan.
create or replace function public.hq_limit_auth_users()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare registered_count integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(874233, 3);
  select count(*) into registered_count from auth.users;
  if registered_count >= 3 then
    raise exception using message = 'HEALTH_QUEST_USER_LIMIT';
  end if;
  return new;
end;
$$;

drop trigger if exists hq_limit_auth_users_before_insert on auth.users;
create trigger hq_limit_auth_users_before_insert
  before insert on auth.users
  for each row execute function public.hq_limit_auth_users();
