# Video filters

## Status

Implemented for regular YouTube watch pages. Automated adapter and control tests pass. A headless Chromium fixture measured a 320 × 108px panel at 1280 × 720 and 640 × 360 viewports. At 280 × 320 it uses one column (264 × 172px). Top/bottom placement stayed inside the viewport without horizontal overflow; the arrow remains outside the independently scrolling content. Live YouTube visual acceptance remains pending.

## User behavior

Click **Video filters** beside EQ. The compact panel has two columns of icon-labelled sliders. Mirror, reset and power icons share the header. Hover titles and accessible names identify the controls; values remain visible. There are no instruction or status text rows.

- Brightness: 50–150%; contrast: 50–150%; saturation: 0–200%. All default to 100%.
- Horizontal sliders support native keyboard interaction and mouse-wheel steps of 1%. Ctrl/Meta-wheel keeps browser behavior. Double-click a slider to restore 100%.
- First use starts OFF. Adjusting a slider (including wheel or double-click reset), toggling mirror or using reset automatically turns filters ON and saves that preference. The power button can still turn them OFF. The preference and settings survive reloads, navigation and browser restarts.
- The reset icon restores all values, including zoom and mirror, and turns filters ON.
- The main controls include zoom (100–150%, cropped to the original frame) and horizontal mirror. Mirroring also reverses text baked into the video. Both are saved with the other settings.

Hiding the tool through Functions keeps processing active, matching EQ. Turn it OFF before hiding it if processing should stop.

## Scope and non-goals

Only the existing video picture is styled. Native captions, controls, page layout and audio are unaffected. No sepia, grayscale, hue rotation, sharpening, HDR processing, channel profiles or backend are included. Screenshots continue to export original pixels, without filters, zoom or mirror. Native picture-in-picture appearance is not guaranteed.

## Contracts and dependencies

`core/video-filters.ts` defines validated settings, control limits and `VideoFiltersPort`. The native DOM feature consumes only that port. The YouTube adapter owns video discovery and CSS; the entry point injects persistence callbacks using the existing `storage.local` permission. There are no new dependencies or permissions.

Storage keys are `videoFilterSettings` and `videoFiltersEnabled`. Settings writes are debounced by 200 ms, with pending changes flushed on pagehide and disposal. ON/OFF saves immediately. Invalid saved values fall back to defaults, finite values are clamped, and only fixed CSS functions are generated. Settings are global within the browser profile, restored when a content script starts; existing tabs do not synchronize live, matching EQ's current pattern.

## Lifecycle and failure behavior

The adapter reuses `findVideo` and the existing mutation/navigation observation pattern. It releases the previous video on replacement or departure from `/watch`, then applies current settings when a watch video becomes available. Same-element video changes retain settings.

The adapter owns `filter`, individual CSS `scale` and (for zoom) `clip-path`. Original inline values and priorities are retained. Turning OFF, reset and disposal restore them only while the adapter still owns the applied value; later external changes are preserved. An explicit subsequent adjustment takes ownership again and remembers the latest external value. Neutral settings leave no identity filter or transform override. No frame loop is added.

## Tests and manual acceptance

Automated tests cover malformed settings, bounds, combined filters, bypass, reset, style ownership, replacement, route transitions, debounced persistence, reload restoration, disposal, wheel controls, modifier keys, mirror and panel dismissal.

Manual checks still required:

1. Load the build, enable filters and adjust all four sliders on a watch page; verify horizontal layout, keyboard focus and wheel behavior.
2. Dismiss with Escape/outside click and reopen. Confirm adjustments remain applied without changing saved values.
3. Reload and navigate between videos, including back/forward, ads and live playback. Verify the ON/OFF preference and settings.
4. Try normal, theater, expanded, fullscreen and scroll mini-player modes. With zoom, check clipping and control alignment. With mirror, check that native controls/captions remain unchanged.
5. Verify reset, individual double-click reset and toggling OFF restore the original picture.
6. Test short/narrow windows, panel placement near viewport edges, the unclipped arrow and original screenshot capture. Compare representative 1080p, 4K60 and HDR playback for visual quality and dropped frames.

## Known limitations

CSS adjustments are visual multipliers, not exposure recovery or HDR tone mapping. Ads using the same video are also affected. Browser rendering, native PiP, hardware performance and compatibility with other extensions require live testing. Zoom deliberately crops the picture and may remove baked-in subtitles. Existing styles from other extensions are restored on release but are not composed into the active filter chain. Storage failures follow EQ's current console-warning behavior.
