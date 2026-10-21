# OpenTube Tools

An open-source browser extension for a more comfortable YouTube experience, with modular tools and a fresh, compact interface.

## Status

Project initialization. No installable extension or implemented features yet.

## Vision

- A toolbar with an icon for each available tool.
- Docking to the video player or the bottom of the viewport, with rounded corners only on the free edge.
- Independent feature modules, each in its own directory.
- Shared controllers, models, and APIs for features that need to read or change player state, such as normal, shrink, expand, and theater modes.
- Simple tools, such as playback speed controls, can operate directly on the video without unnecessary communication between features.
- Compatibility with contemporary YouTube layouts, including A/B variants observed in October 2026, to be verified during implementation.

## Planned architecture

The following is a proposed structure; implementation will be added incrementally.

```text
src/
  features/          # One directory per feature, including its UI and behavior
  shared/
    controllers/     # Player access and state transitions
    models/          # Shared state and contracts
    api/             # Explicit communication between features
  toolbar/           # Tool registration, presentation, and docking
  extension/         # Browser extension entry points and manifest
```

Features should use shared APIs when coordination is needed, rather than depending on one another's internal implementation. YouTube-specific layout detection should be centralized so compatibility fixes can be reused.

## Initial roadmap

1. Establish the browser extension foundation and development workflow.
2. Build the dockable toolbar and shared player API.
3. Select and implement the first tools, starting with playback speed as a candidate.
4. Verify behavior across player modes, navigation, and observed YouTube layout variants.

## Inspiration

Inspired by the useful controls in [Enhancer for YouTube™](https://chromewebstore.google.com/detail/enhancer-for-youtube/ponfpcnoihfmfllpaingbgckeeldkhle). OpenTube Tools is an independent project with its own implementation and interface. It is not affiliated with YouTube, Google, or Enhancer for YouTube™.

## Contributing

The project is at an early planning stage. Feature proposals, compatibility reports, and contributions are welcome. Development and installation instructions will follow with the first working extension.

## License

MIT — see [LICENSE](LICENSE).
