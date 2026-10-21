# Screenshot

## Status

Implemented with automated frame-capture and download-request coverage. Live Save As and YouTube validation are pending.

## User behavior

Click the camera icon to capture a PNG and open the browser's Save As dialog. The suggested name is `youtube-<video-id>-<playback-time-in-ms>ms.png`. The image uses intrinsic video dimensions rather than the displayed size. Capture leaves playback state unchanged.

## Scope and non-goals

Regular watch pages only. Capture the decoded video frame without controls, toolbar, captions or other page elements. No screen capture, screenshot history, clipboard access or upload is provided.

## Contracts and dependencies

The feature receives an injected asynchronous capture/save action. The YouTube adapter draws the current video to a canvas; the content entry point sends a PNG data URL to the extension worker. The worker validates the sender, data and filename and calls the downloads API with `saveAs: true`. This requires the downloads permission, in addition to storage.

## Lifecycle and failure behavior

The button is disabled while a request is pending. Unavailable frames, canvas failures and download failures produce a message by the icon. Canceling Save As is normal. Unmount removes UI and subscriptions; an already opened native dialog remains owned by the browser.

## Tests and manual acceptance

Automated tests cover intrinsic capture dimensions, frame selection, filenames, unchanged playback state, unavailable frames, unsupported routes, canvas security failures, Save As options, request validation, cancellation and download errors. After reloading the unpacked extension, manually capture playing and paused videos, portrait and high-resolution sources, verify PNG dimensions/content, choose another filename/folder and cancel the dialog. Check fullscreen and mini-player capture too.

## Known limitations

DRM or cross-origin canvas restrictions can prevent capture. Capturing a large frame uses temporary memory. Ads are not distinguished when they use the main video element. Browser policies can block downloads. No live browser result is claimed by the automated checks.
