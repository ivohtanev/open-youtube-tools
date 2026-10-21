# YouTube player APIs and feature opportunities

Research date: 2026-10-21. Status: research and proposals, not an implementation specification or a live compatibility certification.

## Main finding

**Video brightness, contrast and saturation are straightforward to implement with CSS on the existing video element.** They do not require a YouTube API key, a backend, decoding frames in JavaScript or replacing the player. The recommended next feature is a small Video Adjustments panel with sliders, Reset and a temporary original/adjusted comparison.

The integration work is mainly lifecycle management: finding the current video, restoring styles, handling navigation and defining persistence. Native picture-in-picture and filtered screenshots need separate treatment. Advanced processing such as sharpening, HDR tone mapping and automatic scene correction is a different scope.

This recommendation is an engineering assessment based on the inspected repository and the browser standards linked below. No browser experiment or live YouTube session was performed for this report.

## Current project baseline

The inspected code provides a useful foundation:

- `src/platform/youtube/player.ts` finds `#movie_player video.html5-main-video` on `/watch`, observes replacements and exposes playback speed through `PlayerPort`.
- `src/core/contracts.ts` deliberately exposes narrow capabilities rather than the raw DOM element.
- Existing tools include speed, scroll mini player, expand player, cinema and screenshots. Cinema dims the surrounding page; it does not adjust the video's pixels. Toolbar brightness is also independent of video brightness.
- `src/platform/youtube/screenshot.ts` draws the source video onto a native-resolution canvas and exports PNG. It does not apply a CSS filter to the capture.
- `src/entrypoints/youtube.content.ts` composes tools, Shadow DOM UI and local settings. `wxt.config.ts` declares `storage` and `downloads`; there is no account integration or backend.

The report is independent of the completed cinema/screenshot implementation. The research branch starts from refreshed `origin/main` (`26f4c3f`), which includes that work.

## 1. Four different integration surfaces

| Surface                                  | What it provides                                                                             | Suitability here                                                                                           |
| ---------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Official YouTube IFrame Player API       | Control of an embedded `YT.Player` owned by an application                                   | Useful for a future companion website; not a supported controller for YouTube's existing watch-page player |
| Standard browser video, CSS and DOM APIs | Playback, rendering and interaction with the video already on the page                       | Best foundation for this extension; YouTube selectors still require maintenance                            |
| YouTube Data API v3                      | Remote metadata and authorized account operations                                            | Optional later integration; not needed for brightness or playback controls                                 |
| YouTube page internals                   | Site-specific state, player object methods, navigation events and internal network endpoints | Fragile integration; use only for a concrete capability with fallbacks                                     |

The official embed API's scope is documented in the [IFrame API reference](https://developers.google.com/youtube/iframe_api_reference). Chrome's [content-script documentation](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts) explains why DOM access works while page JavaScript objects are isolated.

### Official embedded-player capabilities

The documented surface includes:

| Area                 | Representative methods/events                                               |
| -------------------- | --------------------------------------------------------------------------- |
| Playback and seeking | `playVideo`, `pauseVideo`, `stopVideo`, `seekTo`                            |
| Loading              | `cueVideoById`, `loadVideoById`, playlist loading/cueing                    |
| Audio                | `setVolume`, `getVolume`, `mute`, `unMute`, `isMuted`                       |
| Speed                | `setPlaybackRate`, `getPlaybackRate`, `getAvailablePlaybackRates`           |
| Status               | `getCurrentTime`, `getDuration`, `getPlayerState`, `getVideoLoadedFraction` |
| Playlists            | Next/previous/index, playlist IDs/index, shuffle and loop                   |
| Presentation         | `setSize`, `getIframe`, spherical-video properties                          |
| Lifecycle            | Ready, state, rate, quality-change, error and autoplay-blocked events       |
| Caption options      | Documented module options such as caption font size                         |

