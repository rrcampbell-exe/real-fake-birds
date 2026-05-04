-- Add fake bird avatar key to profiles.
-- Stores the birdKey of a fake bird the player has chosen as their avatar.
-- Nullable: a null value means "use palette avatar" (the default).
-- The key is intentionally NOT a foreign key so the avatar persists even
-- if the bird is later removed from the player's birdhouse.

alter table profiles
  add column if not exists avatar_fake_bird_key text default null;
