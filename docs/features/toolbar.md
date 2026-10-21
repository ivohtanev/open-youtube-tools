# Compact toolbar

The default toolbar attaches directly below the video with rounded lower corners. It is 44 CSS pixels high with 24-pixel icons and 38-pixel targets, matching the approximate scale of the supplied 1080p reference. Only the speed icon and the rightmost vertical ellipsis are visible. Normal mode aligns left; theater mode centers under the player.

## Shared panels

`toolbar/popover.ts` wraps `@floating-ui/dom` with `autoUpdate`, `offset`, `flip` and `shift`. Panels prefer below player docking and above bottom docking, then adapt to available viewport space. Listeners exist only while mounted; position observation exists only while open. Interactive panels use non-modal dialog semantics, native buttons, Tab navigation, ArrowDown to enter, Escape to return focus, outside-click dismissal and a short hover grace period. They are not ARIA tooltips because they contain controls.

The speed panel contains the text “Change Speed with Scroll” and an outlined chevron that slides the controls open. Reduced-motion preferences disable animation. Use this shared component for future tool panels instead of adding per-feature positioning logic.

## Settings and layout

The ellipsis opens a settings panel with a nested Layout category. “Attached to video” and “Bottom of screen” change position immediately. The entry point stores `toolbarPosition` in extension-local storage; invalid or missing values default to player docking. This requires the `storage` permission. Speed is not persisted. Appearance and icon-visibility categories can be added when their settings are implemented; empty categories are intentionally omitted.

`ToolbarPosition` and `ToolbarLayout` are core contracts. The entry point injects the YouTube layout adapter into the toolbar. Only `platform/youtube/toolbar-layout.ts` owns site selectors, player geometry, theater detection and fullscreen hosting. The adapter reserves space for player docking, observes resize/layout/navigation, coalesces updates with animation frames and releases observers on disposal.

During fullscreen the host moves inside the fullscreen element, centers at its bottom edge, and uses an 80% opaque background. YouTube's `ytp-autohide` class hides the whole toolbar and makes it inert. Leaving fullscreen restores the selected position. Fullscreen is a temporary layout override, not a saved preference change.

## Validation boundary

DOM tests cover positioning and speed behavior. A Chromium fixture at 1920×1080 exercises actual rendering and interaction; it does not establish live YouTube compatibility. Validate normal/theater/fullscreen, native controls hiding, navigation, restored settings and narrow viewports on live YouTube before marking the PR ready.
