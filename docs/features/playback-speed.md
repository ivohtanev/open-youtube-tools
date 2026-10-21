# Playback speed

## Status

Implemented as the first example feature. Automated DOM behavior is covered; live YouTube compatibility must be checked using the manual matrix.

## User behavior

The bottom toolbar provides decrease (−), current rate/reset and increase (+) buttons. Each step changes the current rate by 0.25, clamped to 0.25–2. Clicking the rate resets to 1×. Boundary buttons are disabled. Changes made through YouTube's own controls update the displayed rate. Keyboard users can Tab to the controls and activate them with Enter or Space; a status region announces the rate.

## Scope and non-goals

Only regular desktop `/watch` pages with the main video are supported. This feature does not persist preferences, force a speed on new videos, provide shortcuts, skip ads or control player layout. A rate set by another tool outside our range can still be displayed; our increment/decrement actions clamp it into the supported range.

## Contracts and dependencies

`playbackSpeed` implements `Tool` and uses only `PlayerPort.snapshot`, `setPlaybackRate` and `subscribe`. It has no YouTube selectors or extension storage calls. The entry point registers it and the toolbar controls its placement.

## Lifecycle and failure behavior

Mount creates the controls and subscribes immediately. Without a video, controls are disabled and the parent toolbar is hidden. The adapter rebinds on video replacement and emits the new video's current rate. Unsupported selector/layout combinations therefore fail closed without changing unrelated videos. Cleanup unsubscribes, clears button handlers and removes the feature's DOM.

## Tests and manual acceptance

Automated tests cover increments, both boundaries, reset, native rate changes, replacement, navigation away/return and cleanup. On a real watch page, verify that the video actually plays at the chosen speed, YouTube's native speed menu stays in sync, and Tab/Enter/Space work. Navigate between videos without a reload and verify that only one toolbar remains.

## Known limitations

No persistence or fullscreen toolbar support. Ad videos may share the main video element and receive the same user-requested adjustment. Live streams and YouTube experiments may restrict playback rates or change selectors. No claim is made that every October 2026 layout has been verified.
