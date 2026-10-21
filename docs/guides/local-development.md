# Local development

## Requirements and setup

Install Node.js 24 or newer and npm. From the repository root:

```sh
npm ci
npm run dev
```

WXT prepares generated types during installation. Development mode starts a browser with the extension when available. Keep the process running for rebuilds. If browser startup is unavailable, use the production loading steps below.

## Production build and manual loading

```sh
npm run check
```

In Chrome, Edge or Brave, open the extensions management page, enable Developer mode, choose **Load unpacked**, and select `.output/chrome-mv3`. Open or reload a YouTube watch page. A compact toolbar should appear below the video by default. Its speed icon opens the speed panel on click; expand that panel to access decrease, current speed/reset and increase controls. Reload the extension and the YouTube tab after a new production build.

`npm run zip` creates a distribution archive under `.output/`; it does not publish anything. Generated files and installed dependencies are ignored by Git.

## Commands

| Command                | Purpose                                        |
| ---------------------- | ---------------------------------------------- |
| `npm run dev`          | Development browser and rebuilds               |
| `npm run typecheck`    | Generate WXT types and check strict TypeScript |
| `npm test`             | Run deterministic DOM behavior tests           |
| `npm run format`       | Format repository files                        |
| `npm run format:check` | Check formatting without changing files        |
| `npm run build`        | Build Chromium Manifest V3 extension           |
| `npm run check`        | All required automated checks                  |

If the toolbar is absent, confirm the URL is a regular desktop `/watch` page, the video has loaded, and the extension is enabled. Inspect the tab console and extension errors. Unsupported selectors should be fixed in `src/platform/youtube`, not copied into a feature.

## Browser UI reference from the toolbar investigation

- Verify that the selected Brave profile has **our** unpacked extension enabled. Earlier investigation encountered another YouTube extension, which can produce misleading controls and indicators. An open Brave tab does not prove the latest build is installed.
- After building, reload Open YouTube Tools from the browser's extensions management page, then reload the YouTube tab. A production build alone does not update an already-running content script.
- The extension host is `open-youtube-tools`; controls live in its shadow root. The speed trigger has the accessible label “Change Speed with Scroll”; the ellipsis is “Toolbar options”. Use these to distinguish our controls from YouTube or another extension.
- To reproduce stationary-pointer issues, keep the same pointer coordinates over the speed icon while issuing repeated wheel ticks. Do not move or refocus between ticks: mouse movement can change native controls visibility and conceal the bug. Check both changing rates and ticks at a speed boundary.
- Native speed text is inside `.ytp-bezel-text-wrapper > .ytp-bezel-text`. In the inspected YouTube version, the wrapper used `ytp-delhi-modern-bezel-text-fadeout` with a 1-second, forwards-filled animation. The parent could have `display: block` and the text could update while wrapper opacity had already reached 0. Inspect computed animation and opacity as well as DOM text and parent display. jsdom does not reproduce the browser's animation rendering.
- The inspected player changes speed by 0.25 for Shift+>/< and separately calls a private notification renderer. Calling its speed setter alone does not invoke that renderer. Do not simulate a shortcut and then compensate the speed just to display a notice; the accepted feature uses 0.02 steps and temporarily suppresses the native text fade instead. Internal YouTube details may change.
- Browser automation could inspect the YouTube tab but could not claim Brave's internal extensions page. A subsequent Windows Computer Use attempt stopped because it could not confidently establish the current browser URL. Treat that as an automation limitation, stop UI input, and do not assume the extension was reloaded or the rebuilt code was verified. Ivo later confirmed acceptance manually; see [the testing record](../testing.md).
- Re-discover tabs and windows in future sessions; do not reuse recorded tab IDs or screen coordinates. Keep unrelated tabs and other extensions untouched.
