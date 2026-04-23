-- The handle_new_user trigger was inserting a stub profiles row (with no username)
-- on every new auth user. This caused ensureAccountProfileFromUserMetadata to find
-- the stub and return early, never setting the username from user_metadata.
-- Profiles are always created explicitly with a username during account registration,
-- so the stub insert is unnecessary and harmful.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.player_progress (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.leaderboard_stats (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;
