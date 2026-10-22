import type { Tool } from "../../core/contracts";
import {
  DEFAULT_VIDEO_FILTERS,
  VIDEO_CONTROLS,
  type VideoFiltersPort,
} from "../../core/video-filters";
import { createPopover, iconButton } from "../../toolbar/popover";

const controlIcons = {
  brightness:
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  contrast:
    '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18Z" fill="currentColor"/>',
  saturation:
    '<path d="M12 3S5 11 5 15a7 7 0 0 0 14 0c0-4-7-12-7-12Z"/><path d="M9 15a3 3 0 0 0 3 3"/>',
  zoom: '<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6M7 10h6m-3-3v6"/>',
};

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
      panel.className = "video-filters-panel";
      const content = document.createElement("div");
      content.className = "video-filters-content";
      const heading = document.createElement("div");
      heading.className = "video-filters-heading";
      const title = document.createElement("strong");
      title.textContent = "Video filters";
      const mirror = iconButton(
        "Mirror horizontally",
        '<path d="M12 3v2m0 3v2m0 4v2m0 3v2M3 6l6 3v6l-6 3Zm18 0-6 3v6l6 3Z"/>',
      );
      mirror.onclick = () =>
        filters.setMirror(!filters.snapshot().settings.mirror);
      const reset = iconButton(
        "Reset all video filters",
        '<path d="M3 10a9 9 0 1 1 2.7 8.4M3 4v6h6"/>',
      );
      reset.onclick = () => filters.reset();
      const toggle = iconButton(
        "Enable video filters",
        '<path d="M12 2v10M6.3 5.3a9 9 0 1 0 11.4 0"/>',
      );
      toggle.setAttribute("role", "switch");
      toggle.onclick = () => filters.setEnabled(!filters.snapshot().enabled);
      for (const button of [mirror, reset, toggle]) {
        button.title = button.getAttribute("aria-label")!;
      }
      heading.append(title, mirror, reset, toggle);
      const basic = document.createElement("div");
      basic.className = "video-filter-controls";
      const controls = VIDEO_CONTROLS.map((control) => {
        const label = document.createElement("label");
        label.className = "video-filter-control";
        label.title = control.label;
        const caption = document.createElement("span");
        caption.className = "video-filter-icon";
        caption.setAttribute("aria-hidden", "true");
        caption.innerHTML =
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' +
          controlIcons[control.id] +
          "</svg>";
        const output = document.createElement("output");
        const input = document.createElement("input");
        input.type = "range";
        input.min = String(control.min);
        input.max = String(control.max);
        input.step = "1";
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
        label.append(caption, input, output);
        basic.append(label);
        return { control, input, output };
      });
      content.append(heading, basic);
      panel.append(content);
      group.append(trigger, panel);
      container.append(group);
      const popover = createPopover(trigger, panel);
      const unsubscribe = filters.subscribe((state) => {
        trigger.disabled = !state.available;
        trigger.dataset.modified = String(state.available && state.enabled);
        toggle.setAttribute("aria-checked", String(state.enabled));
        reset.disabled = Object.entries(DEFAULT_VIDEO_FILTERS).every(
          ([key, value]) =>
            state.settings[key as keyof typeof state.settings] === value,
        );
        controls.forEach(({ control, input, output }) => {
          const value = state.settings[control.id];
          input.value = String(value);
          input.setAttribute("aria-valuetext", value + "%");
          output.textContent = value + "%";
        });
        mirror.setAttribute("aria-pressed", String(state.settings.mirror));
        if (!state.available) popover.close();
      });
      return () => {
        unsubscribe();
        popover.dispose();
        group.remove();
      };
    },
  };
}
