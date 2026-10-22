# Testing and compatibility

## Owner acceptance — 2026-10-22 (both watch-page designs)

Ivo reported testing the existing features in both the experimental A/B watch-page design and the normal design, with everything working well in his assessment. The normal design was restored using the [recorded Brave custom filters](research/disable-experimental-watch-layout.md). This is owner-reported manual acceptance, not an independently repeated test or a case-by-case compatibility record. Browser version, individual scenarios and console logs were not supplied. This newer report supplements the earlier records below; it does not establish coverage of every untested scenario.

## Automated checks

Run `npm run check`. TypeScript checks the contracts, Vitest/jsdom checks behavior and disposal, Prettier checks formatting, and WXT verifies extension packaging. CI runs the same command on Node 24. Tests use local fixtures and do not contact YouTube.

## Cinema and screenshot — 2026-10-21

Automated tests cover cinema mask opacity/geometry, fullscreen and mini-player tracking, Escape/navigation/disposal, PNG capture at intrinsic video dimensions, unavailable and restricted frames, Save As requests, request validation and cancellation/errors. Ivo confirmed on 2026-10-21 that screenshot saving works and the initial cinema behavior is good. The subsequent 180ms CSS transition and toolbar hover/focus brightness refinement passes the automated suite (53 tests), including rapid reactivation during fade-out; live acceptance of this refinement remains pending. For testing after changes, reload the unpacked extension to register the new downloads permission and worker. Follow the acceptance cases in [cinema](features/cinema.md) and [screenshot](features/screenshot.md).

## Owner acceptance — 2026-10-21 (previous features)

Before work on expand/shrink, Ivo confirmed that all existing features through merged PR #5 were tested and approved. This supersedes the earlier general pending status for those features; no individual additional matrix results or browser version were provided. Expand/shrink was added afterward and needs its own acceptance.

## Expand / shrink — 2026-10-21

Final native-mode handoff: after owner-assisted reload, live Brave verified T from the focused extension button in both directions (expand over default → native theater; expand over theater → native default). The native YouTube size button also exited expand into theater and into default. In all four cases the expansion attribute cleared and the selected native theater state remained in control. The tab was left in default with no horizontal overflow. The latest toolbar is centered below the player, superseding the earlier overlay record. `npm run check` passes with 39 tests, including native mode transitions, pre-existing queued attribute changes, ignored T without a native transition, and T propagation from a focused Shadow DOM tool button.

Latest toolbar correction: Ivo accepted the expanded picture but requested the toolbar centered below it instead of overlaid at the top-right. Player docking now reserves its normal 44px after the player, centers on the player rectangle, and restores normal alignment after shrink. The expanded picture height remains unchanged. Automated positioning/restoration tests and `npm run check` pass (35 tests). This supersedes the toolbar-overlay behavior in the earlier live record below; the latest toolbar placement has not yet been reloaded and checked live.

The final requested behavior retains only the YouTube masthead outside the expanded stage. After a further owner-assisted reload, live Brave measured a 56px masthead and a full-width 1520.8 × 719.2px player/video stage at (0,56), ending exactly at the 775.2px visual viewport bottom. Original media dimensions were 1280 × 720, with object-fit containment preserving its proportions. Native controls remained 1496.8px wide at x=12. The 134 × 44px extension toolbar overlaid the top-right at y=56 and reserved no height. Document scroll width matched client width (no horizontal overflow), and secondary content followed primary. Shrink restored native player dimensions and toolbar docking below it; a second expand succeeded. Automated checks pass with 35 tests after replacing the obsolete picture-fit arithmetic with browser containment and full-stage-height tests. Experimental layouts, portrait/ultrawide media, fullscreen/PiP and the wider matrix remain unverified in this pass.

The owner rejected the initial expand implementation. Live inspection reproduced a zero-height `.html5-video-container` and picture, a 1173px-wide player, and stale 829px controls. The correction keeps the stage full width, gives the inner picture container explicit height, fits the picture with `object-fit: contain`, stretches controls with native 12px side insets, and dispatches native resize after toggling. After owner-assisted extension reload, live Brave inspection measured a 1520.8 × 660px player and video stage at (0, 56), and 1496.8px controls/progress at x=12. Shrink restored the native 853.325 × 479.988px player and 853 × 480px picture. Secondary content followed the primary content. Additional width containment addresses secondary padding and negative metadata margins. The scope is now standard-layout correction; experimental-layout work is deferred.

