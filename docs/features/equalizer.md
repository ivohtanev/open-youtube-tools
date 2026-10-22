# Experimental multiband equalizer

## Status

Implemented as an opt-in prototype. Live YouTube/Brave audio acceptance is pending;
automated checks do not certify the browser or device's audio output.

## User behavior

Click the Equalizer toolbar icon to open its panel. An OFF/ON switch controls processing;
opening the panel or editing a slider does not enable EQ. The icon glows only
while processing is enabled and the audio context is running. Reset sets all
bands to 0 dB without changing ON/OFF. OFF is on the left, ON on the right.
The switch is a keyboard-accessible button with `role="switch"` and
`aria-checked` reflecting the user's saved preference. The icon reflects actual
processing, so it stays unlit while a saved ON preference waits for activation.

The ten peaking bands are 31.25, 62.5, 125, 250, 500, 1000, 2000, 4000, 8000 and
16000 Hz, with Q 1.4 and gains from -12 to +12 dB in 0.5 dB increments. Centers
are bounded below the runtime Nyquist frequency. Gains, approach and ON/OFF
preference persist in extension local storage across refreshes, videos and
browser restarts. First use starts OFF. Changes use 20 ms smoothing.

## EQ approaches

The EQ approach dropdown applies immediately without resetting band gains or
enabling processing. The selected approach persists as `equalizerApproach`;
missing or invalid saved values select Boost + compressor. Existing valid saved
approaches remain selected. The dropdown labels and order are unchanged, including
the existing "recommended" text on Curve headroom. Reset flattens the bands
and preserves the selected approach. The panel displays the current overall
compensation in dB while enabled.

| Approach                         | Behavior                                                                                                                                                                           |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Curve headroom (recommended)     | Attenuates by the estimated maximum positive gain of the combined filter response. Accounts for overlapping boosts and cuts instead of summing every positive slider.              |
| Direct boost                     | Unity preamp, so positive band gains actually boost the signal. Loud material can clip or trigger downstream limiting.                                                             |
| Boost + compressor (default)     | Unity preamp followed by a DynamicsCompressorNode: -3 dB threshold, hard knee, 20:1 ratio, 3 ms attack, 150 ms release. May audibly change dynamics or duck the mix on bass peaks. |
| Conservative headroom (original) | Attenuates by the sum of positive band settings. Usually much quieter with multiple boosts.                                                                                        |

Boost + compressor is the default to provide actual boosts with peak compression.
Curve headroom preserves dynamics but offsets a single isolated +6 dB boost by about
-6 dB overall; choose Direct boost or Boost + compressor to compare actual
absolute boosts. It does not automatically restore loudness or normalize tracks.
No approach guarantees freedom from clipping or true-peak overshoot.

The response estimator uses disconnected BiquadFilterNodes with the same types,
frequencies, Q and target gains as the audible graph. It adds responses in dB at
4097 logarithmically spaced frequencies from 1 Hz through Nyquist, plus DC and
all band centers. This estimates steady-state response, not transient peaks.
It runs on setting changes, not per audio block, and does not analyze content.

The compressor is connected only while its approach is enabled. OFF and other
approaches use the direct filter output, avoiding the compressor's look-ahead
latency. Switching compressor routing can cause a brief discontinuity and should
be checked in live playback. A compressor is not a brick-wall/true-peak limiter;
the attack can allow peaks through. All approaches remain subject to browser,
Windows, driver and device processing after the Web Audio graph.

## Scope and non-goals

Regular YouTube watch pages only. Presets, tab capture,
recording, parametric Q controls and remote casting support are outside this prototype.

## Contracts and dependencies

`EqualizerPort` and shared frequencies live in `src/core/equalizer.ts`. The
YouTube adapter owns Web Audio and video lifecycle; the feature receives the
port and renders native controls with the shared Floating UI popover. Each approach
has its own module under `src/core/equalizer-approaches/`; browser response
measurement lives in `src/platform/youtube/equalizer-response.ts`. The entry
point persists `equalizerGains`, `equalizerApproach` and `equalizerEnabled`
through the existing storage permission. Only explicit switch changes write
`equalizerEnabled`; navigation, failures and disposal preserve it. No dependencies
or extension permissions are added.

