# Open YouTube Tools

An open-source Chromium extension with a compact YouTube toolbar and modular video tools.

## Install and develop

Requires Node.js 24+ and npm.

```sh
npm ci
npm run check
```

Load `.output/chrome-mv3` as an unpacked extension in Brave, Chrome or Edge, then reload a YouTube watch page. Run `npm run dev` for development. See [local development](docs/guides/local-development.md).

## Available tools

### Playback speed

Scroll over the speed icon to change playback speed by 0.02 per wheel event, within 0.25–2×. Ctrl-scroll keeps browser zoom. Click the icon to open its panel, then expand the controls for quarter-step decrease/increase buttons and reset to 1×. The panel reflects native YouTube speed changes. Extension changes briefly show the resulting speed using YouTube's native speed-text layer when available. Speed is not saved between sessions. See [playback speed](docs/features/playback-speed.md).

### Expand / shrink video

Click the expand icon to make the existing player span the available page width, with native controls spanning that full player width (including their usual 12px side insets). The picture fits maximally inside this stage and the viewport height, as in theater mode. The original video proportions are preserved, including portrait and ultrawide videos; height takes priority when full width would cut off the picture. Space is reserved for the masthead and toolbar. Click the shrink icon to restore YouTube's layout.

While expanded, the secondary column is placed after the primary content and known side-rail containers are released from fixed positioning. Scoped styles handle the standard watch layout without changing YouTube experiment flags. Experimental-layout fixes are deferred. Fullscreen and picture in picture temporarily suspend the expanded layout. Navigation to another video and disabling the tool restore the native layout. Expand state is not saved. Experimental-layout compatibility still requires live testing with the Brave custom filters disabled. See [expand player](docs/features/expand-player.md).

### Scroll mini player

Enabled by default. Scroll the main player above the masthead to keep its existing picture in the top-left corner, at 25% of the viewport width in a black 16:9 frame. Scroll back to restore it. Time, speed, volume and playback state continue on the same video.

A Play/Pause button fades in on hover or keyboard focus, and an elapsed progress bar remains visible. Opening YouTube's left guide moves the picture and controls beside the menu; closing it restores the left offset. The picture uses the browser's top layer to stay above comments and avatars. Fullscreen and picture in picture temporarily suppress it. Toggle it through **⋮ → Player Playback → Mini player**; this preference is saved. Captions stay with the main player, and the progress bar does not support seeking. See [mini player](docs/features/mini-player.md).

## Toolbar and saved settings

The compact toolbar attaches below the video or docks at the bottom of the screen. Use **⋮ → Position** to choose. It aligns left in normal mode and centers in theater mode; in fullscreen it follows native controls visibility inside the player.

Click tool icons to activate them; panels open on click. Speed has a collapsible panel, while expand/shrink acts immediately. **⋮ → Functions** shows registered tools with checkboxes to hide or restore their controls. The options menu remains accessible when all tools are hidden. Position, hidden tools and mini-player enablement are saved in extension-local storage, using the storage permission. See [toolbar](docs/features/toolbar.md).

## Compatibility and validation

Regular `www.youtube.com/watch` pages are supported by the adapters; home-page previews, Shorts and embeds are excluded. Ivo reported testing and accepting the existing features through PR #5 on 2026-10-21. This acceptance predates expand/shrink. Automated checks cover behavior and lifecycle; they do not establish compatibility with every YouTube experiment. See the [testing matrix](docs/testing.md) for recorded browser evidence and pending cases. There is no backend or telemetry.

## Architecture and contributing

Strict TypeScript, WXT, native DOM with Shadow DOM UI isolation, Vitest/jsdom and Prettier. The YouTube adapters own site selectors and lifecycle; independent features use narrow typed capabilities.

```text
src/
  entrypoints/       # Extension startup and lifecycle
  core/              # Shared player and tool contracts
  platform/youtube/  # YouTube selectors, geometry and video lifecycle
  features/          # Independent controls and behavior
  toolbar/           # Composition, settings and shared Floating UI panels
```

See [architecture](docs/architecture/overview.md), [stack decision](docs/architecture/decisions/0001-extension-stack.md), [documentation index](docs/README.md) and [adding a feature](docs/guides/adding-a-feature.md). Follow the [development workflow](docs/development-workflow.md) and run `npm run check` before review. Only Ivo may approve and merge pull requests.

## Inspiration and license

Inspired by [Enhancer for YouTube™](https://chromewebstore.google.com/detail/enhancer-for-youtube/ponfpcnoihfmfllpaingbgckeeldkhle). This is an independent implementation, unaffiliated with YouTube, Google or Enhancer for YouTube™.

MIT — see [LICENSE](LICENSE).
