# Experimental multiband equalizer

## Status

Implemented as an opt-in prototype. Type checking, 59 automated tests, formatting
and the production build pass. Live YouTube/Brave audio acceptance is pending.

## User behavior

Click the Equalizer toolbar icon to open its panel. ON/OFF controls processing;
opening the panel or editing a slider does not enable EQ. The icon glows only
while processing is enabled and the audio context is running. Reset sets all
bands to 0 dB without changing ON/OFF.

The ten peaking bands are 31.25, 62.5, 125, 250, 500, 1000, 2000, 4000, 8000 and
16000 Hz, with Q 1.4 and gains from -12 to +12 dB in 0.5 dB increments. Centers
are bounded below the runtime Nyquist frequency. Gains persist locally; enabled
state deliberately does not persist in this prototype. Positive gains reduce
the preamp by their sum for conservative headroom. This can lower perceived
volume substantially and is not a true-peak limiter. Changes use 20 ms smoothing.

## Scope and non-goals

Regular YouTube watch pages only. Presets, automatic activation, tab capture,
recording, parametric Q controls and remote casting support are outside this prototype.

## Contracts and dependencies

`EqualizerPort` and shared frequencies live in `src/core/equalizer.ts`. The
YouTube adapter owns Web Audio and video lifecycle; the feature receives the
port and renders native controls with the shared Floating UI popover. The entry
point persists gains through the existing storage permission. No dependencies
or extension permissions are added.

## Lifecycle and failure behavior

This implements the opt-in direct-element experiment from the
[feasibility report](../research/multiband-equalizer-feasibility.md), together with
the requested test UI. It is not a completed audio-routing acceptance gate.
No capture permission, recording, upload, second player or source reload is used.
One Web Audio source is retained per owned video element. OFF, hiding the tool
and disposal flatten filters and restore unity gain while preserving the audible
graph. They cannot restore the browser's original media routing. An element
replacement or emptied source turns EQ off; a new element requires manual ON.

## Known limitations

CORS-restricted media may become silent even when graph creation succeeds. ON
means the graph is running, not proof of audible or CORS-readable samples.
Use a disposable test tab. If sound disappears, reload that page. Reload the
page after updating or disabling the extension as well. Brave audio acquisition,
extension invalidation, ads, protected media and remote casting remain unverified.

## Tests and manual acceptance

Automated coverage includes repeated activation/source reuse, smooth bypass,
startup cancellation, source creation failure, element replacement, gain
validation, reset and the panel's ON-only icon illumination.

1. Reload the unpacked extension from `.output/chrome-mv3`, then reload a YouTube
   watch page. Open EQ: confirm OFF, no glow and ten labeled sliders.
2. Start playback, enable EQ, and confirm audible stereo output. Cut 1 kHz and
   boost bass modestly; listen for a change. Compare Reset, OFF and ON. Headroom
   compensation intentionally changes loudness when positive gains are present.
3. Repeat ON/OFF at least ten times, pause/resume, seek and change playback speed.
   Check for silence, doubled audio, clicks and lip-sync changes.
4. Navigate between videos, play through an ad and change audio tracks. Check
   normal, fullscreen, mini player and native PiP. After an element/source reset,
   confirm the icon is unlit and manually enable again.
5. Hide and restore Equalizer through toolbar options. Confirm audio stays audible
   and the restored tool is OFF. Reload the page: gains persist, ON does not.
6. Test multiple tabs, extension reload/disable and a rejected/occupied source.
   Reload the page for recovery if necessary; record browser version and result.
7. Before release, measure flat/boost/cut response, stereo preservation, clipping,
   latency and CPU with audio fixtures and actual playback. Automated graph/UI
   tests do not certify browser DSP or live YouTube audio.
