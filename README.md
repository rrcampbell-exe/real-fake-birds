# Real Fake Birds

Some are real. Some are fake. Tell them apart.

Real Fake Birds is a browser game where players decide whether a bird name is real or procedurally generated. Real names come from recent eBird observations. Fake names are assembled from surnames, adjectives, colors, locations, body-part modifiers, and bird types.

## Current Stack

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Framer Motion
- Vitest with Testing Library
- GitHub Actions for lint, build, and coverage
- Vercel-friendly serverless API routes

## How It Works

The app presents a bird name and asks the player to guess whether it is real or fake.

- Real birds are fetched from the eBird API through the server route at `src/app/api/bird/route.ts`
- Fake birds are generated in `src/lib/server/name-generator.ts`
- Score, seeds, streaks, earned badges, unlocked themes, unseen rewards, sound settings, and theme selection are stored locally and can sync to an account when signed in
- Rewards, settings, journal, birdhouse, leaderboard, and account flows live on dedicated routes

## Current Gameplay Loop

Each round asks the player to classify a bird name as real or fake, then turns the result into progression and collection state.

- Correct answers award seeds and contribute to streaks, badges, missions, and challenges
- During a round, players can buy a `Field Note` hint for 10 seeds or a `Photo` hint for 40 seeds
- Real birds can show image and fact content immediately after the round when media exists
- Fake bird images stay hidden until the player unlocks them, either with the in-round photo hint or a post-round reveal
- Revealed fake birds can be added to the Birdhouse; unrevealed fake birds keep the Birdhouse control locked with an inline explanation
- The journal records encounters, accuracy, summaries, image unlocks, and revisit state for both real and fake birds

## Current Bird Content Flow

The app currently uses a hybrid content pipeline for both real and fake birds.

### Real Birds

1. The client requests `/api/bird` unless the current round is already cached in localStorage.
2. The server calls eBird recent observations for a randomly selected location and chooses one bird from that response.
3. The server slugifies that bird name and checks a generated CDN manifest to see whether curated CDN assets already exist for it.
4. The server also fetches Wikipedia summary and image data so it has fallback content available.
5. If the bird exists in the CDN manifest, the API returns CDN image URLs and CDN `fact.json` metadata as the primary content, while keeping Wikipedia image/summary data available as fallback fields.
6. If the bird does not exist in the CDN manifest, the API returns Wikipedia-derived image and fact data only.
7. The client preloads the primary image before reveal and tracks fact and image load analytics.

### Fake Birds

1. The server can source fake birds from the curated CDN-backed fake bird pipeline.
2. Fake bird names, facts, summaries, and images are seeded offline rather than generated live in the browser.
3. Fake bird images are available to the client, but the UI keeps them hidden until the player has unlocked them.
4. Journal and Birdhouse behavior both respect the same permanent `imageRevealed` metadata.

Important notes:

- The runtime does not upload new real-bird data to R2. R2 is populated offline via `scripts/seed-cdn.ts` and `scripts/backfill-cdn-sciname.ts`.
- Normal real-bird fetches are not rewritten by AI on the fly. OpenAI is currently used for offline seeding, fake-bird content generation, and some hint-generation fallback paths, not for the standard real-bird GET flow.
- Today, real-bird selection still depends on eBird, and Wikipedia still acts as the non-CDN fallback source.

## Features

- Responsive play experience with separate desktop and mobile navigation
- Two-tier hint economy with `Field Note` and `Photo` hints
- Answer-card and journal reveal flows for fake bird images, with permanent unlock persistence
- Birdhouse collection gated by fake-bird image reveal state
- Journal detail cards with encounter stats, saved notes, image unlocks, and collection actions
- Optional account-backed progression sync on top of local-first play
- Ten live visual themes with milestone and seed-based unlocks, plus additional themes marked coming soon
- Streak tracking, seed rewards, milestone badges, and a trophy case tied to birds identified
- Split sound controls for effects and music, including per-theme background music for live themes
- Animated gameplay card transitions and celebration effects
- Local persistence for progress and preferences, with queued sync for signed-in players
- Unit and component coverage for core gameplay and server-side helpers

## Testing

Vitest is configured for local unit and component testing with coverage reporting.

- Coverage output is written to `coverage/`
- Coverage thresholds are enforced in `vitest.config.ts`
- The GitHub Actions workflow runs lint, production build, and coverage on pushes and pull requests

## Boot Screen Inspection

The full-screen app boot loader can be held open during local development for visual review.

- Add `?inspectBoot=1` to the URL for the default `2500ms` delay
- Add `?inspectBoot=5000` to hold it open for a custom delay in milliseconds, up to `10000`
- Or set `localStorage.setItem('rfb:inspectBootDelayMs', '4000')` in DevTools to persist the delay across reloads
- Remove the local storage key with `localStorage.removeItem('rfb:inspectBootDelayMs')` when you are done

This inspection toggle is development-only and does not affect production behavior.

## Project Structure

```text
src/
	app/
		api/bird/route.ts
		page.tsx
		rewards/page.tsx
		settings/page.tsx
	components/
		game/
		nav/
		rewards/
	hooks/
		useGameState.ts
	lib/
		server/
		utils/
```

## Deployment

The app is structured for Next.js serverless deployment. Production runtime behavior is handled by Next.js and the App Router, not by Vite. Vite is only used indirectly for Vitest during local and CI testing.

## Supabase Setup

Supabase powers account auth and progression sync for signed-in players. The game still works locally without an account, but signed-in sessions can merge and flush queued progress to the backend.

- Create the schema by applying the SQL files in `supabase/migrations/`
- Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to your environment
- Enable email/password auth in Supabase Auth
- Configure Supabase Auth URL settings to allow each deployment's `/auth/callback` URL; password reset emails return through this callback to `/auth/reset-password`
- Email password recovery requires a real email address on the Supabase user; username-only accounts created with placeholder addresses cannot receive reset emails
- If you are moving away from third-party login, disable unused OAuth providers such as Google in the Supabase dashboard
- Keep preview and production projects separate so auth redirects and RLS checks stay environment-specific

## Credits

### Developed By

- [Ryan R. Campbell](https://www.github.com/rrcampbell-exe/)

### APIs Used

- [eBird API 2.0](https://documenter.getpostman.com/view/664302/S1ENwy59)
- [Wikipedia REST API](https://en.wikipedia.org/api/rest_v1/)
- [OpenAI Platform](https://platform.openai.com/docs/api-reference)
- [The Color API](https://www.thecolorapi.com)
- [Random User](https://www.randomuser.me)
- Geographic data embedded in the repository and used for fake-name generation

### Audio

- Theme music created in collaboration with ElevenLabs
- Theme music planning notes live in `THEME-MUSIC.md`

## License

© 2023 - 2026 Catbird Games, LLC. All rights reserved.

## Questions, Comments, Suggestions

Please email [Ryan R. Campbell](mailto:campbell.ryan.r@gmail.com) with questions, bug reports, or feature suggestions. You can also [contact Ryan R. Campbell on GitHub](https://www.github.com/rrcampbell-exe/).