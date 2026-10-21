# Documentation

Read this index before changing architecture or adding a feature.

| Document                                                         | Purpose                                                  |
| ---------------------------------------------------------------- | -------------------------------------------------------- |
| [Architecture](architecture/overview.md)                         | Current boundaries, runtime, scope and planned evolution |
| [Stack decision](architecture/decisions/0001-extension-stack.md) | Why this stack was selected and its tradeoffs            |
| [Local development](guides/local-development.md)                 | Install, build, load and validate the extension          |
| [Adding a feature](guides/adding-a-feature.md)                   | Implementation and documentation checklist               |
| [Playback speed](features/playback-speed.md)                     | First feature's behavior, contracts and limitations      |
| [Mini player](features/mini-player.md)                           | Scroll-triggered picture and saved playback setting      |
| [Expand player](features/expand-player.md)                       | Viewport-fit picture and reversible full-width layout    |
| [Cinema mode](features/cinema.md)                                | Page dimming with clear player and toolbar windows       |
| [Screenshot](features/screenshot.md)                             | Native-resolution PNG frame capture and Save As          |
| [Testing](testing.md)                                            | Automated coverage and manual compatibility matrix       |
| [Development workflow](development-workflow.md)                  | Task isolation, branches and owner-only merge rules      |

## Research reports

- [YouTube player APIs and feature opportunities](research/youtube-player-api-and-feature-opportunities.md): player control surfaces, brightness and filters, browser/YouTube APIs, feature priorities and final summary.

## Documentation rules

- Write documentation and code comments in English.
- Keep behavior documentation next to its topic in this directory; implementation and tests stay together in `src`.
- Update affected documentation in the same PR as the behavior change.
- Separate implemented behavior, planned work and verified compatibility. Do not describe a proposal as shipped.
- Record significant architectural choices as numbered decision records in `architecture/decisions/`. Include status, context, decision, alternatives and consequences. Supersede old decisions with links instead of silently rewriting their history.
- Every feature gets a document under `features/` using the sections in the adding-a-feature guide.
- Keep this index and the README links current. Avoid duplicating specifications across files.
