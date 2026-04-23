# App Store Launch Plan

## Suggested GitHub Issue Title

Launch plan for Apple App Store and Google Play release

## Summary

Real Fake Birds is close to being marketable as a mobile launch, but the next few weeks should prioritize packaging, QA, compliance, metadata, and operational readiness over new features. The product hook and retention loops are already strong enough. The main risk is not concept quality. It is shipping discipline.

This plan assumes a solo developer needs the shortest path from a working browser-first game to stable App Store and Google Play submissions.

## Launch Goals

- Ship working iPhone and Android builds in the next few weeks
- Preserve the current fast first-session experience
- Keep auth optional so the core loop remains resilient at launch
- Pass store submission and privacy requirements cleanly
- Launch with enough observability to catch onboarding and stability problems quickly

## Launch Principles

- Package first, polish second
- Optimize for stable first-session play rather than feature breadth
- Treat native audio, privacy disclosures, and QA as launch-critical, not cleanup work
- Avoid expanding scope with monetization, notifications, or deep native features before launch

## Release Shape

Launch a thin native wrapper around the existing game, keep the game local-first, and let optional auth stay optional. Use closed beta or TestFlight and Google closed testing to find device-specific issues before public release. Release the two stores inside a narrow window if approvals line up, but do not force a simultaneous launch if one platform needs extra review time.

## Readiness Checklist

### Product

- Guest play works cleanly without account creation
- First answer happens within one minute on a fresh install
- Daily challenge reset is correct across time changes
- Missions, streaks, journal, birdhouse, leaderboard, and sharing behave correctly on real phones
- Network failures degrade gracefully and do not strand players

### Store Compliance

- Bundle identifiers, app names, app icon set, splash assets, screenshots, and metadata are finalized
- Privacy policy and terms are published and match the shipped build
- Apple privacy nutrition and Google data safety answers are completed from actual code behavior
- Account deletion remains accessible if account creation ships in v1

### Analytics

- Core launch funnel events are defined and visible before public launch
- Consent behavior is correct for native builds and supported regions
- Install-to-first-round, daily challenge starts, share events, and sign-in behavior can be monitored

### QA

- Physical-device pass covers cold start, resume, backgrounding, audio interruptions, silent mode, low network, offline-adjacent behavior, keyboard overlays, safe areas, account flows, and sharing
- Closed beta captures crash reports and qualitative friction feedback

### Operations

- App Store Connect and Google Play Console drafts are created
- Beta distribution flow is working
- Support inbox and hotfix workflow are defined before public release

## Phase Plan

### Phase 1: Packaging And Scope Freeze

- Choose the thinnest native packaging path and get both platforms running on real devices
- Freeze launch scope and explicitly defer non-essential ideas
- Decide v1 audio behavior and any platform differences that need to be documented or suppressed

### Phase 2: Stabilization And Compliance

- Fix mobile-shell bugs, safe-area issues, and audio edge cases
- Complete privacy and data-safety disclosures using the actual shipped feature set
- Confirm analytics and consent behavior in mobile builds

### Phase 3: Closed Beta And Asset Production

- Run TestFlight and Google closed testing with a focused cohort
- Use the release candidate build for screenshots and final metadata capture
- Triage feedback ruthlessly and keep only launch-blocking fixes in scope

### Phase 4: Submission And Release Prep

- Submit Apple first if timing forces a sequence
- Submit Google with release controls ready
- Prepare launch-day support, review monitoring, and hotfix workflow

### Phase 5: Launch Week And First 30 Days

- Monitor first-session completion, ratings, crashes, and daily challenge engagement closely
- Ship one small stability update if needed
- Make only data-backed adjustments to screenshots, copy, and review timing

## Risk Register

### Native Packaging Slips

- Risk: no actual store artifact exists yet, which can collapse the whole schedule
- Mitigation: make packaging the first priority and avoid parallel feature work until it is running on devices

### Google Play Eligibility Or Testing Delays

- Risk: release requirements or account state can delay Android launch unexpectedly
- Mitigation: verify console readiness and testing requirements immediately, not at submission time

### Mobile Audio Behavior Is Unclear

- Risk: silent mode, interruptions, route changes, or resume behavior cause low-quality first impressions
- Mitigation: define conservative v1 audio behavior and test on physical devices early

### Auth Abuse Or Enumeration Issues

- Risk: abusive traffic or weak auth hardening creates support and reliability problems during launch
- Mitigation: add throttling to auth-sensitive routes and keep auth optional for the public v1 loop

### Privacy Or Data-Safety Answers Drift From Reality

- Risk: submission friction or rejection if disclosures do not match the build
- Mitigation: freeze shipped SDK and feature scope before filing store questionnaires

### Store Asset Production Happens Too Late

