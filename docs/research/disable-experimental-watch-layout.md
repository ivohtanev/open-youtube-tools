# Disable the experimental watch-page layout

Status: deferred idea, not implemented. Recorded on 2026-10-22.

## Owner testing and working workaround

On 2026-10-22, Ivo reported that the existing extension features worked well in both the experimental A/B watch-page design and the normal design. He restored the normal design using the following custom filters in Brave. A shorter two-line workaround did not work; its exact contents were not recorded.

Keep this full owner-tested filter set as the reference:

```text
youtube.com##+js(set, yt.config_.EXPERIMENT_FLAGS.web_watch_eligible_to_switch_to_grid, false)
youtube.com##+js(set, yt.config_.EXPERIMENT_FLAGS.web_watch_enable_single_column_grid_view, false)
youtube.com##+js(set, yt.config_.EXPERIMENT_FLAGS.web_fixed_panel_watch_next_grid_swap, false)
youtube.com##+js(set, yt.config_.EXPERIMENT_FLAGS.web_live_chat_panel_watch_next_grid_swap, false)
youtube.com##+js(set, yt.config_.EXPERIMENT_FLAGS.web_watch_fixed_default_panels, false)
youtube.com##+js(set, yt.config_.EXPERIMENT_FLAGS.web_engagement_panel_show_description, false)
youtube.com##+js(set, yt.config_.EXPERIMENT_FLAGS.web_watch_move_summary_to_sd, false)
youtube.com##+js(set, yt.config_.EXPERIMENT_FLAGS.web_watch_hero_list, false)
youtube.com##+js(set, yt.config_.EXPERIMENT_FLAGS.web_watch_split_scroll, false)
youtube.com##+js(set, yt.config_.EXPERIMENT_FLAGS.web_side_rail_dismissible_panels, false)
youtube.com##+js(set, yt.config_.EXPERIMENT_FLAGS.kevlar_watch_hide_comments_while_panel_open, false)
youtube.com##+js(set, yt.config_.EXPERIMENT_FLAGS.kevlar_watch_cinematics, false)
youtube.com##+js(set, yt.config_.EXPERIMENT_FLAGS.disable_theater_mode, false)
youtube.com##.ytSideRailViewModelHost
youtube.com##ytd-watch-flexy:style(--ytd-watch-flexy-fixed-side-menu-width: 0px !important)
youtube.com##ytd-watch-flexy #columns::after:style(width: 0 !important; display: none !important)
```

These are Brave custom-filter rules, not JavaScript to paste into the extension. Their success is owner-reported for the tested layout; the extension equivalent has not been implemented or validated.

## Proposed icon and persisted preference

If this experiment is still present before the extension is released, consider adding a new toolbar toggle icon to disable the experimental design:

1. First check whether the current watch page actually uses this experimental layout. Define and verify reliable detection against the live design before implementation; do not assume one flag alone proves that the layout is active.
2. When the user enables the toggle on an affected page, apply the equivalent of the flag overrides and layout corrections in the reference above.
3. Save the user's preference that the experiment is disabled, and reflect that preference in the icon state across reloads and browser sessions.
4. On subsequent watch-page loads and navigation, check the layout before applying the saved opt-out. Leave the normal layout alone.
5. Allow the user to turn the preference off. Determine and document whether applying or removing the opt-out requires a page reload, and how native behavior is restored.

Implementation research must establish the required timing and page-context access for flag overrides, as well as the equivalent scoped CSS. The working Brave filter set does not establish that a late extension toggle can change an already rendered page.

## Release decision

Do not implement the icon now. Recheck the experiment before release. Implement this optional feature only if YouTube still serves the problematic experimental design and the workaround is still needed. If YouTube has removed the experiment, skip the feature because it no longer has a purpose.
