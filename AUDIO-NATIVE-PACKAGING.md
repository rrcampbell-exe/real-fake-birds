# Audio Native Packaging Prep

This branch keeps the existing web audio behavior, but restructures the sound stack so future native builds can swap in a platform-specific implementation without changing gameplay components.

## Current Boundary

The app now depends on a `SoundController` interface defined in `src/lib/sound/types.ts`.

The active implementation is resolved through `getSoundController()` in `src/lib/sound/sound-platform.ts`.

Today, the default controller is `SoundManager`, which remains the browser Web Audio implementation.

## Controller Responsibilities

Any platform controller should provide the same surface area:

- `unlock()`
- `preloadAll()`
- `play()`
- `startLoop()`
- `stopLoop()`
- `startThemeSong()`
- `stopThemeSong()`
- `getSettings()`
- `setSfxMuted()`
- `setSfxVolume()`
- `setMusicMuted()`
- `setMusicVolume()`

Gameplay code should continue to access audio through `useSound()`, not through platform-specific classes.

## Platform Notes

### Web

- Uses Web Audio through `SoundManager`.
- Requires a user gesture to reliably unlock playback on mobile browsers.
- iPhone Safari and Chrome respect Silent Mode for the current web build.

### iOS Native

- Should use a native audio session instead of browser Web Audio.
- Needs an explicit decision on whether game audio should play while the hardware silent switch is enabled.
- Must handle interruptions such as phone calls, Siri, alarms, and route changes.
- Should define behavior for speaker, headphones, Bluetooth, and background or foreground transitions.

### Android Native

- Should integrate with Android audio focus instead of assuming uninterrupted playback.
- Must handle transient loss of focus, ducking, and noisy audio route changes.
- Should restore theme music and loops predictably after lifecycle transitions.

## Recommended Migration Path

1. Keep `useSound()` as the only public app entry point for sound.
2. Introduce a native `SoundController` implementation when packaging work begins.
3. Select the concrete controller inside `sound-platform.ts` based on the runtime environment.
4. Keep settings and sound keys shared across implementations so screens and components do not change.
5. Add platform-specific lifecycle hooks for interruption handling, audio focus, and route changes.
6. Add parity tests that assert the native controller matches the behavior expected by `useSound()`.

## Implementation Guardrails

- Do not import `SoundManager` directly outside the sound platform layer.
- Do not move gameplay components to platform-specific audio APIs.
- Treat silent-mode behavior as a product requirement, not an incidental implementation detail.
- Keep sound asset mapping centralized so web and native implementations share the same semantic keys.