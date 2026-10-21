# Cinema mode

## Status

The owner confirmed the initial cinema behavior on 2026-10-21. The transition and hover refinement has automated coverage; live validation of this refinement is pending.

## User behavior

The film icon toggles a black overlay with 87% opacity. The player, including native controls, stays clear. The toolbar stays at 70% brightness and returns to full brightness on hover or visible keyboard focus. CSS transitions fade cinema on/off and toolbar brightness over 180ms; reduced-motion preferences disable transitions. Escape turns cinema off. The active icon uses the toolbar's accent color and pressed state.

## Scope and non-goals

Regular watch pages only. Cinema does not resize, pause, move or replace the video and does not persist across navigation. The overlay allows pointer interactions through to the page.

## Contracts and dependencies

The feature uses the injected `MountCinema` capability. The YouTube adapter owns video discovery and an SVG mask with player and toolbar rectangles. An animation frame loop keeps these windows aligned with scrolling, resizing, theater, expand and mini player changes. The overlay moves inside the fullscreen element when needed.

## Lifecycle and failure behavior

Navigation, loss of the video, disabling the tool and disposal immediately remove the overlay and cancel updates. Clicking the icon off allows a 180ms fade before removal; reactivation cancels pending removal. Missing video prevents activation. No native styles are modified.

## Tests and manual acceptance

Automated tests verify opacity, clear rectangles, fullscreen hosting, mini-player geometry, video identity, Escape, navigation, missing video and disposal. Manually check standard/theater/expanded modes, both toolbar positions, scrolling, mini player, fullscreen transitions, settings menus and navigation on live YouTube.

## Known limitations

Browser top-layer elements such as native dialogs can appear above the dimmer. Picture in picture is a separate browser window. Live YouTube experiments have not been validated.