- Risk: screenshots and metadata become the hidden blocker after the build is ready
- Mitigation: draft metadata early and capture assets from a release candidate, not after approval

## Suggested Timeline

### Week 1

- Get iOS and Android wrapper builds running on physical devices
- Freeze launch scope
- Verify store-console readiness and beta path

### Week 2

- Stabilize mobile-specific behavior
- Finalize audio behavior, compliance answers, and analytics checks
- Begin internal QA pass on real devices

### Week 3

- Run closed beta
- Triage bugs and fix only launch-critical issues
- Produce screenshots, metadata, and release notes from the release candidate build

### Week 4

- Submit to Apple and Google
- Prepare launch messaging and support workflow
- Release inside a narrow window if approvals allow

## Sequencing Constraints

1. Packaging must happen before final QA, screenshots, and metadata capture.
2. Launch scope must be frozen before privacy and data-safety answers are finalized.
3. Real-device QA must happen after packaging, not as a browser-only proxy.
4. Store screenshots should come from a release candidate build.
5. Marketing launch timing should follow submission readiness, not the other way around.

## Child Issue Backlog

### 1. Create Thin Native iOS And Android Wrapper

- Why it matters: there is no app-store launch without installable binaries
- Owner: solo dev
- Effort: L
- Acceptance criteria:
- iPhone and Android builds install and launch on physical devices
- Core game loop is playable end to end in both shells

### 2. Freeze v1 Mobile Launch Scope

- Why it matters: prevents schedule drift and protects the submission window
- Owner: solo dev
- Effort: S
- Acceptance criteria:
- Launch scope is written down
- Non-launch work is explicitly deferred to post-launch

### 3. Define And Implement v1 Mobile Audio Behavior

- Why it matters: audio is the most obvious platform-specific product gap today
- Owner: solo dev
- Effort: M
- Acceptance criteria:
- Silent mode, interruption, resume, and route-change behavior are defined
- Behavior is tested on at least one iPhone and one Android device

### 4. Add Throttling To Auth-Sensitive Routes

- Why it matters: reduces abuse risk during beta and launch
- Owner: solo dev
- Effort: M
- Acceptance criteria:
- Rate limiting or equivalent protections cover sign-up and other auth-sensitive flows
- Abuse behavior is logged or observable during testing

### 5. Verify Native Consent And Analytics Flow

- Why it matters: launch decisions depend on trustworthy funnel data and compliant event behavior
- Owner: solo dev
- Effort: M
- Acceptance criteria:
- Consent and analytics behavior are verified in mobile builds
- Core launch events appear in the launch dashboard

### 6. Build Final Store Metadata Pack

- Why it matters: submission and conversion depend on ready metadata
- Owner: solo dev
- Effort: M
- Acceptance criteria:
- Titles, subtitles, keywords, short description, long description, support URL, and privacy links are prepared for both stores

### 7. Produce Store Screenshots From Release Candidate Build

- Why it matters: prevents rework and ensures the listing matches the shipped experience
- Owner: solo dev
- Effort: M
- Acceptance criteria:
- Apple and Google screenshot sets are captured from a release candidate build
- Assets are uploaded or ready to upload without further editing

### 8. Complete Apple Privacy And Google Data Safety Answers

- Why it matters: store questionnaires can block submission
- Owner: solo dev
- Effort: S
- Acceptance criteria:
- Both stores' disclosure forms are completed and checked against current app behavior

### 9. Run Structured Closed Beta On Real Devices

- Why it matters: browser confidence is not enough for a wrapped mobile launch
- Owner: solo dev
- Effort: M
- Acceptance criteria:
- TestFlight and Google closed testing are active
- At least twenty testers complete the core experience and feedback is collected centrally

### 10. Execute Mobile Launch Regression Pass

- Why it matters: launch bugs are most likely to appear in shell-specific behavior and platform edges
- Owner: solo dev
- Effort: M
- Acceptance criteria:
- A written regression checklist is completed on physical devices
- Blocking issues are triaged before submission

### 11. Implement Rating Prompt After Positive Milestone

- Why it matters: early ratings influence store conversion during the most important period
- Owner: solo dev
- Effort: S
- Acceptance criteria:
- Prompt fires only after a positive milestone and never during early or unstable sessions

### 12. Prepare Launch-Day Support And Hotfix Workflow

- Why it matters: solo launches fail when support and fixes are improvised under pressure
- Owner: solo dev
- Effort: S
- Acceptance criteria:
- Support inbox, issue labels, release notes template, and hotfix path are all ready before public release

## Definition Of Done

- iOS and Android builds are submit-ready
- Store disclosures and assets match the shipped feature set
- Closed beta has exercised the launch-critical flows on physical devices
- Launch-day support and launch-week monitoring are ready before public release