# Architecture and scope

## Implemented foundation

Open YouTube Tools is a Manifest V3 extension for desktop Chromium browsers. The toolbar attaches to the video by default, offers viewport-bottom docking and provides modular controls on regular YouTube watch pages. All code runs locally; there is no backend, telemetry, remote code or account integration. Extension-local storage saves toolbar position and disabled functions. A small background worker uses the downloads permission to open Save As for screenshots; it accepts only validated PNG data URLs and safe filenames from YouTube content scripts.

Cinema uses an injected mounting capability (`MountCinema`) to manage a pointer-transparent SVG dimmer with clear windows over the player and toolbar, avoiding changes to YouTube stacking contexts. Screenshot receives an injected capture/save action; the YouTube adapter captures the frame, and the entry point sends it to the download worker. See [the local screenshot download decision](decisions/0002-screenshot-downloads.md).

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

This replaces the proposed general `shared/controllers`, `models` and `api` buckets with explicit boundaries. Narrow typed ports expose concrete player capabilities. A UI framework, global store, event bus and dependency-injection library are not needed for this slice. Native DOM components keep the runtime small; introduce additional abstractions only when a concrete use case demonstrates the need.

## Runtime and cleanup

The experimental [equalizer](../features/equalizer.md) uses `EqualizerPort` in
`core/equalizer.ts`. Its platform adapter owns one Web Audio graph per activated
video element; the feature owns only controls. Invalidation flattens the graph
instead of closing its context, because a media-element source cannot be
detached to restore native output. Hiding the controls preserves processing.
The entry point persists band gains, approach and ON/OFF preference. The adapter
keeps the requested preference separate from active routing and restores saved
ON across videos, retrying on playback or interaction when activation must wait.
Live audio routing remains an explicit acceptance gate.

The [expand player](../features/expand-player.md) adds `ExpandPlayerPort`. Its YouTube adapter applies reversible layout styles and fills the available viewport height below the masthead. Browser object-fit containment maximizes the original picture without cropping. The icon-bearing feature supplies the toggle; it resets the layout when unmounted. While expanded, player-docked toolbar positioning centers below the player and reserves its normal document-flow height without reducing the picture height. Saved bottom docking remains available. Fullscreen/PiP suspend expansion, while the scroll mini player's video sizing remains independent through an explicit selector exclusion.

The [mini player](../features/mini-player.md) adds a narrow `MiniPlayerPort` alongside `PlayerPort`. A YouTube adapter owns scroll geometry and temporary fixed video presentation; the feature owns controls in a separate body-anchored shadow UI. The same video stays in its original DOM parent. The entry point persists the default-enabled setting and the toolbar exposes it under Player Playback without an icon. All feature/platform dependency rules continue to apply.

1. WXT injects the content script on `https://www.youtube.com/*`, including the homepage so later client-side navigation can work.
2. The adapter finds `#movie_player video.html5-main-video` only on `/watch`. No matching element means unavailable, not an error.
3. A document mutation observer checks for video replacement; YouTube navigation events and `popstate` refresh route state. Discovery is centralized and performs one scoped selector query per mutation batch.
4. The toolbar mounts in a Shadow DOM to isolate styles. Features subscribe to player snapshots; native `ratechange` events keep controls synchronized with YouTube.
5. Unavailable players hide the toolbar. No speed is automatically reapplied after navigation or video replacement.
6. WXT invalidation disposes the adapter; the UI removal callback unsubscribes and removes controls. Future tools must return cleanup functions too.

The port exposes capability, not the video element. Calls resolve the current video before changing speed. This prevents controls from retaining a stale video reference. The port's initial speed range is 0.25–2; expand it only with a documented capability decision.

## Scope and limitations

Implemented: player/bottom docking, theater centering, fullscreen hosting and native-control visibility, persistent position, shared Floating UI panels, accessible native buttons, scroll/preset speed adjustment, route visibility, video replacement, isolated styles and disposal. See [toolbar architecture](../features/toolbar.md). The toolbar uses a labeled section, avoiding ARIA toolbar keyboard semantics that are not implemented.

Not implemented: drag positioning, keyboard shortcuts, popup, custom speed presets, localization, Shorts/embed/mobile support or Firefox packaging. Expand/shrink supplies a viewport-fit page layout; its fullscreen, theater and experimental-layout interactions require live validation. Advertisements are not distinguished from content when they use the same video element.

YouTube selectors and its navigation event are undocumented integration points. Synthetic DOM tests establish our behavior, not live YouTube compatibility. Verify the manual matrix before claiming support for a layout variant.

## Planned evolution

1. Validate the initial slice on live YouTube and record browser/version/date evidence.
2. Implemented: injected docking controller owns viewport/player positioning and fullscreen handling. Features do not position the toolbar.
3. Implemented: the mini-player adapter owns scroll-triggered picture presentation and releases it during fullscreen/PiP. Introduce shared arbitration only if future player modes conflict.
4. Implemented: entry point validates and persists toolbar position using extension-local storage. Introduce a versioned settings model if preferences grow.
5. Reassess a UI framework if complex panels and shared reactive UI justify it; keep the PlayerPort and feature boundaries stable.

These steps are proposals, not implemented APIs. Do not add empty controller directories or speculative state machinery for them.
