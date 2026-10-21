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

In Chrome or Edge, open the extensions management page, enable Developer mode, choose **Load unpacked**, and select `.output/chrome-mv3`. Open or reload a YouTube watch page. A bottom toolbar should show Speed, decrease, current speed/reset and increase controls. Reload the extension and the YouTube tab after a new production build.

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
