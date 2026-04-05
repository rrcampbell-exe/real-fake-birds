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
- Score, seeds, streaks, earned badges, unlocked themes, unseen rewards, sound settings, and theme selection are stored in localStorage
- Rewards and settings live in dedicated routes instead of the old menu page

## Features

- Responsive play experience with separate desktop and mobile navigation
- Ten live visual themes with milestone and seed-based unlocks, plus additional themes marked coming soon
- Streak tracking, seed rewards, milestone badges, and a trophy case tied to birds identified
- Split sound controls for effects and music, including per-theme background music for live themes
- Animated gameplay card transitions and celebration effects
- Local persistence for progress and preferences
- Unit and component coverage for core gameplay and server-side helpers

## Testing

Vitest is configured for local unit and component testing with coverage reporting.

- Coverage output is written to `coverage/`
- Coverage thresholds are enforced in `vitest.config.ts`
- The GitHub Actions workflow runs lint, production build, and coverage on pushes and pull requests

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

Supabase is now the planned backing store for account auth and progression migration.

- Create the schema by applying the SQL files in `supabase/migrations/`
- Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to your environment
- Enable email/password auth in Supabase Auth
- If you are moving away from third-party login, disable unused OAuth providers such as Google in the Supabase dashboard
- Keep preview and production projects separate so auth redirects and RLS checks stay environment-specific

## Credits

### Developed By

- [Ryan R. Campbell](https://www.github.com/rrcampbell-exe/)

### APIs Used

- [eBird API 2.0](https://documenter.getpostman.com/view/664302/S1ENwy59)
- [The Color API](https://www.thecolorapi.com)
- [Random User](https://www.randomuser.me)
- Geographic data embedded in the repository and used for fake-name generation

### Visual Assets

- [Bird SVGs via SVG Repo](https://www.svgrepo.com/)

### Audio

- Theme music created in collaboration with ElevenLabs
- Theme music planning notes live in `THEME-MUSIC.md`

## License

© 2023 - 2026 Ryan R. Campbell. All rights reserved.

## Questions, Comments, Suggestions

Please email [Ryan R. Campbell](mailto:campbell.ryan.r@gmail.com) with questions, bug reports, or feature suggestions. You can also [contact Ryan R. Campbell on GitHub](https://www.github.com/rrcampbell-exe/).