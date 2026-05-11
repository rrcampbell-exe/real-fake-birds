alter table public.follows
  drop constraint if exists follows_block_requires_approved;

alter table public.follows
  add constraint follows_block_requires_approved
  check (relationship_type <> 'block' or status = 'approved');

create or replace function public.cleanup_conflicting_social_state_on_block()
returns trigger
language plpgsql
as $$
begin
  if new.relationship_type = 'block' then
    new.status := 'approved';

    delete from public.follows
    where relationship_type = 'follow'
      and (
        (user_id = new.user_id and related_user_id = new.related_user_id)
        or (user_id = new.related_user_id and related_user_id = new.user_id)
      );
  end if;

  return new;
end;
$$;

drop trigger if exists follows_cleanup_conflicting_social_state on public.follows;
create trigger follows_cleanup_conflicting_social_state
  before insert or update on public.follows
  for each row
  execute function public.cleanup_conflicting_social_state_on_block();

create table if not exists public.profile_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  reported_user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null
    constraint profile_reports_reason_values check (
      reason in (
        'harassment',
        'spam',
        'impersonation',
        'inappropriate_profile',
        'other'
      )
    ),
  note text,
  status text not null default 'pending'
    constraint profile_reports_status_values check (
      status in ('pending', 'reviewed', 'resolved', 'dismissed')
    ),
  created_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz,
  constraint profile_reports_no_self_report check (reporter_user_id <> reported_user_id),
  constraint profile_reports_note_length check (note is null or char_length(note) <= 500)
);

create index if not exists profile_reports_reported_user_id_idx
  on public.profile_reports (reported_user_id, status, created_at desc);

create index if not exists profile_reports_reporter_user_id_idx
  on public.profile_reports (reporter_user_id, created_at desc);

alter table public.profile_reports enable row level security;

drop policy if exists "profile_reports_insert_own" on public.profile_reports;
create policy "profile_reports_insert_own"
  on public.profile_reports for insert
  with check (auth.uid() = reporter_user_id);

drop policy if exists "profile_reports_select_own" on public.profile_reports;
create policy "profile_reports_select_own"
  on public.profile_reports for select
  using (auth.uid() = reporter_user_id);

notify pgrst, 'reload schema';
