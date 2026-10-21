# Open YouTube Tools

An open-source browser extension for a more comfortable YouTube experience, with modular tools and a fresh, compact interface.

## Status

Working Chromium Manifest V3 foundation with a compact player-attached toolbar, scroll speed control, expandable panels and persistent docking preferences. Live YouTube compatibility validation is still pending; see the [testing matrix](docs/testing.md).

## Vision

- A toolbar with an icon for each available tool.
- Docking to the video player or the bottom of the viewport, with rounded corners only on the free edge.
- Independent feature modules, each in its own directory.
- Shared controllers, models, and APIs for features that need to read or change player state, such as normal, shrink, expand, and theater modes.
- Simple tools, such as playback speed controls, can operate directly on the video without unnecessary communication between features.
- Compatibility with contemporary YouTube layouts, including A/B variants observed in October 2026, to be verified during implementation.

## Quick start

Requires Node.js 24+ and npm.

```sh
npm ci
npm run check
```

Load `.output/chrome-mv3` as an unpacked extension in Chrome or Edge, then reload a YouTube watch page. Scroll over the speed icon in 0.02 steps. Click and expand its panel for preset − / + buttons and reset. Use ⋮ → Position to choose video or screen-bottom docking. For development, run `npm run dev`.

See [local development](docs/guides/local-development.md) for setup and commands.

## Architecture

The stack is strict TypeScript, WXT, native DOM with Shadow DOM style isolation, Vitest/jsdom and Prettier. See the [stack decision](docs/architecture/decisions/0001-extension-stack.md) for rationale.

```text
src/
  entrypoints/       # Extension startup, composition and lifecycle
  core/              # Shared PlayerPort and Tool contracts
  platform/youtube/  # Site selectors and current video lifecycle
  features/          # Independent UI and behavior, with colocated tests
  toolbar/           # Tool composition and shared Floating UI panels
```

Features use typed player capabilities and never query YouTube DOM or import another feature's internals. The YouTube adapter owns discovery and video replacement; the entry point connects dependencies. See the [architecture and scope](docs/architecture/overview.md) and [documentation index](docs/README.md).

## Initial roadmap

1. Implemented: extension foundation, typed player API and bottom toolbar.
2. Implemented: [playback speed](docs/features/playback-speed.md) as the first feature example.
3. Next: verify live navigation, player modes and observed YouTube layout variants.
4. Implemented: [compact toolbar](docs/features/toolbar.md), player docking, fullscreen handling and saved position.

Toolbar position uses extension-local storage and the storage permission. Speed is not persisted. Shorts/embed support, backend and telemetry are absent. Live fullscreen compatibility remains to be verified.

## Inspiration

Inspired by the useful controls in [Enhancer for YouTube™](https://chromewebstore.google.com/detail/enhancer-for-youtube/ponfpcnoihfmfllpaingbgckeeldkhle). Open YouTube Tools is an independent project with its own implementation and interface. It is not affiliated with YouTube, Google, or Enhancer for YouTube™.

## Contributing

Feature proposals, compatibility reports, and contributions are welcome. Start with [adding a feature](docs/guides/adding-a-feature.md), follow the [development workflow](docs/development-workflow.md), and run `npm run check` before review. Only Ivo may approve and merge pull requests.

## License

MIT — see [LICENSE](LICENSE).
