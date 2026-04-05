create table if not exists public.progress_event_log (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null,
  event_type text not null,
  occurred_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, event_id)
);

create index if not exists progress_event_log_user_occurred_idx
  on public.progress_event_log (user_id, occurred_at desc);

alter table public.progress_event_log enable row level security;

drop policy if exists "progress_event_log_select_own" on public.progress_event_log;
create policy "progress_event_log_select_own"
  on public.progress_event_log for select
  using ((select auth.uid()) = user_id);
