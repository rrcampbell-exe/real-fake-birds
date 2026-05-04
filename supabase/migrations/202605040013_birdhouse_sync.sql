create table if not exists birdhouse (
  user_id uuid primary key references auth.users(id) on delete cascade,
  real_birds text[] not null default '{}',
  fake_birds text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table birdhouse enable row level security;

-- Users can only read/write their own birdhouse
create policy "birdhouse_owner_all" on birdhouse
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Profiles with public privacy_mode are readable by anyone
create policy "birdhouse_public_read" on birdhouse
  for select
  using (
    exists (
      select 1 from profiles p
      where p.user_id = birdhouse.user_id
        and (p.privacy_mode is null or p.privacy_mode = 'public')
    )
  );
