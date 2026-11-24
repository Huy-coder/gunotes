-- GuNotes Supabase Schema (Phase 2 Production — Idempotent)
-- Copy & Run this once in: https://supabase.com/dashboard/project/ifoxqhdmqnxwhdwiqxbh/sql/new

create extension if not exists "pgcrypto";

-- 1. User Profiles & Preferences
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null default '',
  display_name text not null default 'Bạn học mới',
  active_theme text not null default 'minimal-paper',
  default_paper text not null default 'dot',
  note_font text not null default 'sans',
  study_persona text not null default 'flow',
  streak_days integer not null default 0,
  weekly_focus_minutes integer not null default 0,
  today_focus_minutes integer not null default 0,
  unlocked_stickers jsonb not null default '["coffee","sparkle"]'::jsonb,
  focus_tasks jsonb not null default '[]'::jsonb,
  onboarded boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text not null default '';
alter table public.profiles add column if not exists today_focus_minutes integer not null default 0;
alter table public.profiles add column if not exists focus_tasks jsonb not null default '[]'::jsonb;

-- 2. Study Binders (Sổ bìa còng)
create table if not exists public.binders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  subtitle text not null default '',
  subject_tag text not null default '#hoc-tap',
  cover_tone text not null default 'blue',
  cover_pattern text not null default 'dot',
  stickers jsonb not null default '[]'::jsonb,
  mastery_percent integer not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- 3. Loose-leaf Notes (Supports Cornell/7 Templates, KaTeX, Parallel canvasGraph & Visualize block_links)
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  binder_id uuid not null references public.binders(id) on delete cascade,
  title text not null,
  template text not null default 'cornell',
  paper_style text not null default 'dot',
  tags text[] not null default '{}',
  blocks jsonb not null default '[]'::jsonb,
  block_links jsonb not null default '[]'::jsonb,
  summary text not null default '',
  header_sticker_id text,
  is_pinned boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.notes add column if not exists block_links jsonb not null default '[]'::jsonb;
alter table public.notes add column if not exists ink_strokes jsonb not null default '[]'::jsonb;
alter table public.notes add column if not exists is_public boolean not null default false;

-- 4. Active Recall Flashcards (SRS)
create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  binder_id uuid not null references public.binders(id) on delete cascade,
  note_id uuid not null references public.notes(id) on delete cascade,
  note_title text not null default '',
  block_type text not null default 'def',
  front text not null,
  back text not null,
  tip text,
  due_label text not null default 'Đến hạn hôm nay',
  is_due boolean not null default true,
  due_at timestamptz not null default now(),
  interval_days integer not null default 1,
  reps integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.flashcards add column if not exists note_title text not null default '';
alter table public.flashcards add column if not exists due_label text not null default 'Đến hạn hôm nay';
alter table public.flashcards add column if not exists is_due boolean not null default true;
alter table public.flashcards add column if not exists ease_factor real not null default 2.5;
alter table public.flashcards add column if not exists created_at timestamptz not null default now();

-- 5. Focus / Pomodoro Study Sessions
create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  binder_id uuid references public.binders(id) on delete set null,
  duration_minutes integer not null,
  mode text not null default 'focus',
  created_at timestamptz not null default now()
);

-- Indexes for fast per-user queries
create index if not exists idx_binders_user_order on public.binders(user_id, sort_order);
create index if not exists idx_notes_user_binder on public.notes(user_id, binder_id);
create index if not exists idx_flashcards_user_due on public.flashcards(user_id, is_due);
create index if not exists idx_sessions_user on public.study_sessions(user_id, created_at desc);

-- Row-Level Security
alter table public.profiles enable row level security;
alter table public.binders enable row level security;
alter table public.notes enable row level security;
alter table public.flashcards enable row level security;
alter table public.study_sessions enable row level security;

drop policy if exists "Users manage own profile" on public.profiles;
create policy "Users manage own profile" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Users manage own binders" on public.binders;
create policy "Users manage own binders" on public.binders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own notes" on public.notes;
create policy "Users manage own notes" on public.notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Public can read shared notes" on public.notes;
create policy "Public can read shared notes" on public.notes
  for select using (is_public = true);

drop policy if exists "Users manage own flashcards" on public.flashcards;
create policy "Users manage own flashcards" on public.flashcards
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users manage own sessions" on public.study_sessions;
create policy "Users manage own sessions" on public.study_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Auto-create profile row when a user signs up via Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Bạn học mới'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
