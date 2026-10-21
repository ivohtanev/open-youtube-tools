# Testing and compatibility

## Automated checks

Run `npm run check`. TypeScript checks the contracts, Vitest/jsdom checks behavior and disposal, Prettier checks formatting, and WXT verifies extension packaging. CI runs the same command on Node 24. Tests use local fixtures and do not contact YouTube.

## Manual acceptance matrix

Record browser version, date, page type/layout, result and any console errors in the PR. The following cases are **not yet verified on live YouTube** by this implementation:

| Case                                    | Expected result                                                  |
| --------------------------------------- | ---------------------------------------------------------------- |
| Fresh `/watch` load                     | One compact toolbar below video; hover reveals speed panel       |
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

Additional toolbar checks: scroll by 0.05, 1.05 snaps to 1.25/1.00, disclosure animation, nested Layout menu, position restored after reload, panels flip near viewport edges, Escape/outside-click dismissal and reduced-motion preference.
