# Adding a feature

1. Follow the [Git workflow](../development-workflow.md): inspect changes and PR scope, then continue the appropriate branch or isolate independent work.
2. Define the user behavior, supported pages, non-goals and acceptance cases before coding. Check the architecture's implemented/planned distinction.
3. Add `src/features/<feature-name>/index.ts` exporting a `Tool`. Implement `mount(container, player)` and return a cleanup function.
4. Use PlayerPort for video access. Add a narrow capability to core and implement it in the platform adapter if needed. Do not import another feature's internals, query YouTube selectors or create an event bus to bypass the boundaries.
5. Register the tool explicitly in the content entry point's tool list. Give it a unique stable ID. The toolbar owns shared presentation; the feature owns its controls.
6. Use native accessible controls, descriptive labels, visible focus states and disabled/unavailable behavior. Keep styles within the shadow UI.
7. Clean up subscriptions, listeners, timers and elements on unmount. Test behavior after navigation and video replacement when relevant.
8. Add meaningful behavior tests beside the feature and adapter changes. Run `npm run check`, then the relevant [manual cases](../testing.md).
9. Add `docs/features/<feature-name>.md` and link it from the documentation index. Update the architecture and an ADR when boundaries or dependencies change.
10. Commit the meaningful implementation and open/update its draft PR. Include validation evidence and outstanding manual checks. Only Ivo approves and merges.

## Feature document sections

Use: Status; User behavior; Scope and non-goals; Contracts and dependencies; Lifecycle and failure behavior; Tests and manual acceptance; Known limitations. State what is verified and what remains unverified. The [playback speed specification](../features/playback-speed.md) is the first example.
