# Expand / shrink player

## Status

Implemented with automated geometry, lifecycle and toolbar tests. The original implementation failed owner testing; this correction targets the standard layout with a full-width player/control stage. Experimental-layout fixes are deferred; DOM tests cannot establish support for all experiment variants.

## User behavior

The toolbar button immediately toggles between Expand video and Shrink video, with an accessible pressed state. Expansion makes the player stage span the available page width. Native controls span this stage with their usual 12px side insets, even when the picture is narrower. The stage fills the entire viewport height below the YouTube masthead. The picture uses object-fit containment to fill as much of that stage as its original aspect ratio permits, without cropping. With player docking selected, our toolbar sits centered immediately below the stage and reserves 44px in the document flow. It does not subtract from the picture height; scroll slightly to reach it when the stage fills the viewport. Native controls remain at the bottom of the player. Media dimensions are handled by the browser without a temporary 16:9 sizing assumption. Portrait and ultrawide pictures remain uncropped. Shrink restores YouTube's own layout.

The primary content becomes full width and the secondary column follows it in normal document flow. Known side-rail hosts lose fixed positioning. This does not modify YouTube experiment flags or require Brave filters. It does not hide recommendations or reparent the video.

## Scope and non-goals

Regular watch pages only. This is a page layout tool, not browser fullscreen. Expansion is session-local and resets on navigation or when hidden through Functions. It preserves native playback, controls, captions, time, volume and speed on the same video. No new storage permission or saved setting is added.

## Contracts and dependencies

`ExpandPlayerPort` supplies toggle, reset and available/expanded subscriptions. The YouTube adapter owns sizing, selectors and a removable attribute-scoped stylesheet. CSSOM custom properties update geometry without overwriting native inline values. The stage and the native zero-height `.html5-video-container` receive explicit height; the video fills that stage with `object-fit: contain`. Toggle/reset dispatches a resize event after layout is applied so native controls can refresh cached pixel dimensions. The feature owns a single button; the existing toolbar registers its Functions entry. The mini player's video rule is excluded from expansion's video sizing.

## Lifecycle and failure behavior

Viewport resize, masthead resize, intrinsic video resize, metadata, DOM replacement and theater changes refresh geometry. Navigation clears expansion; replacement within the same watch page keeps it. Fullscreen and native picture in picture temporarily suspend scoped layout and disable the toggle. Leaving restores the requested state. Disposal removes attributes, stylesheet, observers and listeners. Missing watch/player elements disable the control.

## Tests and manual acceptance

Automated tests cover full stage height below the masthead across media changes, centered toolbar docking below the expanded stage and restoration after shrink, original inline styles and video identity, toggling, route changes, video replacement, fullscreen, button accessibility, tool disablement and disposal.

Before accepting, reload the built extension and watch tab. Check normal and theater layouts, a short viewport, portrait/ultrawide videos, live streams, resize, fullscreen/PiP, scroll mini player, native controls/captions, SPA navigation and hide/re-enable through Functions. Check secondary content remains accessible below primary content. Repeat with Brave's experiment-disabling and side-rail-hiding custom filters disabled, recording the observed layout and browser version. Do not infer experiment coverage from a classic-layout pass.

## Known limitations

YouTube may introduce new wrappers or independently scrolling panels that need additional selectors. Known grid/fixed-panel styles are addressed by scoped overrides rather than private experiment configuration. Aspect-ratio differences produce empty space on one axis; filling both axes with picture would require cropping or distortion. Recommendations follow all primary content, including comments, rather than being moved directly after the player.