Automated cases cover viewport bounds and original aspect ratio, metadata sizing, identity and inline-style preservation, navigation/replacement, fullscreen suspension, accessible toggle, tool unmount and disposal. Live Brave DOM inspection confirmed classic watch wrappers, the absolute `#player-container`, and a separate fixed `#fixed-side-menu`; scoped styles include these containers. This inspection is not a live test of the new extension build. The browser integration blocked opening `chrome://extensions/`, so the build could not be reloaded through it. Reload the unpacked extension and watch tab manually before the [expand acceptance cases](features/expand-player.md#tests-and-manual-acceptance). Repeat with experiment-disabling Brave custom filters disabled; no experimental-layout result is claimed.

## Earlier acceptance record

Ivo reported testing the current extension in Brave on live YouTube and accepted the toolbar, animations and speed indicator after the CSS fade fix (`f245311`). This is owner-reported manual acceptance of the current behavior, including the previously reported indicator issue; it is not a GitHub approving review or merge authorization. Browser version, individual compatibility-matrix outcomes and console logs were not supplied.

The implementation passed `npm run check` with 12 tests before this documentation update. Further features are deferred to a later session. Preserve the accepted interaction behavior when adding them.

## Manual acceptance matrix

After the mini-player PR was merged, a follow-up guide-positioning fix was checked on live Brave: opening the 240px left menu moved video and controls together to x=252; closing it returned both to x=12. The picture stayed fully visible beside the menu and above watch-page comments, with the same paused video. Tests additionally cover intermediate guide slide positions, hidden/offscreen guide states, transition end/cancellation and listener/frame cleanup.

The second feature adds a [scroll mini player](features/mini-player.md). Its DOM tests and initial Brave canvas-stream fixture cover scroll restoration, one video, Play/Pause, progress, lifecycle and the iconless setting. Live Brave testing on 2026-10-21 verified the header offset and hover fade. The initial opacity check did not establish correct stacking over comments. A subsequent targeted check reloaded the rebuilt extension and scrolled actual comments/avatars/text behind the picture: both video and controls were in the browser's top layer, content stayed behind the video, one video remained and Play/Pause worked. Both floating rectangles measured 338 × 190.125px at (12, 68) below the measured 56px masthead. Scrolling up closed both top-layer presentations, removed the temporary video popover attribute and continued native playback. Remaining compatibility cases and browser version are not recorded; follow the feature's manual acceptance list before marking ready.

Record browser version, date, page type/layout, result and any console errors in the PR. Use the following matrix for detailed compatibility passes. Owner acceptance is recorded above; individual case outcomes have not been recorded, so do not infer case-by-case coverage from that report:

| Case                                    | Expected result                                                  |
| --------------------------------------- | ---------------------------------------------------------------- |
| Fresh `/watch` load                     | One compact toolbar below video; click reveals speed panel       |
| Homepage → watch → another video → back | Visibility follows route; no duplicate UI or stale video control |
| Native YouTube speed menu               | Toolbar reflects native changes                                  |
| Decrease/increase at limits and reset   | 0.25–2 range, disabled boundaries, reset to 1×                   |
| Video element replacement               | Controls operate on the new element                              |
| Home, Shorts, embed                     | Toolbar absent; unrelated videos untouched                       |
| Normal and theater mode                 | Left alignment in normal mode, centered in theater               |
| Fullscreen                              | 80% opaque internal toolbar follows native control visibility    |
| Narrow viewport and keyboard navigation | Controls fit; visible focus; Enter/Space activate buttons        |
| Ads and live streams                    | Record site behavior; no ad detection or live-rate guarantee     |
| Extension reload followed by tab reload | One working toolbar, no extension errors                         |

Do not mark a layout as supported based on jsdom results. Fix selectors centrally and add a regression fixture where possible. Add browser automation when it can validate extension injection and navigation reliably; do not replace the manual compatibility evidence with a screenshot of a synthetic page.

Additional toolbar checks: scroll by 0.02, 1.05 snaps to 1.25/1.00, disclosure animation, nested Position menu, position restored after reload, panels flip near viewport edges, Escape/outside-click dismissal and reduced-motion preference.
