-- Add house account flag to profiles table.
-- House accounts are transparent bot profiles used to keep the weekly
-- leaderboard populated with social proof. They display a visible badge
-- in the leaderboard UI and are excluded from PostHog analytics.

alter table public.profiles
  add column if not exists is_house_account boolean not null default false;
