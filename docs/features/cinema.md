# Cinema mode

## Status

Implemented with automated geometry and lifecycle coverage. Live YouTube validation is pending.

## User behavior

The film icon toggles a black overlay with 70% opacity. Clear windows preserve the player, including native controls, and the extension toolbar. Escape turns cinema off. The active icon uses the toolbar's accent color and pressed state.

## Scope and non-goals

Regular watch pages only. Cinema does not resize, pause, move or replace the video and does not persist across navigation. The overlay allows pointer interactions through to the page.

## Contracts and dependencies

The feature uses the injected `MountCinema` capability. The YouTube adapter owns video discovery and an SVG mask with player and toolbar rectangles. An animation frame loop keeps these windows aligned with scrolling, resizing, theater, expand and mini player changes. The overlay moves inside the fullscreen element when needed.

## Lifecycle and failure behavior

Navigation, loss of the video, disabling the tool and disposal remove the overlay and cancel updates. Missing video prevents activation. No native styles are modified.

## Tests and manual acceptance

Automated tests verify opacity, clear rectangles, fullscreen hosting, mini-player geometry, video identity, Escape, navigation, missing video and disposal. Manually check standard/theater/expanded modes, both toolbar positions, scrolling, mini player, fullscreen transitions, settings menus and navigation on live YouTube.

## Known limitations

Browser top-layer elements such as native dialogs can appear above the dimmer. Picture in picture is a separate browser window. Live YouTube experiments have not been validated.
