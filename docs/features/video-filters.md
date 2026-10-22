# Video filters

## Status

Implemented for regular YouTube watch pages. Automated adapter and control tests pass. Live Chromium/YouTube visual acceptance remains pending; zoom and mirror are explicitly experimental.

## User behavior

Click **Video filters** beside EQ. The panel reuses EQ's dark panel, blue accents, OFF/ON switch, reset icon and autosave presentation.

- Brightness: 50–150%; contrast: 50–150%; saturation: 0–200%. All default to 100%.
- Horizontal sliders support native keyboard interaction and mouse-wheel steps of 1%. Ctrl/Meta-wheel keeps browser behavior. Double-click a slider to restore 100%.
- First use starts OFF. Adjustments can be edited while OFF; turning ON applies them. The preference and settings survive reloads, navigation and browser restarts.
- **Compare original** temporarily bypasses all adjustments. **Show adjusted**, changing a setting, closing the panel or removing its controls ends comparison. Comparison is never saved.
- The reset icon restores all values, including experimental controls, without changing ON/OFF.
- The bottom experimental section provides zoom (100–150%, cropped to the original frame) and horizontal mirror. Mirroring also reverses text baked into the video. Both are saved with the basic settings.

Hiding the tool through Functions keeps processing active, matching EQ. Turn it OFF before hiding it if processing should stop.

## Scope and non-goals

Only the existing video picture is styled. Native captions, controls, page layout and audio are unaffected. No sepia, grayscale, hue rotation, sharpening, HDR processing, channel profiles or backend are included. Screenshots continue to export original pixels, without filters, zoom or mirror. Native picture-in-picture appearance is not guaranteed.

## Contracts and dependencies

`core/video-filters.ts` defines validated settings, control limits and `VideoFiltersPort`. The native DOM feature consumes only that port. The YouTube adapter owns video discovery and CSS; the entry point injects persistence callbacks using the existing `storage.local` permission. There are no new dependencies or permissions.

Storage keys are `videoFilterSettings` and `videoFiltersEnabled`. Settings writes are debounced by 200 ms, with pending changes flushed on pagehide and disposal. ON/OFF saves immediately. Invalid saved values fall back to defaults, finite values are clamped, and only fixed CSS functions are generated. Settings are global within the browser profile, restored when a content script starts; existing tabs do not synchronize live, matching EQ's current pattern.

## Lifecycle and failure behavior

The adapter reuses `findVideo` and the existing mutation/navigation observation pattern. It releases the previous video on replacement or departure from `/watch`, then applies current settings when a watch video becomes available. Same-element video changes retain settings.

The adapter owns `filter`, individual CSS `scale` and (for zoom) `clip-path`. Original inline values and priorities are retained. Bypass, reset and disposal restore them only while the adapter still owns the applied value; later external changes are preserved. An explicit subsequent adjustment takes ownership again and remembers the latest external value. Neutral settings leave no identity filter or transform override. No frame loop is added.

## Tests and manual acceptance

Automated tests cover malformed settings, bounds, combined filters, bypass, reset, style ownership, replacement, route transitions, debounced persistence, reload restoration, disposal, wheel controls, modifier keys, mirror and comparison dismissal.

Manual checks still required:

1. Load the build, enable filters and adjust all three sliders on a watch page; verify horizontal layout, keyboard focus and wheel behavior.
2. Compare original, dismiss with Escape/outside click, and reopen. Confirm the adjusted picture returns without changing saved values.
3. Reload and navigate between videos, including back/forward, ads and live playback. Verify the ON/OFF preference and settings.
4. Try normal, theater, expanded, fullscreen and scroll mini-player modes. With zoom, check clipping and control alignment. With mirror, check that native controls/captions remain unchanged.
5. Verify reset, individual double-click reset and toggling OFF restore the original picture.
6. Test short/narrow windows and original screenshot capture. Compare representative 1080p, 4K60 and HDR playback for visual quality and dropped frames.

## Known limitations

CSS adjustments are visual multipliers, not exposure recovery or HDR tone mapping. Ads using the same video are also affected. Browser rendering, native PiP, hardware performance and compatibility with other extensions require live testing. Zoom deliberately crops the picture and may remove baked-in subtitles. Existing styles from other extensions are restored on release but are not composed into the active filter chain. Storage failures follow EQ's current console-warning behavior.
