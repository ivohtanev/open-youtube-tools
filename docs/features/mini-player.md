# Scroll mini player

## Status

Implemented as the second feature. Automated lifecycle tests pass. The rebuilt extension was reloaded in Brave and its stacking above actual comments/avatars, masthead offset, hover controls and scroll restoration were verified on live YouTube on 2026-10-21. The remaining compatibility cases below are still pending.

## User behavior

Enabled by default. On regular watch pages, scrolling the main player above the visible content area floats its picture 12 CSS pixels from the left and 12px below the measured bottom edge of YouTube's visible masthead. Without a visible masthead, the top offset is 12px. Header resize, visibility changes and scrolling update the video and controls together. Its width is 25% of the viewport, with a fully opaque 16:9 black letterboxed frame. When any part of the main player returns below the masthead, the picture returns immediately. The original player keeps its layout space.

The centered Play/Pause button fades in over 180ms only while hovering the mini player or focusing the button through keyboard navigation, then fades out on leaving. Reduced-motion preferences disable the transition. The three-pixel bottom progress bar remains visible: elapsed progress is red; the remainder is opaque light gray. No visible times, native controls or seeking are added. Native playback events update the controls. Unknown or infinite duration leaves elapsed progress empty.

Use **Toolbar options → Player Playback → Mini player** to enable or disable it. This feature has no toolbar icon or Functions entry. `miniPlayerEnabled` is saved in extension-local storage; only boolean `false` disables it. Disabling restores the original picture without pausing playback.

## Scope and non-goals

The same video remains inside YouTube's player. Fixed-position CSS changes its presentation without creating another video, decoder, audio source or playback session. The main player has no separate picture while floating; time, speed, volume and paused state are retained. Fullscreen and native picture in picture temporarily suppress floating. Home, Shorts and embeds are excluded. Dragging, resizing, seeking, caption relocation and live DVR progress are outside this feature.

## Contracts and dependencies

`MiniPlayerPort` exposes enablement, playback toggling and snapshots containing active/paused/progress state and the shared top offset. `platform/youtube/mini-player.ts` owns discovery, masthead geometry, events and a removable scoped stylesheet. CSSOM updates share the video offset without overwriting native inline styles. In current Chromium, the existing video enters the browser's top layer as a manual non-modal popover, followed by its controls. This bypasses native stacking and clipping contexts without moving the video in the DOM or modifying ancestor styles. Restoration hides the video popover and restores its original attribute. The overlay leaves the top layer when inactive or unmounted. Browsers without the Popover API retain ordinary fixed positioning, which does not guarantee stacking over native site content.

`features/mini-player/index.ts` renders controls through the port. The entry point creates a separate body-anchored shadow UI so toolbar docking/fullscreen hosting cannot move the mini overlay. The toolbar supplies the setting; the entry point owns persistence.

## Lifecycle and failure behavior

Scroll and resize work is coalesced with animation frames. Resize and DOM observers follow layout and replacement. Navigation start restores the original presentation; navigation finish and history changes resolve the current video. Replacement releases old listeners. Disposal cancels pending work, releases observers/listeners/subscriptions, removes floating attributes and deletes the stylesheet. Playback rejection is caught without creating a fallback video.

## Tests and manual acceptance

DOM tests cover visibility boundaries, original inline styles, one retained video, time/speed continuity, enablement, native playback events, finite/infinite progress, replacement with and without navigation, route exclusion, fullscreen/PiP, setting states, coalescing and active disposal.

The initial Brave fixture used a moving canvas stream and real scrolling with the site's observed stacking/overflow structure. At a 1536px viewport, the floating video measured 384 × 216px at (12, 12); one video remained playing. Play/Pause, scroll restoration, settings navigation and preference restoration through fixture-local storage were exercised. This original fixture predates the masthead offset and hover fixes and does not validate them. Regression tests now cover masthead height/visibility changes, shared video/control offsets, activation behind the header, unchanged native wrapper styles, video-before-controls top-layer ordering and popover cleanup/attribute restoration. Browser verification of corrected stacking is recorded below.

Before marking ready, reload the extension and a YouTube watch tab. Check normal/theater mode, scrolling while playing and paused, portrait videos, progress on a finite clip, disabling/re-enabling, preference restoration, navigation/replacement, fullscreen/PiP and continued speed controls. Record browser version and console errors.

Live verification after the stacking fix: the rebuilt extension was reloaded and tested with comments, avatar images and comment text geometrically overlapping the mini player. The video and overlay both matched `:popover-open`; page content remained behind the picture. Both started at (12, 68) and measured 338 × 190.125px in a 1352px viewport, below the 56px masthead. One video remained, the hover button was visible and Play/Pause worked. Scrolling up closed both top-layer presentations, removed the temporary video popover attribute and continued playback in the original player. The earlier hover check also measured opacity 0 → 1 → 0 with a 0.18s transition. The browser version and remaining compatibility cases were not recorded. The earlier opacity-only verification did not establish correct stacking over comments and is superseded by this targeted overlap check.

## Known limitations

YouTube selectors and navigation events are undocumented. Correct stacking requires the Popover API in the target Chromium browser. Ads sharing the main video follow the same behavior. Infinite-duration streams have no finite progress indication. A fixed 25% width leaves limited room for controls on very narrow windows.