There is no documented brightness/filter setter or dependable force-quality setter. A quality-change notification does not imply quality control. Requested speeds may not be accepted; read supported rates and observe the actual result. This is an embed contract, not a guarantee about `#movie_player` methods on youtube.com. Source: [IFrame reference](https://developers.google.com/youtube/iframe_api_reference).

Embed parameters provide startup choices such as controls, start/end, looping and caption preferences. Some historical parameters are deprecated; do not base new features on old tutorials promising removal of all branding or related videos. Source: [official player parameters](https://developers.google.com/youtube/player_parameters).

### Browser APIs on the existing video

| Capability         | Browser surface                                                                            | Useful product feature                             |
| ------------------ | ------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| Play/pause         | `play()`, `pause()`, `paused`                                                              | Hotkeys, sleep timer                               |
| Seek and progress  | `currentTime`, `duration`, `seekable`, `buffered`                                          | Jump controls, bookmarks, A-B repeat               |
| Playback speed     | `playbackRate`, `preservesPitch`                                                           | Fine speed steps and presets                       |
| Sound              | `volume` in 0–1, `muted`                                                                   | Volume wheel and mute controls                     |
| Video dimensions   | `videoWidth`, `videoHeight`                                                                | Resolution information and capture sizing          |
| Native text tracks | `textTracks` and cues, where exposed                                                       | Track-aware tools only when tracks actually exist  |
| State updates      | `loadedmetadata`, `timeupdate`, `seeking`, `seeked`, `ended`, `ratechange`, `volumechange` | Synchronize extension controls with native actions |

These are standard media capabilities, not guarantees that YouTube will preserve every value. `play()` can reject. Seek only inside valid ranges; live streams may have a moving DVR window or no rewind. Text tracks do not guarantee access to YouTube's custom caption implementation. Source: [HTML media standard](https://html.spec.whatwg.org/multipage/media.html).

The existing speed range of 0.25–2 is a project decision. Wider ranges require a separate compatibility decision. Keep the adapter as the authority for availability and actual state.

### Internal YouTube APIs: what would require more maintenance

Potentially useful areas include quality/audio-track selection, caption language, chapters, next/previous navigation and richer metadata. However, page objects, custom events and `/youtubei/` responses are not a public extension API contract. This report does not certify particular undocumented method names or response shapes.

An isolated content script can operate on DOM elements but cannot simply call page-owned JavaScript properties. A narrowly scoped MAIN-world bridge may be required for internal player calls. Such a bridge should accept fixed commands with validated arguments, expose no arbitrary evaluation and assume page messages are untrusted. It does not make the underlying private API stable. Source: [Chrome content-script execution worlds](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts).

Prefer native video APIs first. If a private integration disappears, disable that capability while keeping the rest of the toolbar working. Avoid simulating menu clicks as the foundation for core controls.

## 2. Brightness and video filters: the easy path

### Minimal mechanism

```css
#movie_player video.html5-main-video[data-oyt-adjustments] {
  filter: brightness(1.15) contrast(1.05) saturate(1.1);
}
```

This illustrates the mechanism, not shipped code. `brightness(1)` is neutral; lower values darken and higher values brighten. Filter functions compose in order. Apply them to the video so sibling controls and YouTube's DOM captions do not receive the adjustment. Applying the filter to the whole player would affect its descendants. Source: [W3C Filter Effects](https://www.w3.org/TR/filter-effects-1/).

The extension can set this style from its content script. Its toolbar's Shadow DOM stylesheet does not style the external video; the adapter must own the video styling in the page document.

| Adjustment                       | Simple route                                    | Assessment                                        |
| -------------------------------- | ----------------------------------------------- | ------------------------------------------------- |
| Brightness                       | `brightness()`                                  | Low complexity; first release                     |
| Contrast                         | `contrast()`                                    | Low complexity; first release                     |
| Saturation                       | `saturate()`                                    | Low complexity; first release                     |
| Grayscale                        | `grayscale()`                                   | Low complexity; optional preset                   |
| Hue, sepia, invert               | Corresponding CSS functions                     | Low complexity; lower everyday value              |
| Blur                             | `blur()`                                        | Easy mechanism, potentially higher rendering cost |
| Warmth                           | Approximate combination of sepia/saturation/hue | Prototype only; not calibrated color temperature  |
| Gamma or channel curves          | SVG `feComponentTransfer`                       | Moderate complexity; not a basic CSS function     |
| Sharpening                       | SVG convolution or a custom rendering path      | Higher complexity and more performance testing    |
| Denoise, upscale, HDR correction | Specialized image-processing pipeline           | Research project; not part of basic adjustments   |

Filter primitives are described in [W3C Filter Effects](https://www.w3.org/TR/filter-effects-1/). The complexity and release choices in this table are project recommendations.

Brightness is a visual multiplier, not monitor-backlight control, camera exposure or recovery of missing shadow detail. The proposed product should describe what the user sees rather than promise image restoration.

### Proposed first release

Use one Video Adjustments panel with brightness, contrast and saturation, numeric values, keyboard-accessible sliders, Reset and a press-and-hold Original comparison. Suggested initial slider ranges are brightness 50–150%, contrast 50–150% and saturation 0–200%; these are conservative UX proposals, not API limits.

Start with per-tab session settings and explicit persistence, rather than silently saving every change globally. Channel profiles can follow once channel identification and override behavior are designed. Cinema intensity and video brightness should remain separate controls.

Recommended adapter behavior:

1. Introduce a narrow `VideoAdjustmentsPort`; keep selectors and styling out of feature UI.
2. Use the centralized video lifecycle to attach to replacements and release old elements. Navigation may reuse the same element, so track video identity as well as element identity when resetting per-video settings.
3. Validate finite numbers and clamp values before generating a fixed filter string. Do not accept arbitrary CSS from settings.
4. Own one composed filter chain. Save any preexisting inline value/priority; restore only when the extension still owns the value, preserving subsequent changes by the page or another extension.
5. At neutral settings, release the override. Avoid permanent identity filters or unconditional `will-change` without evidence they help.
6. Update styles during interaction; debounce persistence. Use the existing observation infrastructure instead of adding a full-page observer per slider.

This is ordinary adapter/lifecycle work. It does not require a canvas render loop, MAIN-world bridge or additional extension permission.

### Important interactions

| Situation                                           | Expected behavior and required check                                                              |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Normal, theater, expand, current scroll mini player | The same filtered video should retain adjustments; verify layout combinations                     |
| Fullscreen                                          | Filter on the video should remain applicable; toolbar hosting and controls need validation        |
| Native video PiP                                    | Do not promise page CSS filters or custom caption styling; PiP is a separate presentation surface |
| Document PiP                                        | Can host HTML and styles, but requires more lifecycle work and browser capability checks          |
| Screenshot                                          | Current capture exports source pixels; CSS appearance is not automatically baked in               |
| Ads                                                 | The current adapter does not distinguish ads; adjustments can affect an ad using the same element |
| 4K/60 and HDR                                       | Measure rendering cost and visual output; no hardware-acceleration or HDR-quality guarantee       |

Native PiP and Document PiP are distinct APIs: [PiP specification](https://www.w3.org/TR/picture-in-picture/), [Chrome Document PiP guide](https://developer.chrome.com/docs/web-platform/document-picture-in-picture). Moving YouTube's video into another document may conflict with its lifecycle; the guide is not evidence that this works safely on YouTube.

For optional adjusted screenshots, set a supported `CanvasRenderingContext2D.filter` before `drawImage()`, using the same validated basic filter settings. Keep Original and Adjusted capture choices explicit. DOM captions and controls are not part of a video-only draw, and origin-clean restrictions still apply. Source: [HTML canvas standard](https://html.spec.whatwg.org/multipage/canvas.html).

## 3. Other APIs worth exposing through features

### Local browser and extension capabilities

| API                                                                                        | Useful feature                                                         | Difficulty and constraints                                                                                          |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [Extension storage](https://developer.chrome.com/docs/extensions/reference/api/storage)    | Presets, timestamp notes, bookmarks, bounded resume history            | Low–medium; existing permission. Prefer local storage; offer deletion/export. Sync has quotas                       |
| [Clipboard API](https://www.w3.org/TR/clipboard-apis/)                                     | Copy timestamp link or a formatted note                                | Low; invoke from a user action and handle focus/permission failure                                                  |
| [Fullscreen API](https://fullscreen.spec.whatwg.org/)                                      | Explicit fullscreen action integrated with toolbar modes               | Low–medium; user activation, promise rejection and fullscreen host handling                                         |
| [Native PiP](https://www.w3.org/TR/picture-in-picture/)                                    | Floating video outside the page                                        | Medium; request from user interaction, detect availability and keep distinct from current scroll mini player        |
| [Document PiP](https://developer.chrome.com/docs/web-platform/document-picture-in-picture) | Floating player with extension controls                                | High integration risk on YouTube; prototype before committing                                                       |
| [Extension commands](https://developer.chrome.com/docs/extensions/reference/api/commands)  | Configurable screenshot, filter-reset and bookmark shortcuts           | Medium; manifest declarations, shortcut conflicts and target-tab routing through background messaging               |
| [Extension alarms](https://developer.chrome.com/docs/extensions/reference/api/alarms)      | Sleep timer backed by a stored deadline                                | Medium; adds `alarms`. Delivery may be delayed; persist/reconcile deadlines and do not promise frame-exact stopping |
| [Video frame callbacks](https://web.dev/articles/requestvideoframecallback-rvfc)           | Frame presentation information, capture after seek, tighter A-B checks | Medium; callbacks are not exact frame stepping and can run late                                                     |
| [Web Audio](https://webaudio.github.io/web-audio-api/#MediaElementAudioSourceNode)         | Gain above 100%, equalizer, compressor, dialogue-oriented presets      | Medium–high; CORS, context startup and audio lifecycle can block or complicate integration                          |
| [Tab capture](https://developer.chrome.com/docs/extensions/reference/api/tabCapture)       | Alternative audio source for processing                                | High; explicit extension invocation and `tabCapture` permission; preserve audible output when routing the stream    |

Web Audio needs a separate feasibility spike. `volume = 2` is not a volume booster. A media-element source can output silence for CORS-cross-origin media; the actual YouTube playback source must be tested. Creating an audio source changes routing and cannot be treated as a disposable CSS toggle. Source: [Web Audio specification](https://webaudio.github.io/web-audio-api/#MediaElementAudioSourceNode).

Page-local keyboard listeners are simpler than extension commands when focus stays on YouTube. Respect text inputs, editable controls and native shortcuts. Route any privileged background action through typed, validated messages, following the existing screenshot pattern.

### Official YouTube services

| Service/resource                                                                             | Useful feature                                                      | Access and limitations                                                                                             |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| [Videos](https://developers.google.com/youtube/v3/docs/videos/list)                          | Reliable metadata cards, duration/statistics and embed availability | API key or authorization; not the currently selected stream quality                                                |
| [Search](https://developers.google.com/youtube/v3/docs/search/list)                          | Optional search panel                                               | API credentials, pagination and a separate daily search budget                                                     |
| [Playlists](https://developers.google.com/youtube/v3/docs/playlists/list) and playlist items | Browse lists; authorized save/organize actions                      | Account writes/private data require OAuth; do not promise support for special system playlists                     |
| Channels, subscriptions, comments                                                            | Channel context, subscribed-channel tools or comment utilities      | Public reads versus OAuth-protected account actions; method-specific restrictions                                  |
| [Captions download](https://developers.google.com/youtube/v3/docs/captions/download)         | Creator-owned subtitle workflow                                     | Requires authorization and permission to edit the video; not a general transcript API for arbitrary watched videos |
| [Live Streaming API](https://developers.google.com/youtube/v3/live/docs)                     | Live chat or creator live-stream utilities                          | Resource-specific authorization and quotas; cannot manufacture DVR support                                         |
| [Analytics/Reporting](https://developers.google.com/youtube/analytics)                       | Creator statistics                                                  | Authorized channel/content-owner context; limited value for everyday viewer controls                               |

The general credential model is described in the [Data API reference](https://developers.google.com/youtube/v3/docs). These services retrieve or modify remote resources; they do not control brightness, local playback or the YouTube site's UI state.

**Quota snapshot:** the currently published [quota calculator](https://developers.google.com/youtube/v3/determine_quota_cost) describes separate default daily buckets of 100 `search.list` calls, 100 `videos.insert` calls, and 10,000 combined units for other endpoints. `videos.list` costs 1 unit; caption download costs 200. Verify the actual project's console allocation before sizing a feature. Older assumptions that search always consumes 100 units from one shared bucket do not match the documentation checked for this report.

A distributed extension cannot keep an embedded API key secret. Account features introduce OAuth, scope selection, consent, token handling and potentially verification. Credentials, remote requests and quotas make this a larger product decision than adding local tools. Start with public metadata only when the feature needs information unavailable locally.

### Capabilities that should not be promised

- Arbitrary-video transcripts through the official caption-download endpoint. A transcript visible in the page can be explored as a separate, fragile DOM integration; it is not guaranteed to be present or loaded.
- Exact selected resolution, bitrate or audio-language control through `HTMLVideoElement`. Its displayed dimensions are useful diagnostics, not a quality-selection API.
- Stable automatic chapter extraction, ad detection or native autoplay settings through undocumented page structures.
- Exact next/previous-frame stepping by adding `1 / 30` to `currentTime`; videos have different or variable frame rates and seeking is not a frame-step contract.
- Guaranteed access to Watch History/Watch Later, downloads of original media, or protected-content capture through the public player APIs. Assess each requested capability separately.

## 4. Prioritized feature ideas

Priorities and effort below are engineering estimates, not measured delivery times. Low means a small local capability; medium includes meaningful state or lifecycle work; high needs a prototype or account integration.

| Priority | Feature                                         | Why useful                                             | Route / effort                                                |
| -------- | ----------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------- |
| P1       | Video Adjustments + Reset + Original comparison | Fix overly dark or washed-out viewing                  | CSS + narrow adapter; low                                     |
| P1       | Timestamp bookmarks with notes                  | Return to tutorial steps, lectures and references      | Media time + local storage; low–medium                        |
| P1       | Copy timestamp link                             | Share the exact moment quickly                         | URL + clipboard; low                                          |
| P1       | A-B repeat                                      | Practice music, language or a difficult explanation    | Seek + segment state; medium                                  |
| P1       | Speed presets and configurable steps            | Faster access to preferred speeds                      | Existing port + settings; low                                 |
| P2       | Sleep timer: pause at deadline or content end   | Podcasts and evening viewing                           | Alarms + media events; medium                                 |
| P2       | Native PiP button                               | Watch while working in another application             | Browser PiP; medium                                           |
| P2       | Channel-specific preferences                    | Remember preferred speed or visual settings            | Storage + reliable channel identity; medium                   |
| P2       | Original/adjusted screenshot choice             | Capture either source appearance or chosen adjustments | Existing capture + canvas filter; medium                      |
| P2       | Remaining viewing time at current speed         | Estimate how long a lecture will take                  | Duration/time/rate; low, finite videos only                   |
| P2       | Compact diagnostics                             | See dimensions, buffering and presentation timing      | Browser media/frame APIs; medium                              |
| P3       | Subtitle presentation panel                     | Improve caption readability                            | Native track capability or site-specific adapter; medium–high |
| P3       | Dialogue audio preset / gain boost              | Improve quiet speech                                   | Web Audio feasibility first; high                             |
| P3       | Account playlist organizer                      | Save and organize viewing                              | Data API + OAuth; high                                        |
| P3       | Chapter navigation or transcript search         | Navigate long videos                                   | Optional DOM/private integration; high maintenance            |

A-B repeat should validate A < B inside `seekable`, tolerate imperfect seeking, stop when content changes and distinguish live DVR behavior. Frame callbacks can improve boundary checking during playback but do not guarantee sample-accurate loops, especially in background tabs.

Resume/history should be opt-in with bounded retention and deletion. Channel profiles need a documented precedence order, such as session override > channel preset > global default, and must not unexpectedly fight native user changes.

## 5. Recommended next implementation and validation

Implement Video Adjustments first, then bookmarks and A-B repeat. These provide clear everyday value with local APIs and fit the current architecture. Defer private player calls, account integration and audio rerouting until a selected feature justifies them.

For Video Adjustments, acceptance checks should include:

1. Neutral state, individual sliders, combined adjustments, Reset and Original comparison.
2. Direct watch load, SPA navigation, video replacement and same-element content changes.
3. Normal/theater/expanded/scroll mini player/fullscreen; check captions and controls remain readable.
4. Native PiP with explicitly documented observed behavior; unsupported capability must fail gracefully.
5. Screenshot comparison proving source capture stays original and adjusted export matches supported filter semantics.
6. Ads, live DVR, unseekable streams and unavailable/protected capture paths.
7. Representative SDR/HDR and 1080p/4K60 playback; measure dropped frames and interaction smoothness on actual hardware.
8. Reload/disposal cleanup, preexisting styles and another actor changing the filter while enabled.

Use focused adapter/lifecycle tests plus live Chromium checks. Synthetic DOM tests alone cannot certify rendering, PiP, HDR, CORS or YouTube layout compatibility. Record browser version, date, video type and observed results before advertising support. No such live validation is claimed by this research document.

## Summarize

- **Brightness and basic filters are easy:** use CSS on the current video; no YouTube API, backend or per-frame rendering loop is needed.
- **The integration cost is lifecycle and behavior:** replacements, navigation, style ownership, persistence and interactions with existing tools.
- **Official YouTube Player API means embedded players.** On youtube.com, prefer standard media APIs; internal player methods remain maintenance-sensitive.
- **Best next features:** Video Adjustments, timestamp bookmarks, A-B repeat, speed presets and timestamp sharing.
- **Other useful APIs:** storage, clipboard, fullscreen, PiP, commands, alarms and video frame callbacks. Web Audio and Document PiP deserve prototypes.
- **Separate harder projects:** sharpening/HDR processing, arbitrary transcripts, forced quality, reliable ad detection and OAuth account tools.
- **Screenshots and PiP need explicit expectations:** source-frame export does not automatically include CSS adjustments; native PiP must be tested independently.
- **Recommended direction:** deliver local visual/playback tools first, add remote YouTube services only for a concrete metadata or account feature.
