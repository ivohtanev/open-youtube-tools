import type { Tool } from "../../core/contracts";
import {
  DEFAULT_VIDEO_FILTERS,
  VIDEO_CONTROLS,
  type VideoFiltersPort,
} from "../../core/video-filters";
import { createPopover, iconButton } from "../../toolbar/popover";
import { createCheckableMenuItem } from "../../toolbar/checkable-menu-item";

export function videoFilters(filters: VideoFiltersPort): Tool {
  const icon =
    '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 9h10M7 15h10M10 7v4m4 2v4"/>';
  return {
    id: "video-filters",
    name: "Video filters",
    icon,
    mount(container) {
      const group = document.createElement("div");
      group.className = "tool";
      const trigger = iconButton("Video filters", icon);
      const panel = document.createElement("div");
      panel.className = "eq-panel video-filters-panel";
      const heading = document.createElement("div");
      heading.className = "panel-heading";
      const title = document.createElement("strong");
      title.textContent = "Video filters";
      const switchControl = document.createElement("div");
      switchControl.className = "eq-switch-control";
      const off = document.createElement("span");
      off.textContent = "OFF";
      const on = document.createElement("span");
      on.textContent = "ON";
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "eq-switch";
      toggle.setAttribute("role", "switch");
      toggle.setAttribute("aria-label", "Enable video filters");
      const thumb = document.createElement("span");
      thumb.className = "eq-switch-thumb";
      toggle.append(thumb);
      toggle.onclick = () => filters.setEnabled(!filters.snapshot().enabled);
      switchControl.append(off, toggle, on);
      heading.append(title, switchControl);
      const actions = document.createElement("div");
      actions.className = "eq-preset-row";
      const compare = document.createElement("button");
      compare.type = "button";
      compare.className = "video-compare";
      compare.onclick = () => filters.setOriginal(!filters.snapshot().original);
      const reset = iconButton(
        "Reset all video filters",
        '<path d="M3 10a9 9 0 1 1 2.7 8.4M3 4v6h6"/>',
      );
      reset.classList.add("eq-restore");
      reset.onclick = () => filters.reset();
      actions.append(compare, reset);
      const hint = document.createElement("p");
      hint.className = "eq-preset-hint";
      hint.textContent = "Make it yours · edits save automatically";
      const basic = document.createElement("div");
      basic.className = "video-filter-controls";
      const experiments = document.createElement("fieldset");
      experiments.className = "video-experiments";
      const legend = document.createElement("legend");
      legend.textContent = "Experimental · try it out";
      const experimentalHint = document.createElement("p");
      experimentalHint.className = "eq-note";
      experimentalHint.textContent =
        "Zoom crops the edges. Mirror flips the picture, including any text in the video.";
      experiments.append(legend);
      const controls = VIDEO_CONTROLS.map((control) => {
        const label = document.createElement("label");
        label.className = "video-filter-control";
        const caption = document.createElement("span");
        caption.textContent = control.label;
        const output = document.createElement("output");
        const input = document.createElement("input");
        input.type = "range";
        input.min = String(control.min);
        input.max = String(control.max);
        input.step = "1";
        input.title = "Scroll to adjust by 1% · double-click to reset";
        input.setAttribute("aria-label", control.label);
        input.setAttribute("aria-orientation", "horizontal");
        input.oninput = () => filters.setValue(control.id, Number(input.value));
        input.ondblclick = () => filters.setValue(control.id, 100);
        input.addEventListener(
          "wheel",
          (event) => {
            if (event.ctrlKey || event.metaKey || event.deltaY === 0) return;
            event.preventDefault();
            event.stopPropagation();
            filters.setValue(
              control.id,
              filters.snapshot().settings[control.id] - Math.sign(event.deltaY),
            );
          },
          { passive: false },
        );
        label.append(caption, output, input);
        (control.id === "zoom" ? experiments : basic).append(label);
        return { control, input, output };
      });
      const mirrorLabel = createCheckableMenuItem({
        label: "Mirror horizontally",
        checked: false,
        onChange: (checked) => filters.setMirror(checked),
      });
      const mirror = mirrorLabel.querySelector("input")!;
      experiments.append(mirrorLabel, experimentalHint);
      const footer = document.createElement("div");
      footer.className = "eq-footer";
      footer.textContent = "Scroll to fine-tune · 1% · double-click to reset";
      const status = document.createElement("p");
      status.className = "eq-note";
      status.setAttribute("role", "status");
      panel.append(heading, actions, hint, basic, experiments, footer, status);
      group.append(trigger, panel);
      container.append(group);
      const popover = createPopover(trigger, panel);
      // Comparison is temporary and must never remain active in a closed panel.
      const visibility = new MutationObserver(() => {
        if (panel.hidden) filters.setOriginal(false);
      });
      visibility.observe(panel, {
        attributes: true,
        attributeFilter: ["hidden"],
      });
      const unsubscribe = filters.subscribe((state) => {
        trigger.disabled = !state.available;
        trigger.dataset.modified = String(
          state.available && state.enabled && !state.original,
        );
        toggle.setAttribute("aria-checked", String(state.enabled));
        compare.textContent = state.original
          ? "Show adjusted"
          : "Compare original";
        compare.setAttribute("aria-pressed", String(state.original));
        compare.disabled = !state.enabled;
        reset.disabled = Object.entries(DEFAULT_VIDEO_FILTERS).every(
          ([key, value]) =>
            state.settings[key as keyof typeof state.settings] === value,
        );
        controls.forEach(({ control, input, output }) => {
          const value = state.settings[control.id];
          input.value = String(value);
          input.setAttribute("aria-valuetext", `${value}%`);
          output.textContent = `${value}%`;
        });
        mirror.checked = state.settings.mirror;
        status.textContent = state.original
          ? "Showing original · click Show adjusted to return"
          : state.enabled
            ? ""
            : "Filters are OFF · your settings are saved";
        status.hidden = !status.textContent;
        if (!state.available) popover.close();
      });
      return () => {
        unsubscribe();
        visibility.disconnect();
        filters.setOriginal(false);
        popover.dispose();
        group.remove();
      };
    },
  };
}
