# Open YouTube Tools

An open-source browser extension for a more comfortable YouTube experience, with modular tools and a fresh, compact interface.

## Status

Working Chromium Manifest V3 foundation with a bottom-docked toolbar and playback speed controls. Live YouTube compatibility validation is still pending; see the [testing matrix](docs/testing.md).

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

Load `.output/chrome-mv3` as an unpacked extension in Chrome or Edge, then reload a YouTube watch page. Use − / + to adjust speed and click the current rate to reset to 1×. For development, run `npm run dev`.

See [local development](docs/guides/local-development.md) for setup and commands.

## Architecture

The stack is strict TypeScript, WXT, native DOM with Shadow DOM style isolation, Vitest/jsdom and Prettier. See the [stack decision](docs/architecture/decisions/0001-extension-stack.md) for rationale.

```text
src/
  entrypoints/       # Extension startup, composition and lifecycle
  core/              # Shared PlayerPort and Tool contracts
  platform/youtube/  # Site selectors and current video lifecycle
  features/          # Independent UI and behavior, with colocated tests
  toolbar/           # Tool composition and bottom-docked presentation
```

Features use typed player capabilities and never query YouTube DOM or import another feature's internals. The YouTube adapter owns discovery and video replacement; the entry point connects dependencies. See the [architecture and scope](docs/architecture/overview.md) and [documentation index](docs/README.md).

## Initial roadmap

1. Implemented: extension foundation, typed player API and bottom toolbar.
2. Implemented: [playback speed](docs/features/playback-speed.md) as the first feature example.
3. Next: verify live navigation, player modes and observed YouTube layout variants.
4. Planned: player docking, fullscreen handling and coordinated layout controls.

The initial feature has no persistence, Shorts/embed support or fullscreen toolbar. No extra extension API permissions, backend or telemetry are used.

## Inspiration

Inspired by the useful controls in [Enhancer for YouTube™](https://chromewebstore.google.com/detail/enhancer-for-youtube/ponfpcnoihfmfllpaingbgckeeldkhle). Open YouTube Tools is an independent project with its own implementation and interface. It is not affiliated with YouTube, Google, or Enhancer for YouTube™.

## Contributing

Feature proposals, compatibility reports, and contributions are welcome. Start with [adding a feature](docs/guides/adding-a-feature.md), follow the [development workflow](docs/development-workflow.md), and run `npm run check` before review. Only Ivo may approve and merge pull requests.

## License

MIT — see [LICENSE](LICENSE).
