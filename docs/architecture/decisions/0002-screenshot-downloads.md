# 0002: Save screenshots through a local download worker

## Status

Accepted for implementation on 2026-10-21; live browser acceptance remains pending.

## Context

The camera action must capture the video frame and open a native save dialog on each click. Ordinary anchor downloads depend on browser download preferences and cannot require Save As. The File System Access picker is not uniformly available to extension content scripts.

## Decision

Capture a PNG from the current YouTube video using a canvas at intrinsic media dimensions. Send its data URL and suggested filename to a Manifest V3 worker, which calls `browser.downloads.download` with `saveAs: true`. Add the downloads permission. Validate the sender origin, PNG data URL and filename before invoking the API. Show failures in the toolbar and treat dialog cancellation as normal.

## Consequences

The extension gains a small local worker and a visible downloads permission. There is no upload or screenshot history. Large frames temporarily allocate canvas and data URL memory. Canvas security restrictions and protected media can prevent capture. Dialog behavior still needs live Chromium validation.
