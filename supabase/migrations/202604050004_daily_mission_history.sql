create table if not exists public.daily_mission_history (
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_date date not null,
  completed_at timestamptz not null default timezone('utc', now()),
  primary key (user_id, mission_date)
);

alter table public.daily_mission_history enable row level security;

create policy "Users can read their mission history"
  on public.daily_mission_history
  for select
  using (auth.uid() = user_id);

create policy "Users can write their mission history"
  on public.daily_mission_history
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);