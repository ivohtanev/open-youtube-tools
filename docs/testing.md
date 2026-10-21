# Testing and compatibility

## Automated checks

Run `npm run check`. TypeScript checks the contracts, Vitest/jsdom checks behavior and disposal, Prettier checks formatting, and WXT verifies extension packaging. CI runs the same command on Node 24. Tests use local fixtures and do not contact YouTube.

## Owner acceptance — 2026-10-21

Ivo reported testing the current extension in Brave on live YouTube and accepted the toolbar, animations and speed indicator after the CSS fade fix (`f245311`). This is owner-reported manual acceptance of the current behavior, including the previously reported indicator issue; it is not a GitHub approving review or merge authorization. Browser version, individual compatibility-matrix outcomes and console logs were not supplied.

The implementation passed `npm run check` with 12 tests before this documentation update. Further features are deferred to a later session. Preserve the accepted interaction behavior when adding them.

## Manual acceptance matrix

The second feature adds a [scroll mini player](features/mini-player.md). Its DOM tests and initial Brave canvas-stream fixture cover scroll restoration, one video, Play/Pause, progress, lifecycle and the iconless setting. The rebuilt extension was subsequently reloaded and verified on live YouTube in Brave on 2026-10-21: fully opaque picture, video/overlay aligned 12px below the measured 56px masthead, Play/Pause opacity 0 → 1 → 0 on pointer enter/leave with a 180ms fade, and restoration without temporary ancestor attributes after scrolling up. The measured floating size was 338 × 190.125px in a 1352px viewport. Remaining compatibility cases and browser version are not recorded; follow the feature's manual acceptance list before marking ready.

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
