# ADR 0001: TypeScript, WXT and native DOM

- Status: Accepted
- Date: 2026-10-21

## Context

The repository needs a working extension and a small example that establishes boundaries without committing to a large application framework. Most initial tools manipulate an existing YouTube video.

## Decision

Use Node.js 24+, npm with a committed lockfile, strict TypeScript, WXT's extension build pipeline, Manifest V3, native DOM components and Shadow DOM CSS isolation. Use Vitest with jsdom for behavior tests and Prettier for consistent formatting. CI runs type checking, tests, formatting and a production build. Exact installed versions are recorded in `package-lock.json`.

WXT handles manifest generation, content-script packaging and development reloads. No direct runtime UI dependency is needed. Chromium is the initial target; cross-browser support requires separate validation.

## Alternatives

- React/Vue: useful for complex panels, but unnecessary runtime and component machinery for three controls.
- Plain bundler plus hand-written manifest: fewer extension-specific conventions, but more custom build and lifecycle work.
- A global event bus/store: would obscure ownership before multiple coordinated features exist.

## Consequences

The entry-point naming and generated TypeScript configuration depend on WXT. DOM lifecycle cleanup is explicit. jsdom does not validate real browser layout, extension injection, fullscreen or YouTube compatibility; these need browser validation. Dependencies are development tools bundled into the extension where required; none are loaded from a CDN.

## References

- [WXT content scripts and UI lifecycle](https://wxt.dev/guide/essentials/content-scripts)
- [WXT TypeScript configuration](https://wxt.dev/guide/essentials/config/typescript)
- [Vitest documentation](https://vitest.dev/guide/)
