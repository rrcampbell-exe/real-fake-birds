create table if not exists public.birdhouse (
  user_id uuid primary key references auth.users(id) on delete cascade,
  real_birds text[] not null default '{}',
  fake_birds text[] not null default '{}',
  updated_at timestamptz not null default timezone('utc', now()),
  constraint birdhouse_real_birds_cap check (array_length(real_birds, 1) is null or array_length(real_birds, 1) <= 10),
  constraint birdhouse_fake_birds_cap check (array_length(fake_birds, 1) is null or array_length(fake_birds, 1) <= 10)
);

alter table public.birdhouse enable row level security;

create policy "Users can read their own birdhouse"
  on public.birdhouse
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own birdhouse"
  on public.birdhouse
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own birdhouse"
  on public.birdhouse
  for update
  using (auth.uid() = user_id);