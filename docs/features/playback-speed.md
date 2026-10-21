# Playback speed

The toolbar exposes a speedometer icon. Clicking shows “Change Speed with Scroll”; the outlined chevron expands the −, current-rate/reset and + buttons with a slide animation. Clicking the icon again closes the panel. Keyboard users can use Tab, Enter, Space, ArrowDown and Escape.

Scrolling up over the icon increases speed by 0.02; scrolling down decreases it by 0.02. Wheel events outside the icon are unaffected. Ctrl-wheel retains browser zoom behavior. Rates are rounded to two decimal places and clamped to 0.25–2×. Each nonzero vertical wheel event is one step, including trackpad events.

Buttons move to the next strictly greater or smaller 0.25 preset, rather than adding an offset to a custom rate: 1.05 → 1.25 with + and 1.05 → 1.00 with −. Clicking the displayed rate resets to 1.00×. Boundary buttons disable; native YouTube rate changes update the controls and an accessible status region. A modified rate highlights the icon.

The feature implements `Tool`, uses `PlayerPort` and the shared popover component, and never queries YouTube selectors or storage. No speed is reapplied after navigation. Unavailable video closes the panel and disables controls; disposal removes subscriptions and popover listeners.

Tests cover scroll cancellation, snapping, bounds, reset, disclosure, dismissal and route visibility. Player tests cover native changes and video replacement. Ads are not distinguished from content. Shorts/embed/mobile are unsupported. Live YouTube compatibility still requires the manual matrix.

Extension-initiated speed changes reuse YouTube’s existing `.ytp-bezel-text` presentation layer for 650 ms. The exact resulting rate is displayed, including custom scroll values. The previous native icon is hidden so a stale pause/volume symbol cannot accompany the speed text. No shortcut is synthesized and the speed is set only once. YouTube’s current player calls its private bezel renderer from the keyboard handler; there is no public notification API. This DOM integration is best-effort: if native markup is missing, playback still changes and the toolbar status updates. Keyboard/pointer actions, playback changes, navigation and disposal release the notice; rapid scroll replaces its timer. Live extension validation remains required.