## Lifecycle and failure behavior

This implements the opt-in direct-element experiment from the
[feasibility report](../research/multiband-equalizer-feasibility.md), together with
the requested test UI. It is not a completed audio-routing acceptance gate.
No capture permission, recording, upload, second player or source reload is used.
One Web Audio source is retained per owned video element. Explicit OFF and adapter
disposal flatten filters and restore unity gain while preserving the audible
graph. They cannot restore the browser's original media routing. Hiding or
remounting the panel leaves the user's processing preference unchanged.

Saved ON is restored when a watch-page video appears. Replacement bypasses the
old graph and automatically activates the new element. An emptied source is
bypassed until media readiness or playback triggers restoration on the same owned
source. Neither path writes OFF to storage. A failed startup is not retried on
every DOM mutation; playback, metadata or page interaction can retry it.
If AudioContext.resume waits for autoplay permission, the switch stays ON with
waiting feedback and can still be switched OFF to cancel. Pointer or keyboard
interaction retries resume. The saved preference does not prove active routing;
the icon lights only after the graph is enabled and the context is running.

## Known limitations

CORS-restricted media may become silent even when graph creation succeeds. ON
means the graph is running, not proof of audible or CORS-readable samples.
Use a disposable test tab. If sound disappears, reload that page. Reload the
page after updating or disabling the extension as well. Brave audio acquisition,
extension invalidation, ads, protected media and remote casting remain unverified.

## Tests and manual acceptance

Automated coverage includes repeated activation/source reuse, smooth bypass,
startup cancellation, source creation failure, element replacement, gain
validation, reset, approach persistence callbacks/default validation, combined
response estimation, compressor routing/bypass, dropdown interaction, saved ON/OFF
restoration, non-watch navigation, autoplay waiting/cancellation/retry and the
panel's ON-only icon illumination. Filter responses in unit tests are synthetic;
real DSP and audio output still require the following manual acceptance checks.

1. Reload the unpacked extension from `.output/chrome-mv3`, then reload a YouTube
   watch page. On first use, confirm OFF, no glow, ten labeled sliders and Boost +
   compressor selected. Check the unchanged dropdown labels/order. With a saved
   preference, confirm its switch position and settings instead.
2. Start playback, enable EQ, and confirm audible stereo output. Cut 1 kHz and
   boost bass modestly; listen for a change. Compare Reset, OFF and ON. Switch
   through every approach with the same band settings and confirm the help text
   and compensation readout change. Curve and Conservative headroom intentionally
   reduce overall level. Direct boost and Boost + compressor do not apply preamp
   attenuation. Compare at modest playback levels and check for distortion.
3. Repeat ON/OFF at least ten times, pause/resume, seek and change playback speed.
   Check for silence, doubled audio, clicks and lip-sync changes.
4. Navigate between videos, play through an ad and change audio tracks. Check
   normal, fullscreen, mini player and native PiP. After an element/source reset,
   confirm the saved switch position survives and processing restores automatically
   when playback can run. Check that OFF stays OFF on later videos as well.
5. Hide and restore Equalizer through toolbar options. Confirm audio stays audible
   and processing remains as configured. Reload the page and restart the browser:
   gains, approach and ON/OFF must persist. Reset should flatten bands without
   changing the approach or ON/OFF. Test both ON and OFF restoration.
6. Test multiple tabs, extension reload/disable and a rejected/occupied source.
   Reload the page for recovery if necessary; record browser version and result.
7. Before release, measure flat/boost/cut response, stereo preservation, clipping,
   latency and CPU with audio fixtures and actual playback. Automated graph/UI
   tests do not certify browser DSP or live YouTube audio.
