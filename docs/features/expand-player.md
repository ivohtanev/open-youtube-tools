# Expand / shrink player

## Status

Implemented with automated geometry, lifecycle and toolbar tests. Live experimental YouTube compatibility is pending; DOM tests cannot establish support for all experiment variants.

## User behavior

The toolbar button immediately toggles between Expand video and Shrink video, with an accessible pressed state. Expansion fits the original intrinsic video aspect ratio inside the available page width and viewport height, reserving the masthead height and 44px for the toolbar. Until metadata is available, sizing uses 16:9 and updates on metadata or intrinsic-size changes. Portrait and ultrawide pictures remain uncropped. Shrink restores YouTube's own layout.

The primary content becomes full width and the secondary column follows it in normal document flow. Known side-rail hosts lose fixed positioning. This does not modify YouTube experiment flags or require Brave filters. It does not hide recommendations or reparent the video.

## Scope and non-goals

Regular watch pages only. This is a page layout tool, not browser fullscreen. Expansion is session-local and resets on navigation or when hidden through Functions. It preserves native playback, controls, captions, time, volume and speed on the same video. No new storage permission or saved setting is added.

## Contracts and dependencies

`ExpandPlayerPort` supplies toggle, reset and available/expanded subscriptions. The YouTube adapter owns sizing, selectors and a removable attribute-scoped stylesheet. CSSOM custom properties update geometry without overwriting native inline values. The feature owns a single button; the existing toolbar registers its Functions entry. The mini player's video rule is excluded from expansion's video sizing.

## Lifecycle and failure behavior

Viewport resize, masthead resize, intrinsic video resize, metadata, DOM replacement and theater changes refresh geometry. Navigation clears expansion; replacement within the same watch page keeps it. Fullscreen and native picture in picture temporarily suspend scoped layout and disable the toggle. Leaving restores the requested state. Disposal removes attributes, stylesheet, observers and listeners. Missing watch/player elements disable the control.

## Tests and manual acceptance

Automated tests cover width/height bounds across landscape, portrait, square and ultrawide ratios, masthead/toolbar allowance, original inline styles and video identity, toggling, route changes, video replacement, fullscreen, button accessibility, tool disablement and disposal.

Before accepting, reload the built extension and watch tab. Check normal and theater layouts, a short viewport, portrait/ultrawide videos, live streams, resize, fullscreen/PiP, scroll mini player, native controls/captions, SPA navigation and hide/re-enable through Functions. Check secondary content remains accessible below primary content. Repeat with Brave's experiment-disabling and side-rail-hiding custom filters disabled, recording the observed layout and browser version. Do not infer experiment coverage from a classic-layout pass.

## Known limitations

YouTube may introduce new wrappers or independently scrolling panels that need additional selectors. Known grid/fixed-panel styles are addressed by scoped overrides rather than private experiment configuration. Unknown metadata temporarily uses a 16:9 frame with contained picture. Recommendations follow all primary content, including comments, rather than being moved directly after the player.
