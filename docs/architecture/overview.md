# Architecture and scope

## Implemented foundation

Open YouTube Tools is a Manifest V3 content-script extension for desktop Chromium browsers. The first vertical slice is a bottom-docked toolbar with playback speed controls on regular YouTube watch pages. All code runs locally; there is no backend, telemetry, remote code, account integration, background worker, or storage permission.

```text
src/
  entrypoints/                # WXT entry points; dependency composition and lifetime
  core/contracts.ts           # Small shared PlayerPort and Tool contracts
  platform/youtube/           # Site selectors, route detection, video lifecycle
  features/playback-speed/    # Feature UI and behavior with colocated tests
  toolbar/                    # Tool composition, shared presentation and visibility
docs/
  architecture/decisions/     # Architecture and decision history
  features/                  # Behavior specifications
  guides/                    # Repeatable development procedures
```

## Dependency rules

The entry point composes the YouTube adapter, toolbar and feature registry. Features and toolbar depend on core contracts. The adapter implements those contracts. Core must not import platform, toolbar or features. Features must not import each other or query YouTube DOM. Tests may assemble multiple layers to verify integration.

This replaces the proposed general `shared/controllers`, `models` and `api` buckets with explicit boundaries. There is one typed port instead of several overlapping abstractions. A UI framework, global store, event bus and dependency-injection library are not needed for this slice. Native DOM components keep the runtime small; introduce additional abstractions only when a concrete second use case demonstrates the need.

## Runtime and cleanup

1. WXT injects the content script on `https://www.youtube.com/*`, including the homepage so later client-side navigation can work.
2. The adapter finds `#movie_player video.html5-main-video` only on `/watch`. No matching element means unavailable, not an error.
3. A document mutation observer checks for video replacement; YouTube navigation events and `popstate` refresh route state. Discovery is centralized and performs one scoped selector query per mutation batch.
4. The toolbar mounts in a Shadow DOM to isolate styles. Features subscribe to player snapshots; native `ratechange` events keep controls synchronized with YouTube.
5. Unavailable players hide the toolbar. No speed is automatically reapplied after navigation or video replacement.
6. WXT invalidation disposes the adapter; the UI removal callback unsubscribes and removes controls. Future tools must return cleanup functions too.

The port exposes capability, not the video element. Calls resolve the current video before changing speed. This prevents controls from retaining a stale video reference. The port's initial speed range is 0.25–2; expand it only with a documented capability decision.

## Scope and limitations

Implemented: bottom docking, accessible native buttons, speed adjustment/reset, route visibility, video replacement, isolated styles and disposal. The toolbar uses a labeled section, avoiding ARIA toolbar keyboard semantics that are not implemented.

Not implemented: player docking, drag positioning, persistent settings, keyboard shortcuts, popup, custom speed presets, localization, Shorts/embed/mobile support, Firefox packaging or player layout controls. Fullscreen may hide the bottom toolbar because it is outside the fullscreen element. Theater mode does not change docking. Advertisements are not distinguished from content when they use the same video element.

YouTube selectors and its navigation event are undocumented integration points. Synthetic DOM tests establish our behavior, not live YouTube compatibility. Verify the manual matrix before claiming support for a layout variant.

## Planned evolution

1. Validate the initial slice on live YouTube and record browser/version/date evidence.
2. Add a docking controller with explicit viewport/player targets, fullscreen handling and a single owner for positioning. Features must not position the toolbar themselves.
3. Add a player-mode controller only when shrink/expand/theater features exist. Model transitions explicitly and arbitrate conflicting requests there.
4. Introduce a storage adapter and versioned settings contract when persistence is required. Choose permissions then.
5. Reassess a UI framework if complex panels and shared reactive UI justify it; keep the PlayerPort and feature boundaries stable.

These steps are proposals, not implemented APIs. Do not add empty controller directories or speculative state machinery for them.
