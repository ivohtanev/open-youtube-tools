# Scroll mini player

## Status

Implemented as the second feature. Automated lifecycle tests and a Brave rendering fixture pass; validation of the packaged extension on live YouTube remains pending.

## User behavior

Enabled by default. On regular watch pages, scrolling the entire main player above the viewport floats its picture 12 CSS pixels from the top-left corner. Its width is 25% of the viewport, with a 16:9 black letterboxed frame. When any part of the main player returns, the picture returns immediately. The original player keeps its layout space.

Only a centered Play/Pause button and a three-pixel bottom progress bar appear. Elapsed progress is red; the remainder is translucent white. No visible times, native controls or seeking are added. Native playback events update the controls. Unknown or infinite duration leaves elapsed progress empty.

Use **Toolbar options → Player Playback → Mini player** to enable or disable it. This feature has no toolbar icon or Functions entry. `miniPlayerEnabled` is saved in extension-local storage; only boolean `false` disables it. Disabling restores the original picture without pausing playback.

## Scope and non-goals

The same video remains inside YouTube's player. Fixed-position CSS changes its presentation without creating another video, decoder, audio source or playback session. The main player has no separate picture while floating; time, speed, volume and paused state are retained. Fullscreen and native picture in picture temporarily suppress floating. Home, Shorts and embeds are excluded. Dragging, resizing, seeking, caption relocation and live DVR progress are outside this feature.

## Contracts and dependencies

`MiniPlayerPort` exposes enablement, playback toggling and snapshots containing active/paused/progress state. `platform/youtube/mini-player.ts` owns discovery, geometry, events and a removable scoped stylesheet. Attribute selectors override native inline video geometry without overwriting it. The active player's stacking order rises above the masthead.

`features/mini-player/index.ts` renders controls through the port. The entry point creates a separate body-anchored shadow UI so toolbar docking/fullscreen hosting cannot move the mini overlay. The toolbar supplies the setting; the entry point owns persistence.

## Lifecycle and failure behavior

Scroll and resize work is coalesced with animation frames. Resize and DOM observers follow layout and replacement. Navigation start restores the original presentation; navigation finish and history changes resolve the current video. Replacement releases old listeners. Disposal cancels pending work, releases observers/listeners/subscriptions, removes floating attributes and deletes the stylesheet. Playback rejection is caught without creating a fallback video.

## Tests and manual acceptance

DOM tests cover visibility boundaries, original inline styles, one retained video, time/speed continuity, enablement, native playback events, finite/infinite progress, replacement with and without navigation, route exclusion, fullscreen/PiP, setting states, coalescing and active disposal.

A Brave fixture uses a moving canvas stream and real scrolling with the site's observed stacking/overflow structure. At a 1536px viewport, the floating video measured 384 × 216px at (12, 12), above a fixed masthead; one video remained playing. Play/Pause, scroll restoration, settings navigation and preference restoration through fixture-local storage were exercised. This fixture does not load the packaged extension or prove extension-storage behavior on live YouTube.

Before marking ready, reload the extension and a YouTube watch tab. Check normal/theater mode, scrolling while playing and paused, portrait videos, progress on a finite clip, disabling/re-enabling, preference restoration, navigation/replacement, fullscreen/PiP and continued speed controls. Record browser version and console errors.

## Known limitations

YouTube selectors, stacking and navigation events are undocumented. Layout variants with transformed/clipping ancestors may require adapter changes. Ads sharing the main video follow the same behavior. Infinite-duration streams have no finite progress indication. A fixed 25% width leaves limited room for controls on very narrow windows.
